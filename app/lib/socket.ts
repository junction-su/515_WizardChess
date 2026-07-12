'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionStatus, Square } from './chess'

// Connect to the broker running inside server.mjs. The broker now rides on
// the same HTTP server/port as Next.js, so same-origin /ws always reaches it
// — locally, on the LAN, and on a cloud host.
function defaultWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws'
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}
export const STARTING_BOARD = 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR'

const BOARD_SYNC_DISABLED = process.env.NEXT_PUBLIC_DISABLE_BOARD_SYNC === 'true'
const ROOM_STORAGE_KEY = 'wizard-chess-room'

export type ServerEvent =
  | { kind: 'done'; from: Square; to: Square }
  | { kind: 'state'; board64: string; turn: 'w' | 'b'; fen?: string }
  | { kind: 'turn'; turn: 'w' | 'b' }
  | { kind: 'illegal'; reason: string }
  | { kind: 'room'; code: string; color: 'w' | 'b' | null; peerConnected: boolean }
  | { kind: 'peer'; connected: boolean }
  | { kind: 'board'; connected: boolean }
  | { kind: 'seat'; w: 'human' | 'ai'; b: 'human' | 'ai' }
  | { kind: 'error'; reason: string }

export interface PendingMove {
  from: Square
  to: Square
  phase: 'sending' | 'acked'
}

export interface ChessSocket {
  status: ConnectionStatus
  pending: PendingMove | null
  illegalReason: string | null
  roomCode: string | null
  myColor: 'w' | 'b' | null
  peerConnected: boolean
  boardConnected: boolean
  seatKind: { w: 'human' | 'ai'; b: 'human' | 'ai' }
  createRoom: () => void
  joinRoom: (code: string) => void
  leaveRoom: () => void
  setSeatKind: (color: 'w' | 'b', kind: 'human' | 'ai') => void
  claimDevice: () => void
  sendMove: (from: Square, to: Square) => boolean
  sendReset: () => void
  requestState: () => void
  clearIllegal: () => void
}

const PENDING_MOVE_TIMEOUT_MS = 12000

// Build a FEN string chess.js can `.load()` from the 64-char board + turn the
// S3 sends. Castling rights default to KQkq (we don't track moves of king/rook
// here — if the server disagrees it will reject illegal moves and the next
// `state` snapshot will resync us).
export function buildFen(board64: string, turn: 'w' | 'b'): string {
  const ranks: string[] = []
  for (let r = 0; r < 8; r++) {
    const slice = board64.slice(r * 8, r * 8 + 8)
    let s = ''
    let empty = 0
    for (const ch of slice) {
      if (ch === '.') {
        empty++
      } else {
        if (empty) { s += empty; empty = 0 }
        s += ch
      }
    }
    if (empty) s += empty
    ranks.push(s)
  }
  return `${ranks.join('/')} ${turn} KQkq - 0 1`
}

