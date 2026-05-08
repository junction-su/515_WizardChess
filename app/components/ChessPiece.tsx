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

// White pieces: invert the dark blue-grey SVG to cream/white, with warm shadow
// Black pieces: keep natural (dark blue-grey reads well as black) with subtle darkening
const filter: Record<Color, string> = {
  w: 'brightness(0) invert(1) drop-shadow(1px 2px 1px rgba(90,60,10,0.55))',
  b: 'brightness(0) drop-shadow(1px 1px 2px rgba(255,255,255,0.35))',
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
