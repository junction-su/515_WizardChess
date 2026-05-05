'use client'

import { BoardPiece, LegalMoveSquare, LastMove, squareToColRow, colRowToSquare } from '@/app/lib/chess'
import { Square } from 'chess.js'
import ChessPiece from './ChessPiece'

interface ChessBoardProps {
  board: (BoardPiece | null)[][]
  selectedSquare: Square | null
  destinationSquare: Square | null
  legalMoves: LegalMoveSquare[]
  lastMove: LastMove | null
  inCheck: boolean
  currentTurn: 'w' | 'b'
  onSquareClick: (square: Square, piece: BoardPiece | null) => void
}

export default function ChessBoard({
  board,
  selectedSquare,
  destinationSquare,
  legalMoves,
  lastMove,
  inCheck,
  currentTurn,
  onSquareClick,
}: ChessBoardProps) {
  const legalSquareMap = new Map(legalMoves.map((m) => [m.square, m.isCapture]))

  const isLastMove = (sq: Square) =>
    sq === lastMove?.from || sq === lastMove?.to

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
            const isFrom = sq === selectedSquare
            const isTo = sq === destinationSquare
            const legalCapture = legalSquareMap.get(sq)
            const isLegal = legalSquareMap.has(sq)
            const isLastMoveSquare = isLastMove(sq)
            const isKingInCheck = sq === kingSquare

            // Priority (high → low): check > from > to > legal > lastMove > base
            let bg = light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'

            // Last move: subtle gray
            if (isLastMoveSquare) bg = light ? 'bg-[#d0cfc9]' : 'bg-[#9e9d98]'

            // Legal move: empty square — sky blue
            if (isLegal && legalCapture === false)
              bg = light ? 'bg-[#93c5fd]' : 'bg-[#3b82f6]'

            // Legal move: capture square — red
            if (isLegal && legalCapture === true)
              bg = light ? 'bg-[#fca5a5]' : 'bg-[#ef4444]'

            // Destination (to) — amber/orange, "pending confirm"
            if (isTo) bg = light ? 'bg-[#fb923c]' : 'bg-[#ea580c]'

            // Selected piece (from) — bright yellow/gold
            if (isFrom) bg = light ? 'bg-[#fbbf24]' : 'bg-[#d97706]'

            // King in check — red override
            if (isKingInCheck) bg = light ? 'bg-[#f87171]' : 'bg-[#dc2626]'

            const pieceAriaLabel = piece
              ? `${piece.color === 'w' ? 'White' : 'Black'} ${
                  { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' }[piece.type]
                }`
              : ''
            const squareAriaLabel = `${sq}${pieceAriaLabel ? `, ${pieceAriaLabel}` : ''}${isFrom ? ', selected' : ''}${isTo ? ', destination' : ''}${isLegal ? ', legal move' : ''}`

            return (
              <button
                key={colIdx}
                role="gridcell"
                className={`relative w-14 h-14 flex items-center justify-center transition-colors ${bg}
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
                  ${isFrom ? 'ring-2 ring-inset ring-yellow-500' : ''}
                  ${isTo ? 'ring-2 ring-inset ring-orange-500' : ''}
                `}
                onClick={() => onSquareClick(sq, piece)}
                aria-label={squareAriaLabel}
                aria-selected={isFrom || isTo}
                aria-pressed={isFrom || isTo}
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
