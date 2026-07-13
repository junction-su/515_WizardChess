@AGENTS.md

# Wizard Chess — Web Companion Interface

**Team 02** · Branch: `claude/wizarding-chess-web-interface-1xKGN`
**Stack:** Next.js 16.2.4 App Router · React 19 · Tailwind CSS v4 · chess.js v1.4.0 · Stockfish 18 · ws · TypeScript

> Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` before touching routing/layout.

---

## Files

```
server.mjs                # Next.js + WS broker on ONE port. Rooms, chess.js validation,
                          #   device claim pool, seatKind, board-completion wait
app/lib/
  chess.ts                # types + chess.js helpers
  socket.ts               # useChessSocket — room protocol, auto-reconnect/rejoin
  stockfish.ts            # useStockfish — Stockfish 18 lite Web Worker
app/components/
  ChessPiece.tsx          # <img> SVG pieces, CSS filter for w/b coloring
  ChessBoard.tsx          # 8×8 grid, highlights, aria labels, `flipped` prop (Black view)
  RightPanel.tsx          # players (You/Opponent/AI toggle), move control, captured
  GameModeRow.tsx         # local: Play Online + Reset · online: Room code + Link Board + Leave
  StatusHeader.tsx        # logo + "Server Connected" dot (hidden in local mode)
  AttackAnimation.tsx     # capture attack video overlay
app/page.tsx              # intro page  ·  app/game/page.tsx  # game page + all hooks/overlays
scripts/copy-stockfish.mjs# postinstall: node_modules/stockfish/bin → public/stockfish/
public/pieces/ public/intro/ public/stockfish/
```

---

## Modes (lobby modal on /game entry)

- **Local Play** — browser-only chess.js + Stockfish. Never touches server/board.
- **Create/Join Room** — server-authoritative online play. `?room=CODE` invite links,
  sessionStorage auto-rejoin, Black sees flipped board, own-turn-only selection.
  Waiting overlay offers **Play vs AI instead** (empty seat → `seatKind='ai'`,
  the seated human's client runs Stockfish and proxies the AI's moves).
- **Physical board** — ESP32 connects `/device` (unclaimed pool); a player clicks
  **Link Board** (`claim-device`) to bind it. `?room=CODE` binds directly. Board
  released to pool when room empties. Never auto-binds (public deploy safety).

---

## Server (server.mjs) — source of truth

- Room: `{ code, chess, players{w,b}, seatKind{w,b}, spectators, device, pendingMove }`
- Move flow: validate turn+legality → broadcast `ack` → if board linked, send move and
  **wait for board's `done` (9s timeout)** before broadcasting `done` (turn advance).
  No board → `done` immediately.
- WS messages — browser→server: `create/join/leave/move/reset/hello/set-seat/claim-device`
  server→browser: `room/state(+fen)/ack/done/turn/illegal/peer/board/seat/error/log`
- `BROKER_ONLY=true node server.mjs` — broker without Next (for Render).

## Client sync (app/game/page.tsx)

- `useChessGame` owns the single Chess instance. Local moves apply directly;
  online moves send via socket and apply on server `done`/`state` events.
- Capture moves defer through `deferMoveForAnimation` (attack video plays first).
- Room `seatKind` mirrors into `players` so the same AI-turn effect drives both modes.
- Game live → `window.scrollTo(0,0)` (mobile keyboard leaves page scrolled).

---

## Deployment

- **Vercel (UI)** + **Render (broker)**: Render start cmd `BROKER_ONLY=true node server.mjs`;
  Vercel env `NEXT_PUBLIC_WS_URL=wss://<render-app>.onrender.com/ws` (Production scope!).
  `NEXT_PUBLIC_DISABLE_BOARD_SYNC=true` kills the socket entirely — must NOT be set.
- Single host alternative: `npm start` serves UI+broker together, same-origin `/ws`.
- Render free tier sleeps after 15min — first connect takes ~30s.

## Intro Page (app/page.tsx)

- Knight video positioning — **do not touch, user manages it**
- Enter button (was "Connect") → fake 3s loading → `/game`

## Key Types

```ts
BoardPiece       { type, color, square }
GameStatus       'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'
ConnectionStatus 'connected' | 'disconnected' | 'syncing'   // server socket, not board
PlayerConfig     { w: 'human'|'ai', b: 'human'|'ai' }
```

## Open Items

| Item | Status |
|------|--------|
| ESP32 firmware: wss:// + `{type:'done',from,to}` on physical completion | Dom-Taing |
| Pawn promotion UI | Auto-queens |
| Accessibility settings | Post-demo |

## Dev Commands

```bash
npm run dev       # node server.mjs → UI + broker on :3000
npx tsc --noEmit  # type-check
npm run build     # run before every commit
# server test suites (dev server must be running):
#   scratchpad/test-rooms.mjs, test-board-wait.mjs, test-ai-and-claim.mjs
```
