@AGENTS.md

# Wizarding Chess — Web Companion Interface

## Project Overview

An accessible web companion app for **Wizarding Chess** — a self-moving physical chessboard built for users with visual or motor limitations. The web interface mirrors the physical board state and allows remote move input.

- **Team:** Team 02, DA (Youngpyung Lee, Su Hyun Jung, Keochonodom Taing)
- **Branch:** `claude/wizarding-chess-web-interface-1xKGN`
- **Status:** UI prototype in progress — hardware (ESP32-S3) integration not yet started

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.4, App Router |
| UI | React 19, Tailwind CSS v4 |
| Chess logic | chess.js v1.4.0 |
| Language | TypeScript |
| Styling | Tailwind utility classes + inline styles for dynamic values |

> **Important:** This is Next.js 16 with breaking changes from earlier versions. Always read `node_modules/next/dist/docs/` before modifying routing, layout, or data-fetching code.

---

## File Structure

```
app/
  lib/
    chess.ts              # All chess domain types and helpers (wraps chess.js)
  components/
    ChessPiece.tsx        # SVG chess piece icons for all 6 piece types
    ChessBoard.tsx        # 8×8 board renderer with square highlight logic
    RightPanel.tsx        # Right sidebar: turn, last move, captured, move control
    StatusHeader.tsx      # Top header with logo and connection status indicator
  page.tsx                # Root page: game state, useChessGame hook, layout
  layout.tsx              # Root layout with metadata and fonts
  globals.css             # Tailwind base import + minimal globals
```

---

## Architecture

### State Management

All game state lives in the `useChessGame` hook inside `page.tsx`. It owns a `useRef<Chess>` instance from chess.js and derives display state from it after each move.

**Do not** split the `Chess` instance across components. All chess.js calls go through `useChessGame`.

### Board State Flow

```
chess.js Chess instance (source of truth)
  → chessBoardToDisplay()    converts to display-friendly 2D array
  → board state (React)      passed as prop to ChessBoard
  → ChessBoard renders       purely from props, no internal state
```

### Move Flow

```
User clicks piece → selectSquare() → getLegalMoves() → highlights shown
User clicks destination → selection.to set
User clicks Confirm Move → confirmMove() → chess.move() → syncFromChess()
```

### Physical Board Sync (Mock)

`receiveMoveFromBoard(from, to)` simulates a move from the hardware. It selects the piece, shows legal moves, then sets the destination after 600ms delay. A dev "Simulate board" panel in the right panel footer triggers this.

When the ESP32-S3 protocol is finalized, wire the WebSocket/polling handler to call `receiveMoveFromBoard(from, to)` — no other changes needed.

---

## Key Types (`app/lib/chess.ts`)

```ts
BoardPiece    { type: PieceSymbol, color: Color, square: Square }
LastMove      { from, to, san, piece, captured? }
LegalMoveSquare { square, isCapture }
GameStatus    'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'
ConnectionStatus 'connected' | 'disconnected' | 'syncing'
```

---

## Square Highlight Colors

| State | Light square | Dark square |
|-------|-------------|-------------|
| Selected piece (from) | `#fbbf24` amber | `#d97706` amber-dark |
| Destination (to, pending confirm) | `#fb923c` orange | `#ea580c` orange-dark |
| Legal move — empty square | `#93c5fd` sky blue | `#3b82f6` blue |
| Legal move — capture square | `#fca5a5` red-light | `#ef4444` red |
| Last move route | dotted border overlay (no bg change) |
| King in check | `#f87171` red-light | `#dc2626` red |
| Base light square | `#f0d9b5` cream | — |
| Base dark square | — | `#b58863` brown |

---

## Visual Design

- **Background:** `#f5f2ed` (warm beige/cream)
- **Right panel background:** white
- **Typography:** Geist Sans (body), Geist Mono (coordinates, move notation)
- **No heavy shadows** — borders and muted tones only
- **No dark mode** — intentionally disabled in `globals.css`

---

## Accessibility

- Every board square has `aria-label` (e.g. `"e2, White Pawn, selected"`)
- Board has `role="grid"`, rows have `role="row"`, squares have `role="gridcell"`
- A `role="status" aria-live="polite"` region announces moves to screen readers
- Selected and destination squares have `aria-selected` and `aria-pressed`
- Legal move squares include `", legal move"` in their aria-label

---

## Game Over

When `gameStatus` is `checkmate`, `stalemate`, or `draw`, a `GameOverOverlay` renders on top of the board (absolutely positioned, blurred backdrop). It shows:
- Title: "Checkmate" / "Stalemate" / "Draw"
- Subtitle: winner or reason
- **Restart Game** button — calls `restart()` which resets the `Chess` instance and all React state

---

## What's NOT Done Yet (Deferred)

| Feature | Notes |
|---------|-------|
| WebSocket / REST sync with ESP32-S3 | Protocol not finalized. Hook into `receiveMoveFromBoard()` |
| Accessibility settings panel | High-contrast mode, large pieces, TTS read-aloud |
| Pawn promotion UI | Currently auto-promotes to queen |
| Game history / move log | Deferred per PRD |
| Mobile layout | Desktop-first for Demo Fair |
| User accounts / room codes | Post-demo |

---

## Open Questions (from PRD)

1. **Sync protocol:** WebSocket, HTTP polling, or Supabase Realtime from the ESP32-S3?
2. **Board state ownership:** Does hardware push, or does web poll?
3. **Move validation:** Chess logic on web, MCU, or shared backend?
4. **Demo network:** Local (`wizarding-chess.local`) or hosted fallback?

---

## Development Commands

```bash
npm install       # install deps (node_modules not in git)
npm run dev       # start dev server at localhost:3000
npm run build     # production build (run before committing)
npx tsc --noEmit  # type-check without building
```

Always run `npx tsc --noEmit` and `npm run build` before committing.
