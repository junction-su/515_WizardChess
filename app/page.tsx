'use client'

import { useState, useCallback, useRef } from 'react'
import { Chess, Square } from 'chess.js'
import {
  BoardPiece,
  LastMove,
  GameStatus,
  LegalMoveSquare,
  ConnectionStatus,
  chessBoardToDisplay,
  getLegalMoves,
  getGameStatus,
  moveDescription,
} from '@/app/lib/chess'
import ChessBoard from '@/app/components/ChessBoard'
import RightPanel from '@/app/components/RightPanel'
import StatusHeader from '@/app/components/StatusHeader'

interface MoveSelection {
  from: Square | null
  to: Square | null
  piece: BoardPiece | null
}

const EMPTY_SELECTION: MoveSelection = { from: null, to: null, piece: null }

// Fool's mate — black queen on h4 checkmates white king on e1
const DEMO_CHECKMATE_FEN = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'

function useChessGame() {
  const chessRef = useRef(new Chess())

  const [board, setBoard] = useState(() => chessBoardToDisplay(chessRef.current))
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w')
  const [lastMove, setLastMove] = useState<LastMove | null>(null)
  const [capturedByWhite, setCapturedByWhite] = useState<BoardPiece[]>([])
  const [capturedByBlack, setCapturedByBlack] = useState<BoardPiece[]>([])
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const [selection, setSelection] = useState<MoveSelection>(EMPTY_SELECTION)
  const [legalMoves, setLegalMoves] = useState<LegalMoveSquare[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [connectionStatus] = useState<ConnectionStatus>('connected')

  const syncFromChess = useCallback(() => {
    const chess = chessRef.current
    setBoard(chessBoardToDisplay(chess))
    setCurrentTurn(chess.turn())
    setGameStatus(getGameStatus(chess))
  }, [])

  const restart = useCallback(() => {
    chessRef.current = new Chess()
    setBoard(chessBoardToDisplay(chessRef.current))
    setCurrentTurn('w')
    setLastMove(null)
    setCapturedByWhite([])
    setCapturedByBlack([])
    setGameStatus('playing')
    setSelection(EMPTY_SELECTION)
    setLegalMoves([])
    setAnnouncement('Game restarted.')
  }, [])

  const loadDemo = useCallback(() => {
    chessRef.current = new Chess(DEMO_CHECKMATE_FEN)
    setBoard(chessBoardToDisplay(chessRef.current))
    setCurrentTurn(chessRef.current.turn())
    setLastMove(null)
    setCapturedByWhite([])
    setCapturedByBlack([])
    setGameStatus(getGameStatus(chessRef.current))
    setSelection(EMPTY_SELECTION)
    setLegalMoves([])
    setAnnouncement("Demo loaded: Fool's Mate. White is in checkmate.")
  }, [])

  const selectSquare = useCallback((square: Square, piece: BoardPiece | null) => {
    const chess = chessRef.current
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw') return
    if (connectionStatus === 'disconnected') return

    setSelection((prev) => {
      if (!prev.from) {
        if (!piece || piece.color !== chess.turn()) return prev
        setLegalMoves(getLegalMoves(chess, square))
        return { from: square, to: null, piece }
      }
      if (prev.from === square) {
        setLegalMoves([])
        return EMPTY_SELECTION
      }
      if (piece && piece.color === chess.turn()) {
        setLegalMoves(getLegalMoves(chess, square))
        return { from: square, to: null, piece }
      }
      return { ...prev, to: square }
    })
  }, [gameStatus, connectionStatus])

  const confirmMove = useCallback(() => {
    const chess = chessRef.current
    if (!selection.from || !selection.to || !selection.piece) return

    let result
    try {
      result = chess.move({ from: selection.from, to: selection.to, promotion: 'q' })
    } catch {
      setAnnouncement('Invalid move.')
      return
    }
    if (!result) return

    const moved: BoardPiece = { type: result.piece, color: result.color, square: result.to as Square }
    const captured = result.captured
      ? { type: result.captured, color: result.color === 'w' ? 'b' : 'w', square: result.to as Square } as BoardPiece
      : undefined

    const lm: LastMove = { from: result.from as Square, to: result.to as Square, san: result.san, piece: moved, captured }
    setLastMove(lm)

    if (captured) {
      if (result.color === 'w') setCapturedByWhite((p) => [...p, captured!])
      else setCapturedByBlack((p) => [...p, captured!])
    }

    setAnnouncement(moveDescription(lm))
    setSelection(EMPTY_SELECTION)
    setLegalMoves([])
    syncFromChess()
  }, [selection, syncFromChess])

  const cancelSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION)
    setLegalMoves([])
  }, [])

  return {
    board, currentTurn, lastMove, capturedByWhite, capturedByBlack,
    gameStatus, selection, legalMoves, announcement, connectionStatus,
    selectSquare, confirmMove, cancelSelection, restart, loadDemo,
  }
}

