import { createServer } from 'http'
import { parse } from 'url'
import { WebSocketServer } from 'ws'
import { Chess } from 'chess.js'
import next from 'next'

const dev        = process.env.NODE_ENV !== 'production'
const port       = parseInt(process.env.PORT || '3000', 10)
const brokerOnly = process.env.BROKER_ONLY === 'true'

// ── Next.js UI + WS broker on ONE port ────────────────────────────────────────
// Cloud hosts (Railway/Render/Fly) expose a single port, so the broker rides
// on the same HTTP server as Next.js via the `upgrade` event.
//
// BROKER_ONLY=true skips the Next.js UI entirely — used when the UI lives on
// Vercel (which can't run websockets) and only the broker needs a host.
//
// Browsers connect to  ws(s)://<host>/ws
// ESP32-S3 connects to ws(s)://<host>/device[?room=CODE]

let handle = null
let nextUpgrade = null
if (!brokerOnly) {
  const app = next({ dev })
  handle = app.getRequestHandler()
  await app.prepare()
  // Next's own upgrade handler keeps HMR websockets working in dev.
  nextUpgrade = typeof app.getUpgradeHandler === 'function' ? app.getUpgradeHandler() : null
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
// The server owns game state (chess.js). The physical board is an output
// device: confirmed moves are forwarded to it; its own messages are logged.

const ROOM_TTL_MS = 30 * 60 * 1000
// How long the server waits for the physical board's own 'done' before
// advancing the turn anyway (board offline, jammed, or firmware silent).
const BOARD_MOVE_TIMEOUT_MS = 9000
const rooms = new Map() // code → room

function makeRoom() {
  // No I/O in the alphabet — codes are read aloud between players.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  } while (rooms.has(code))
  const room = {
    code,
    chess: new Chess(),
    players: { w: null, b: null },   // ws | null
    spectators: new Set(),
    device: null,
    pendingMove: null, // { from, to, timer } — set while waiting on the board
    lastActive: Date.now(),
  }
  rooms.set(code, room)
  console.log(`[room ${code}] created`)
  return room
}

function board64(chess) {
  // 64 chars, rank 8 → rank 1; uppercase = white, lowercase = black, '.' empty.
  return chess.board()
    .map((row) => row.map((c) => (c ? (c.color === 'w' ? c.type.toUpperCase() : c.type) : '.')).join(''))
    .join('')
}

function send(ws, obj) {
  if (ws?.readyState === 1 /* OPEN */) ws.send(JSON.stringify(obj))
}

function roomBrowsers(room) {
  return [room.players.w, room.players.b, ...room.spectators].filter(Boolean)
}

function broadcast(room, obj) {
  for (const ws of roomBrowsers(room)) send(ws, obj)
}

function stateMsg(room) {
  return {
    type: 'state',
    board: board64(room.chess),
    turn: room.chess.turn() === 'w' ? 'WHITE' : 'BLACK',
    fen: room.chess.fen(),
  }
}

function peerCount(room) {
  return (room.players.w ? 1 : 0) + (room.players.b ? 1 : 0)
}

function seatPlayer(room, ws) {
  // Returns assigned color, or null → spectator.
  if (!room.players.w) { room.players.w = ws; return 'w' }
  if (!room.players.b) { room.players.b = ws; return 'b' }
  room.spectators.add(ws)
  return null
}

function joinRoom(room, ws) {
  leaveCurrentRoom(ws)
  const color = seatPlayer(room, ws)
  ws.room = room
  ws.color = color
  room.lastActive = Date.now()

  send(ws, { type: 'room', code: room.code, color, peerConnected: peerCount(room) === 2, boardConnected: !!room.device })
  send(ws, stateMsg(room))
  // Tell the other player their opponent arrived.
  if (color) {
    const other = room.players[color === 'w' ? 'b' : 'w']
    send(other, { type: 'peer', connected: true })
  }
  console.log(`[room ${room.code}] ${color ?? 'spectator'} joined (${peerCount(room)}/2)`)
}

function leaveCurrentRoom(ws) {
  const room = ws.room
  if (!room) return
  if (room.players.w === ws) room.players.w = null
  else if (room.players.b === ws) room.players.b = null
  else room.spectators.delete(ws)
  ws.room = null
  ws.color = null
  room.lastActive = Date.now()
  broadcast(room, { type: 'peer', connected: peerCount(room) === 2 })
  console.log(`[room ${room.code}] player left (${peerCount(room)}/2)`)
}

// Resolve the in-flight move: tell browsers it's done and clear the wait.
function resolvePendingMove(room) {
  const pending = room.pendingMove
  if (!pending) return
  clearTimeout(pending.timer)
  room.pendingMove = null
  broadcast(room, { type: 'done', from: pending.from, to: pending.to })
}

function handleMove(room, ws, from, to) {
  const chess = room.chess
  if (ws.color !== chess.turn()) {
    send(ws, { type: 'illegal', reason: ws.color ? 'Not your turn' : 'Spectators cannot move' })
    return
  }
  let result
  try {
    result = chess.move({ from: from.toLowerCase(), to: to.toLowerCase(), promotion: 'q' })
  } catch {
    result = null
  }
  if (!result) {
    send(ws, { type: 'illegal', reason: `${from}→${to} is not legal` })
    send(ws, stateMsg(room)) // resync the sender in case they drifted
    return
  }
  room.lastActive = Date.now()
  console.log(`[room ${room.code}] ${ws.color} played ${result.from}→${result.to}`)

  // Chess-legality is already settled — ack the move so the UI shows
  // "Robot moving…" instead of leaving the sender hanging.
  broadcast(room, { type: 'ack', from: result.from.toUpperCase(), to: result.to.toUpperCase() })

  if (room.device?.readyState === 1 /* OPEN */) {
    // Wait for the board to physically finish before advancing the turn —
    // if it never confirms (offline, jammed), time out and proceed anyway.
    if (room.pendingMove) clearTimeout(room.pendingMove.timer)
    const from_ = result.from
    const to_ = result.to
    room.pendingMove = {
      from: from_,
      to: to_,
      timer: setTimeout(() => {
        console.warn(`[room ${room.code}] board did not confirm ${from_}→${to_} in time — advancing anyway`)
        resolvePendingMove(room)
      }, BOARD_MOVE_TIMEOUT_MS),
    }
    send(room.device, { type: 'move', from: from_.toUpperCase(), to: to_.toUpperCase() })
  } else {
    // No physical board bound — server validation is the only confirmation needed.
    broadcast(room, { type: 'done', from: result.from, to: result.to })
  }
}

function handleReset(room) {
  if (room.pendingMove) {
    clearTimeout(room.pendingMove.timer)
    room.pendingMove = null
  }
  room.chess = new Chess()
  room.lastActive = Date.now()
  broadcast(room, stateMsg(room))
  send(room.device, { type: 'reset' })
  console.log(`[room ${room.code}] reset`)
}

// Sweep rooms with no players/device that have been idle past the TTL.
setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    const empty = peerCount(room) === 0 && room.spectators.size === 0 && !room.device
    if (empty && now - room.lastActive > ROOM_TTL_MS) {
      if (room.pendingMove) clearTimeout(room.pendingMove.timer)
      rooms.delete(code)
      console.log(`[room ${code}] expired`)
    }
  }
}, 60_000)

