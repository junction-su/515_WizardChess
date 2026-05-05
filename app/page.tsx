'use client'

import { useState, useCallback } from 'react'
import { GameState, Piece, squareLabel, MOCK_GAME_STATE } from '@/app/lib/chess'
import ChessBoard from '@/app/components/ChessBoard'
import RightPanel from '@/app/components/RightPanel'
import StatusHeader from '@/app/components/StatusHeader'

interface MoveSelection {
  from: { row: number; col: number } | null
  to: { row: number; col: number } | null
  piece: Piece | null
}

const EMPTY_SELECTION: MoveSelection = { from: null, to: null, piece: null }

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(MOCK_GAME_STATE)
  const [selection, setSelection] = useState<MoveSelection>(EMPTY_SELECTION)
  const [lastMoveSquares, setLastMoveSquares] = useState<{ row: number; col: number }[]>([])

  const handleSquareClick = useCallback(
    (row: number, col: number, piece: Piece | null) => {
      if (gameState.connectionStatus === 'disconnected') return

      if (!selection.from) {
        if (piece && piece.color === gameState.currentTurn) {
          setSelection({ from: { row, col }, to: null, piece })
        }
        return
      }

      if (selection.from.row === row && selection.from.col === col) {
        setSelection(EMPTY_SELECTION)
        return
      }

      if (piece && piece.color === gameState.currentTurn) {
        setSelection({ from: { row, col }, to: null, piece })
        return
      }

      setSelection((prev) => ({ ...prev, to: { row, col } }))
    },
    [selection, gameState.currentTurn, gameState.connectionStatus]
  )

  const handleConfirm = useCallback(() => {
    if (!selection.from || !selection.to || !selection.piece) return

    const fromLabel = squareLabel(selection.from.col, selection.from.row)
    const toLabel = squareLabel(selection.to.col, selection.to.row)

    setGameState((prev) => {
      const newBoard = prev.board.map((r) => [...r])
      const captured = newBoard[selection.to!.row][selection.to!.col]

      newBoard[selection.to!.row][selection.to!.col] = selection.piece
      newBoard[selection.from!.row][selection.from!.col] = null

      const capturedByWhite =
        captured && captured.color === 'b'
          ? [...prev.capturedByWhite, captured]
          : prev.capturedByWhite
      const capturedByBlack =
        captured && captured.color === 'w'
          ? [...prev.capturedByBlack, captured]
          : prev.capturedByBlack

      return {
        ...prev,
        board: newBoard,
        currentTurn: prev.currentTurn === 'w' ? 'b' : 'w',
        lastMove: {
          from: fromLabel,
          to: toLabel,
          piece: selection.piece!,
        },
        capturedByWhite,
        capturedByBlack,
      }
    })

    setLastMoveSquares([selection.from, selection.to])
    setSelection(EMPTY_SELECTION)
  }, [selection])

  const handleCancel = useCallback(() => {
    setSelection(EMPTY_SELECTION)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#f5f2ed]">
      <StatusHeader status={gameState.connectionStatus} />

      <main className="flex flex-1 overflow-hidden">
        {/* Board area */}
        <div className="flex flex-1 items-center justify-center p-8">
          <ChessBoard
            board={gameState.board}
            selectedSquare={selection.from}
            highlightedSquares={[]}
            lastMoveSquares={lastMoveSquares}
            onSquareClick={handleSquareClick}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-stone-200 shrink-0" />

        {/* Right panel */}
        <div className="w-80 shrink-0 bg-white flex flex-col">
          <RightPanel
            gameState={gameState}
            selection={selection}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            disabled={gameState.connectionStatus === 'disconnected'}
          />
        </div>
      </main>
    </div>
  )
}
