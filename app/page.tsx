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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected')

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

  const receiveMoveFromBoard = useCallback((from: Square, to: Square) => {
    const chess = chessRef.current
    const piece = chess.get(from) as BoardPiece | false
    if (!piece) return
    setSelection({ from, to: null, piece: piece as BoardPiece })
    setLegalMoves(getLegalMoves(chess, from))
    setTimeout(() => {
      setSelection((prev) => ({ ...prev, to }))
      setAnnouncement(`Physical board move detected: ${from} to ${to}. Press Confirm Move to execute.`)
    }, 600)
  }, [])

  return {
    board, currentTurn, lastMove, capturedByWhite, capturedByBlack,
    gameStatus, selection, legalMoves, announcement, connectionStatus,
    setConnectionStatus, selectSquare, confirmMove, cancelSelection,
    receiveMoveFromBoard, restart,
  }
}

// Game over overlay shown on top of the board
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

// Dev tool simulate panel
function SimulatePanel({ onSimulate }: { onSimulate: (from: Square, to: Square) => void }) {
  const [from, setFrom] = useState('e2')
  const [to, setTo] = useState('e4')
  return (
    <div className="border-t border-stone-200 px-4 py-3 bg-amber-50 flex items-center gap-2 text-sm">
      <span className="text-amber-700 font-medium shrink-0">Simulate board →</span>
      <input
        className="w-14 border border-amber-300 rounded px-2 py-1 font-mono text-center text-xs"
        value={from}
        onChange={(e) => setFrom(e.target.value.toLowerCase())}
        maxLength={2}
        aria-label="From square"
      />
      <span className="text-amber-600">→</span>
      <input
        className="w-14 border border-amber-300 rounded px-2 py-1 font-mono text-center text-xs"
        value={to}
        onChange={(e) => setTo(e.target.value.toLowerCase())}
        maxLength={2}
        aria-label="To square"
      />
      <button
        onClick={() => onSimulate(from as Square, to as Square)}
        className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
      >
        Send
      </button>
    </div>
  )
}

export default function Home() {
  const {
    board, currentTurn, lastMove, capturedByWhite, capturedByBlack,
    gameStatus, selection, legalMoves, announcement, connectionStatus,
    selectSquare, confirmMove, cancelSelection, receiveMoveFromBoard, restart,
  } = useChessGame()

  return (
    <div className="flex flex-col h-screen bg-[#f5f2ed]">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <StatusHeader status={connectionStatus} />

      <main className="flex flex-1 overflow-hidden">
        {/* Board area — relative so overlay is contained */}
        <div className="relative flex flex-1 items-center justify-center p-8">
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

        <div className="w-px bg-stone-200 shrink-0" />

        <div className="w-80 shrink-0 bg-white flex flex-col">
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
          <SimulatePanel onSimulate={receiveMoveFromBoard} />
        </div>
      </main>
    </div>
  )
}