export function useChessSocket(onEvent: (e: ServerEvent) => void): ChessSocket {
  const url = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl()

  const [status, setStatus] = useState<ConnectionStatus>(BOARD_SYNC_DISABLED ? 'disconnected' : 'syncing')
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [illegalReason, setIllegalReason] = useState<string | null>(null)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [myColor, setMyColor] = useState<'w' | 'b' | null>(null)
  const [peerConnected, setPeerConnected] = useState(false)
  const [boardConnected, setBoardConnected] = useState(false)
  const [seatKind, setSeatKindState] = useState<{ w: 'human' | 'ai'; b: 'human' | 'ai' }>({ w: 'human', b: 'human' })

  // Room we want to be in — survives reconnects so we rejoin automatically.
  const desiredRoomRef = useRef<string | null>(
    typeof window !== 'undefined' ? sessionStorage.getItem(ROOM_STORAGE_KEY) : null
  )

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)
  const pendingRef = useRef<PendingMove | null>(null)

  // Keep the latest onEvent in a ref so we don't have to tear down the socket
  // when the parent re-renders.
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const handleMessage = useCallback((raw: string) => {
    let msg: unknown
    try { msg = JSON.parse(raw) } catch { return }
    if (!msg || typeof msg !== 'object') return
    const m = msg as Record<string, unknown>

    switch (m.type) {
      case 'ack': {
        const p = pendingRef.current
        if (p && typeof m.from === 'string' && typeof m.to === 'string'
            && p.from === m.from.toLowerCase() && p.to === m.to.toLowerCase()) {
          setPending({ ...p, phase: 'acked' })
        }
        return
      }
      case 'done': {
        if (typeof m.from !== 'string' || typeof m.to !== 'string') return
        const from = m.from.toLowerCase() as Square
        const to = m.to.toLowerCase() as Square
        if (pendingTimer.current) {
          clearTimeout(pendingTimer.current)
          pendingTimer.current = null
        }
        setPending(null)
        setIllegalReason(null)
        onEventRef.current({ kind: 'done', from, to })
        return
      }
      case 'illegal': {
        const reason = typeof m.reason === 'string' ? m.reason : 'Illegal move'
        if (pendingTimer.current) {
          clearTimeout(pendingTimer.current)
          pendingTimer.current = null
        }
        setPending(null)
        setIllegalReason(reason)
        onEventRef.current({ kind: 'illegal', reason })
        return
      }
      case 'turn': {
        if (m.color !== 'WHITE' && m.color !== 'BLACK') return
        onEventRef.current({ kind: 'turn', turn: m.color === 'WHITE' ? 'w' : 'b' })
        return
      }
      case 'state': {
        if (typeof m.board !== 'string' || m.board.length !== 64) return
        if (m.turn !== 'WHITE' && m.turn !== 'BLACK') return
        if (pendingTimer.current) {
          clearTimeout(pendingTimer.current)
          pendingTimer.current = null
        }
        setPending(null)
        setIllegalReason(null)
        onEventRef.current({
          kind: 'state',
          board64: m.board,
          turn: m.turn === 'WHITE' ? 'w' : 'b',
          fen: typeof m.fen === 'string' ? m.fen : undefined,
        })
        return
      }
      case 'room': {
        if (typeof m.code !== 'string') return
        const color = m.color === 'w' || m.color === 'b' ? m.color : null
        setRoomCode(m.code)
        setMyColor(color)
        setPeerConnected(m.peerConnected === true)
        setBoardConnected(m.boardConnected === true)
        const sk = m.seatKind as Record<string, unknown> | undefined
        if (sk && (sk.w === 'human' || sk.w === 'ai') && (sk.b === 'human' || sk.b === 'ai')) {
          setSeatKindState({ w: sk.w, b: sk.b })
        }
        desiredRoomRef.current = m.code
        try { sessionStorage.setItem(ROOM_STORAGE_KEY, m.code) } catch { /* ignore */ }
        onEventRef.current({ kind: 'room', code: m.code, color, peerConnected: m.peerConnected === true })
        return
      }
      case 'peer': {
        setPeerConnected(m.connected === true)
        onEventRef.current({ kind: 'peer', connected: m.connected === true })
        return
      }
      case 'board': {
        setBoardConnected(m.connected === true)
        onEventRef.current({ kind: 'board', connected: m.connected === true })
        return
      }
      case 'seat': {
        if ((m.w !== 'human' && m.w !== 'ai') || (m.b !== 'human' && m.b !== 'ai')) return
        setSeatKindState({ w: m.w, b: m.b })
        onEventRef.current({ kind: 'seat', w: m.w, b: m.b })
        return
      }
      case 'error': {
        const reason = typeof m.reason === 'string' ? m.reason : 'Server error'
        // A failed join means the stored room is stale — stop retrying it.
        desiredRoomRef.current = null
        try { sessionStorage.removeItem(ROOM_STORAGE_KEY) } catch { /* ignore */ }
        onEventRef.current({ kind: 'error', reason })
        return
      }
      case 'log':
        if (typeof m.text === 'string') console.log('[robot]', m.text)
        return
    }
  }, [])

  useEffect(() => {
    if (BOARD_SYNC_DISABLED) return
    unmounted.current = false

    const scheduleReconnect = () => {
      if (unmounted.current) return
      const attempt = reconnectAttempt.current++
      const delay = Math.min(10_000, 500 * 2 ** attempt) + Math.random() * 250
      reconnectTimer.current = setTimeout(connect, delay)
    }

    const connect = () => {
      if (unmounted.current) return
      setStatus((s) => (s === 'connected' ? s : 'syncing'))
      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch {
        scheduleReconnect()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempt.current = 0
        setStatus('connected')
        console.log('[socket] open', url)
        // Rejoin the room we were in before the connection dropped.
        if (desiredRoomRef.current) {
          ws.send(JSON.stringify({ type: 'join', room: desiredRoomRef.current }))
        }
      }
      ws.onmessage = (ev) => {
        const data = typeof ev.data === 'string' ? ev.data : ''
        console.log('[socket] ←', data)
        handleMessage(data)
      }
      ws.onerror = (ev) => {
        console.warn('[socket] error', ev)
        try { ws.close() } catch { /* ignore */ }
      }
      ws.onclose = (ev) => {
        console.warn('[socket] close', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean })
        wsRef.current = null
        if (!unmounted.current) setStatus('disconnected')
        scheduleReconnect()
      }
    }

    connect()
    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
      if (wsRef.current) {
        try { wsRef.current.close() } catch { /* ignore */ }
      }
    }
  }, [url, handleMessage])

  const sendMove = useCallback((from: Square, to: Square) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    if (pendingTimer.current) clearTimeout(pendingTimer.current)
    setPending({ from, to, phase: 'sending' })
    setIllegalReason(null)
    ws.send(JSON.stringify({ type: 'move', from: from.toUpperCase(), to: to.toUpperCase() }))
    pendingTimer.current = setTimeout(() => {
      pendingTimer.current = null
      setPending(null)
      setIllegalReason('Move timed out; board state was refreshed.')
      const current = wsRef.current
      if (current?.readyState === WebSocket.OPEN) {
        current.send(JSON.stringify({ type: 'hello' }))
      }
    }, PENDING_MOVE_TIMEOUT_MS)
    return true
  }, [])

  const sendReset = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
    setPending(null)
    setIllegalReason(null)
    ws.send(JSON.stringify({ type: 'reset' }))
  }, [])

  const requestState = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'hello' }))
  }, [])

  const clearIllegal = useCallback(() => setIllegalReason(null), [])

  const createRoom = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'create' }))
  }, [])

  const joinRoom = useCallback((code: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'join', room: code.toUpperCase().trim() }))
  }, [])

  const leaveRoom = useCallback(() => {
    desiredRoomRef.current = null
    try { sessionStorage.removeItem(ROOM_STORAGE_KEY) } catch { /* ignore */ }
    setRoomCode(null)
    setMyColor(null)
    setPeerConnected(false)
    setBoardConnected(false)
    setSeatKindState({ w: 'human', b: 'human' })
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave' }))
    }
  }, [])

  const setSeatKind = useCallback((color: 'w' | 'b', kind: 'human' | 'ai') => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'set-seat', color, kind }))
  }, [])

  const claimDevice = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'claim-device' }))
  }, [])

  return {
    status, pending, illegalReason,
    roomCode, myColor, peerConnected, boardConnected, seatKind,
    createRoom, joinRoom, leaveRoom, setSeatKind, claimDevice,
    sendMove, sendReset, requestState, clearIllegal,
  }
}
