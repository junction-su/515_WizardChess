'use client'

import { BoardPiece, LegalMoveSquare, LastMove, squareToColRow, colRowToSquare } from '@/app/lib/chess'
import { Square } from 'chess.js'
import ChessPiece from './ChessPiece'

interface ChessBoardProps {
  board: (BoardPiece | null)[][]
  selectedSquare: Square | null
  legalMoves: LegalMoveSquare[]
  lastMove: LastMove | null
  inCheck: boolean
  currentTurn: 'w' | 'b'
  onSquareClick: (square: Square, piece: BoardPiece | null) => void
}

export default function ChessBoard({
  board,
  selectedSquare,
  legalMoves,
  lastMove,
  inCheck,
  currentTurn,
  onSquareClick,
}: ChessBoardProps) {
  const legalSquareMap = new Map(legalMoves.map((m) => [m.square, m.isCapture]))

  const isLastMove = (sq: Square) =>
    sq === lastMove?.from || sq === lastMove?.to

  // Find king square for check highlight
  const kingSquare: Square | null = (() => {
    if (!inCheck) return null
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c]
        if (p && p.type === 'k' && p.color === currentTurn) return p.square
      }
    }
    return null
  })()

  const isLight = (r: number, c: number) => (r + c) % 2 === 0

  return (
    <div className="flex flex-col-reverse select-none" role="grid" aria-label="Chess board">
      {board.map((rowPieces, rowIdx) => (
        <div key={rowIdx} className="flex items-center" role="row">
          {/* Rank label */}
          <div
            className="w-6 text-center text-sm font-mono text-stone-500 shrink-0"
            aria-hidden="true"
          >
            {rowIdx + 1}
          </div>

          {rowPieces.map((piece, colIdx) => {
            const sq = colRowToSquare(colIdx, rowIdx)
            const light = isLight(rowIdx, colIdx)
            const isSelected = sq === selectedSquare
            const legalCapture = legalSquareMap.get(sq)
            const isLegal = legalSquareMap.has(sq)
            const isLastMoveSquare = isLastMove(sq)
            const isKingInCheck = sq === kingSquare

            let bg = light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'

            if (isLastMoveSquare) bg = light ? 'bg-[#cdd16f]' : 'bg-[#aaa23a]'

            // Legal move: empty square — olive/yellow tint
            if (isLegal && legalCapture === false)
              bg = light ? 'bg-[#d4e86e]' : 'bg-[#9fb032]'

            // Legal move: capture square — red/orange tint
            if (isLegal && legalCapture === true)
              bg = light ? 'bg-[#f0a07a]' : 'bg-[#c96030]'

            if (isSelected) bg = light ? 'bg-[#7fc97f]' : 'bg-[#4a9a4a]'
            if (isKingInCheck) bg = light ? 'bg-[#f87171]' : 'bg-[#dc2626]'

            const pieceAriaLabel = piece
              ? `${piece.color === 'w' ? 'White' : 'Black'} ${
                  { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' }[piece.type]
                }`
              : ''
            const squareAriaLabel = `${sq}${pieceAriaLabel ? `, ${pieceAriaLabel}` : ''}${isSelected ? ', selected' : ''}${isLegal ? ', legal move' : ''}`

            return (
              <button
                key={colIdx}
                role="gridcell"
                className={`relative w-14 h-14 flex items-center justify-center transition-colors ${bg}
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
                  ${isSelected ? 'ring-2 ring-inset ring-green-600' : ''}
                `}
                onClick={() => onSquareClick(sq, piece)}
                aria-label={squareAriaLabel}
                aria-selected={isSelected}
                aria-pressed={isSelected}
              >
                {piece && (
                  <div className="relative z-10 pointer-events-none">
                    <ChessPiece type={piece.type} color={piece.color} size={44} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ))}

      {/* File labels */}
      <div className="flex ml-6" aria-hidden="true">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => (
          <div key={file} className="w-14 text-center text-sm font-mono text-stone-500">
            {file}
          </div>
        ))}
      </div>
    </div>
  )
}
