'use client'

import { BoardState, Piece, squareLabel } from '@/app/lib/chess'
import ChessPiece from './ChessPiece'

interface ChessBoardProps {
  board: BoardState
  selectedSquare: { row: number; col: number } | null
  highlightedSquares: { row: number; col: number }[]
  lastMoveSquares: { row: number; col: number }[]
  onSquareClick: (row: number, col: number, piece: Piece | null) => void
}

export default function ChessBoard({
  board,
  selectedSquare,
  highlightedSquares,
  lastMoveSquares,
  onSquareClick,
}: ChessBoardProps) {
  const isSelected = (r: number, c: number) =>
    selectedSquare?.row === r && selectedSquare?.col === c

  const isHighlighted = (r: number, c: number) =>
    highlightedSquares.some((s) => s.row === r && s.col === c)

  const isLastMove = (r: number, c: number) =>
    lastMoveSquares.some((s) => s.row === r && s.col === c)

  const isLight = (r: number, c: number) => (r + c) % 2 === 0

  return (
    <div className="flex flex-col-reverse select-none">
      {board.map((rowPieces, rowIdx) => (
        <div key={rowIdx} className="flex items-center">
          {/* Rank label */}
          <div className="w-6 text-center text-sm font-mono text-stone-500 shrink-0">
            {rowIdx + 1}
          </div>

          {rowPieces.map((piece, colIdx) => {
            const light = isLight(rowIdx, colIdx)
            const selected = isSelected(rowIdx, colIdx)
            const highlighted = isHighlighted(rowIdx, colIdx)
            const lastMove = isLastMove(rowIdx, colIdx)

            let bg = light ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
            if (lastMove) bg = light ? 'bg-[#cdd16f]' : 'bg-[#aaa23a]'
            if (selected) bg = 'bg-[#7fc97f]'

            return (
              <button
                key={colIdx}
                className={`relative w-14 h-14 flex items-center justify-center transition-colors ${bg} hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500`}
                onClick={() => onSquareClick(rowIdx, colIdx, piece)}
                aria-label={`${squareLabel(colIdx, rowIdx)}${piece ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}`}
              >
                {highlighted && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 rounded-full bg-black/20" />
                  </div>
                )}
                {highlighted && piece && (
                  <div className="absolute inset-0 rounded-full ring-4 ring-inset ring-black/30 pointer-events-none" />
                )}
                {piece && (
                  <div className="relative z-10">
                    <ChessPiece type={piece.type} color={piece.color} size={44} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ))}

      {/* File labels */}
      <div className="flex ml-6">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => (
          <div key={file} className="w-14 text-center text-sm font-mono text-stone-500">
            {file}
          </div>
        ))}
      </div>
    </div>
  )
}