// ── Browser websocket (/ws) ───────────────────────────────────────────────────

const browserWss = new WebSocketServer({ noServer: true, perMessageDeflate: false })

browserWss.on('connection', (ws) => {
  console.log('[broker] browser connected')

  ws.on('message', (data) => {
    let msg
    try { msg = JSON.parse(data.toString()) } catch { return }
    if (!msg || typeof msg !== 'object') return

    switch (msg.type) {
      case 'create': {
        const room = makeRoom()
        joinRoom(room, ws)
        return
      }
      case 'join': {
        const code = typeof msg.room === 'string' ? msg.room.toUpperCase().trim() : ''
        const room = rooms.get(code)
        if (!room) { send(ws, { type: 'error', reason: `Room ${code || '?'} not found` }); return }
        joinRoom(room, ws)
        return
      }
      case 'leave':
        leaveCurrentRoom(ws)
        return
      case 'move': {
        if (!ws.room) { send(ws, { type: 'error', reason: 'Join a room first' }); return }
        if (typeof msg.from !== 'string' || typeof msg.to !== 'string') return
        handleMove(ws.room, ws, msg.from, msg.to)
        return
      }
      case 'reset':
        if (ws.room) handleReset(ws.room)
        return
      case 'hello':
        if (ws.room) send(ws, stateMsg(ws.room))
        return
    }
  })

  ws.on('close', () => leaveCurrentRoom(ws))
  ws.on('error', (e) => console.warn('[broker] browser error:', e.message))
})

