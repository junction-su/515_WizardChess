@AGENTS.md

# Wizarding Chess — Web Companion Interface

**Team 02** · Branch: `claude/wizarding-chess-web-interface-1xKGN`
**Stack:** Next.js 16.2.4 App Router · React 19 · Tailwind CSS v4 · chess.js v1.4.0 · TypeScript

> Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` before touching routing/layout.

---

## Files

```
app/lib/chess.ts          # types + chess.js helpers (BoardPiece, LastMove, LegalMoveSquare, GameStatus)
app/components/
  ChessPiece.tsx          # <img> SVG pieces from public/pieces/, CSS filter for w/b coloring
  ChessBoard.tsx          # 8×8 grid, square highlights, aria labels. Squares: 96px, pieces: 80px
  RightPanel.tsx          # turn indicator, last move, captured pieces, confirm/cancel controls
  StatusHeader.tsx        # logo + connection status dot (connected/disconnected/syncing)
app/page.tsx              # useChessGame hook (owns Chess ref), GameOverOverlay, layout
app/layout.tsx / globals.css
public/pieces/            # bishop/king/queen/rook/pawn.svg, knight_white.svg, knight_black.svg
```

---

## Architecture

- All chess.js calls go through `useChessGame` in `page.tsx`. Never split the Chess instance.
- `ChessBoard` is pure props — no internal state.
- Move flow: click piece → `selectSquare()` → highlights → click dest → Confirm → `confirmMove()` → `chess.move()` → `syncFromChess()`
- **Backend hook:** when ESP32-S3 WebSocket is ready, call `receiveMoveFromBoard(from, to)` — no other changes needed.

---

## Piece Filters (ChessPiece.tsx)

SVGs are blue-grey metallic (#20303C–#A1B5C0). Filters shift tone while preserving shading:
```ts
w: 'brightness(1.65) contrast(0.9) saturate(0.2) sepia(0.55) drop-shadow(...)'  // ivory
b: 'brightness(0.6) contrast(1.25) drop-shadow(...)'                             // dark
```

---

## Square Highlight Priority (high → low)

King in check > selected (from, amber) > destination (to, orange) > legal capture (red) > legal empty (blue) > last move (dotted border) > base (cream/brown)

---

## Key Types

```ts
BoardPiece       { type: PieceSymbol, color: Color, square: Square }
LastMove         { from, to, san, piece, captured? }
LegalMoveSquare  { square, isCapture }
GameStatus       'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'
ConnectionStatus 'connected' | 'disconnected' | 'syncing'
```

---

## Deferred / Open

| Item | Status |
|------|--------|
| ESP32-S3 WebSocket sync | Protocol not finalized — hook into `receiveMoveFromBoard()` |
| Responsive / mobile layout | Planned next |
| Move animations | Planned |
| Pawn promotion UI | Auto-promotes to queen for now |
| Accessibility settings panel | Post-demo |

**Open:** sync protocol (WS/polling/Supabase?), board state ownership (push vs poll), move validation location, demo network setup.

---

## Dev Commands

```bash
npm run dev          # localhost:3000
npx tsc --noEmit     # type-check
npm run build        # run before every commit
```
