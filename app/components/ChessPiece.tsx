import { PieceSymbol, Color } from 'chess.js'

interface ChessPieceProps {
  type: PieceSymbol
  color: Color
  size?: number
}

const pieceFile: Record<PieceSymbol, (color: Color) => string> = {
  k: () => '/pieces/king.svg',
  q: () => '/pieces/queen.svg',
  r: () => '/pieces/rook.svg',
  b: () => '/pieces/bishop.svg',
  n: (color) => color === 'w' ? '/pieces/knight_white.svg' : '/pieces/knight_black.svg',
  p: () => '/pieces/pawn.svg',
}

const filter: Record<Color, string> = {
  w: 'brightness(1.9) contrast(0.85) saturate(0.2) sepia(0.55) drop-shadow(1px 2px 1px rgba(80,50,0,0.4))',
  b: 'brightness(0.45) contrast(1.75) drop-shadow(1px 1px 2px rgba(220,210,190,0.35))',
}

export default function ChessPiece({ type, color, size = 44 }: ChessPieceProps) {
  return (
    <img
      src={pieceFile[type](color)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ filter: filter[color], display: 'block' }}
      draggable={false}
    />
  )
}