// ── Device websocket (/device) ────────────────────────────────────────────────
// ?room=CODE binds the board to that room. Without the query (current
// firmware) it binds to the most recently active room, so demos work with
// zero firmware changes.

const deviceWss = new WebSocketServer({ noServer: true, perMessageDeflate: false })

function latestRoom() {
  let best = null
  for (const room of rooms.values()) {
    if (!best || room.lastActive > best.lastActive) best = room
  }
  return best
}

deviceWss.on('connection', (ws, req) => {
  const { query } = parse(req.url, true)
  const code = typeof query.room === 'string' ? query.room.toUpperCase().trim() : ''
  const room = code ? rooms.get(code) : latestRoom()

  if (!room) {
    console.warn(`[broker] ESP32 connected but no room available${code ? ` (asked for ${code})` : ''}`)
  } else {
    if (room.device && room.device !== ws) {
      try { room.device.close() } catch { /* ignore */ }
    }
    room.device = ws
    ws.room = room
    room.lastActive = Date.now()
    console.log(`[room ${room.code}] ESP32 bound`)
    send(ws, stateMsg(room))
    broadcast(room, { type: 'board', connected: true })
    // A board reconnecting mid-move (dropped and came back) needs the
    // in-flight command resent — it never got a chance to run it.
    if (room.pendingMove) {
      send(ws, { type: 'move', from: room.pendingMove.from.toUpperCase(), to: room.pendingMove.to.toUpperCase() })
    }
  }

  ws.on('message', (data) => {
    const raw = data.toString()
    console.log('[broker] device →', raw)
    if (!ws.room) return

    // A 'done' matching the in-flight move means the board physically
    // finished — resolve it now instead of waiting for the timeout.
    let parsed = null
    try { parsed = JSON.parse(raw) } catch { /* not JSON */ }
    const pending = ws.room.pendingMove
    if (parsed?.type === 'done' && pending
        && typeof parsed.from === 'string' && typeof parsed.to === 'string'
        && parsed.from.toLowerCase() === pending.from.toLowerCase()
        && parsed.to.toLowerCase() === pending.to.toLowerCase()) {
      resolvePendingMove(ws.room)
      return
    }

    // Anything else from the device (ack, state, unmatched done, chatter) is
    // surfaced to browsers as a log line only — the server stays authoritative.
    broadcast(ws.room, asLog(raw))
  })

  ws.on('close', () => {
    console.log('[broker] ESP32 disconnected')
    if (ws.room && ws.room.device === ws) {
      ws.room.device = null
      broadcast(ws.room, { type: 'board', connected: false })
      // No board left to confirm the in-flight move — resolve it now
      // rather than making players wait out the full timeout.
      if (ws.room.pendingMove) resolvePendingMove(ws.room)
    }
  })

  ws.on('error', (e) => console.warn('[broker] device error:', e.message))
})

// Wrap arbitrary device output as a log message for browsers.
function asLog(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.type === 'log') return parsed
  } catch { /* not JSON — fall through */ }
  return { type: 'log', text: raw }
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  if (handle) {
    await handle(req, res, parse(req.url, true))
  } else {
    // Broker-only mode: plain 200 keeps Render health checks happy.
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Wizard Chess WS broker — connect via /ws (browsers) or /device (ESP32)')
  }
})

server.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url)
  if (pathname === '/device') {
    deviceWss.handleUpgrade(req, socket, head, (ws) => deviceWss.emit('connection', ws, req))
  } else if (pathname === '/ws') {
    browserWss.handleUpgrade(req, socket, head, (ws) => browserWss.emit('connection', ws, req))
  } else if (nextUpgrade) {
    nextUpgrade(req, socket, head) // Next.js HMR in dev
  } else {
    socket.destroy()
  }
})

server.listen(port, () => {
  console.log(
    brokerOnly
      ? `> WS broker ready on port ${port}  (/ws browsers, /device ESP32)`
      : `> UI + WS broker ready on http://localhost:${port}  (/ws browsers, /device ESP32)`
  )
})