function GameOverOverlay({
  status,
  lastMove,
  onRestart,
}: {
  status: GameStatus
  lastMove: LastMove | null
  onRestart: () => void
}) {
  if (status !== 'checkmate' && status !== 'stalemate' && status !== 'draw') return null

  const titles: Partial<Record<GameStatus, string>> = {
    checkmate: 'Checkmate',
    stalemate: 'Stalemate',
    draw: 'Draw',
  }
  const subtitles: Partial<Record<GameStatus, string>> = {
    checkmate: lastMove
      ? `${lastMove.piece.color === 'w' ? 'White' : 'Black'} wins`
      : 'Game over',
    stalemate: 'No legal moves — the game is a draw',
    draw: 'The game ended in a draw',
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background: 'rgba(30, 24, 16, 0.62)', backdropFilter: 'blur(2px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
    >
      <div className="bg-[#faf7f2] rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 min-w-[260px]">
        <div className="text-4xl font-bold text-stone-800 tracking-tight">
          {titles[status]}
        </div>
        <div className="text-stone-500 text-sm text-center">
          {subtitles[status]}
        </div>
        <button
          onClick={onRestart}
          className="mt-2 px-8 py-3 rounded-xl bg-stone-800 text-white font-semibold text-sm hover:bg-stone-700 active:bg-stone-900 transition-colors"
          autoFocus
        >
          Restart Game
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const {
    board, currentTurn, lastMove, capturedByWhite, capturedByBlack,
    gameStatus, selection, legalMoves, announcement, connectionStatus,
    selectSquare, confirmMove, cancelSelection, restart, loadDemo,
  } = useChessGame()

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-[#edeff3]">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <StatusHeader status={connectionStatus} />

      <main className="flex flex-col md:flex-row md:flex-1 md:overflow-hidden">
        {/* Board area */}
        <div className="relative flex items-center justify-center p-3 sm:p-6 md:flex-1 md:p-4 lg:p-6 xl:p-8">
          <ChessBoard
            board={board}
            selectedSquare={selection.from}
            destinationSquare={selection.to}
            legalMoves={legalMoves}
            lastMove={lastMove}
            inCheck={gameStatus === 'check' || gameStatus === 'checkmate'}
            currentTurn={currentTurn}
            onSquareClick={selectSquare}
          />
          <GameOverOverlay
            status={gameStatus}
            lastMove={lastMove}
            onRestart={restart}
          />
        </div>

        {/* Divider: horizontal on mobile, vertical on desktop */}
        <div className="h-px md:h-auto md:w-px bg-stone-200 shrink-0" />

        {/* Right / bottom panel */}
        <div className="w-full md:w-80 shrink-0 bg-white flex flex-col">
          <RightPanel
            currentTurn={currentTurn}
            lastMove={lastMove}
            capturedByWhite={capturedByWhite}
            capturedByBlack={capturedByBlack}
            gameStatus={gameStatus}
            connectionStatus={connectionStatus}
            selection={selection}
            onConfirm={confirmMove}
            onCancel={cancelSelection}
          />

          {/* Dev demo panel */}
          <div className="border-t border-stone-200 px-4 py-3 bg-stone-50 flex items-center justify-between">
            <span className="text-xs text-stone-400">Dev</span>
            <button
              onClick={loadDemo}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Demo: Checkmate
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
