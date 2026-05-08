import { PieceSymbol, Color } from 'chess.js'

interface ChessPieceProps {
  type: PieceSymbol
  color: Color
  size?: number  // fixed px; omit to fill parent container
}

const pieceFile: Record<PieceSymbol, (color: Color) => string> = {
  k: () => '/pieces/King.svg',
  q: () => '/pieces/Queen.svg',
  r: () => '/pieces/Rook.svg',
  b: () => '/pieces/Bishop.svg',
  n: (color) => color === 'w' ? '/pieces/Knight_1.svg' : '/pieces/Knight_2.svg',
  p: () => '/pieces/Pawn.svg',
}

const filter: Record<Color, string> = {
  w: 'brightness(1.65) contrast(0.9) saturate(0.2) sepia(0.55) drop-shadow(1px 2px 1px rgba(80,50,0,0.4))',
  b: 'brightness(0.6) contrast(1.25) drop-shadow(1px 1px 2px rgba(220,210,190,0.35))',
}

export default function ChessPiece({ type, color, size }: ChessPieceProps) {
  return (
    <img
      src={pieceFile[type](color)}
      alt=""
      aria-hidden="true"
      style={{
        filter: filter[color],
        display: 'block',
        width: size ?? '100%',
        height: size ?? '100%',
      }}
      draggable={false}
    />
  )
}
