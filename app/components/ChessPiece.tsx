import { PieceSymbol, Color } from 'chess.js'

interface ChessPieceProps {
  type: PieceSymbol
  color: Color
  size?: number
}

function KingIcon({ color, size }: { color: Color; size: number }) {
  const fill = color === 'w' ? '#ffffff' : '#1a1a1a'
  const stroke = color === 'w' ? '#1a1a1a' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0l2-12.5c0-2.5-2.5-4-4-4-3 0-5 3.5-7 3.5s-4-3.5-7-3.5c-1.5 0-4 1.5-4 4L11.5 37z" />
        <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" />
      </g>
    </svg>
  )
}

function QueenIcon({ color, size }: { color: Color; size: number }) {
  const fill = color === 'w' ? '#ffffff' : '#1a1a1a'
  const stroke = color === 'w' ? '#1a1a1a' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="12" r="2.75" />
        <circle cx="14" cy="9" r="2.75" />
        <circle cx="22.5" cy="8" r="2.75" />
        <circle cx="31" cy="9" r="2.75" />
        <circle cx="39" cy="12" r="2.75" />
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-3.5-14.5-5 15-5-15L14 25 6.5 13.5 9 26z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path d="M11.5 30c3.5-1 18.5-1 22 0" />
      </g>
    </svg>
  )
}

function RookIcon({ color, size }: { color: Color; size: number }) {
  const fill = color === 'w' ? '#ffffff' : '#1a1a1a'
  const stroke = color === 'w' ? '#1a1a1a' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h4v2h5V9h4v5" />
        <path d="M34 14l-3 3H14l-3-3" />
        <path d="M31 17v12.5H14V17" />
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <path d="M11 14h23" />
      </g>
    </svg>
  )
}

function BishopIcon({ color, size }: { color: Color; size: number }) {
  const fill = color === 'w' ? '#ffffff' : '#1a1a1a'
  const stroke = color === 'w' ? '#1a1a1a' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.5 1.5 0 2-1.5.5-28.5.5-30 0-1.5-.5 0-2 3-2z" />
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 1-1 0-2 0-2-5-2.5-10-2.5-15 0 0 0-1 1 0 2z" />
        <path d="M22.5 9c-4.5 0-8 3.5-8 9 0 2.89 1.14 5.53 3 7.35-.56.81-1 1.66-1 2.65h12c0-.99-.44-1.84-1-2.65 1.86-1.82 3-4.46 3-7.35 0-5.5-3.5-9-8-9z" />
        <path d="M22.5 7c1.5 0 3.5 1 4 4-2 .75-6 .75-8 0 .5-3 2.5-4 4-4z" />
        <circle cx="22.5" cy="6" r="1.5" />
      </g>
    </svg>
  )
}

function KnightIcon({ color, size }: { color: Color; size: number }) {
  const fill = color === 'w' ? '#ffffff' : '#1a1a1a'
  const stroke = color === 'w' ? '#1a1a1a' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 5.12-2.18 8.36-5 9" />
        <path d="M9.5 31.5c1.94.94 5.5 2 9.5 2 2.5 0 5-.5 6.5-1" />
        <path d="M10 31c1 4 4 6 9 6 6 0 9-3 9-6V25c0-6.5-5-11-11-11-3.5 0-5.5 1-7 2.5-2 2-3 5-3 8 0 1.5.5 3 .5 3" />
        <path d="M11 23.5c-.5 2.5.5 5 3 7" strokeWidth="1" />
      </g>
    </svg>
  )
}

function PawnIcon({ color, size }: { color: Color; size: number }) {
  const fill = color === 'w' ? '#ffffff' : '#1a1a1a'
  const stroke = color === 'w' ? '#1a1a1a' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-2.78-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
      </g>
    </svg>
  )
}

export default function ChessPiece({ type, color, size = 40 }: ChessPieceProps) {
  const props = { color, size }
  switch (type) {
    case 'k': return <KingIcon {...props} />
    case 'q': return <QueenIcon {...props} />
    case 'r': return <RookIcon {...props} />
    case 'b': return <BishopIcon {...props} />
    case 'n': return <KnightIcon {...props} />
    case 'p': return <PawnIcon {...props} />
  }
}
