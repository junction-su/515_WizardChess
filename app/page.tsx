'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
  colRowToSquare,
  squareToColRow,
  pieceLabel,
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

  const selectSquare = useCallback((square: Square, piece: BoardPiece | null) => {
    const chess = chessRef.current
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw') return
    if (connectionStatus === 'disconnected') return

    setSelection((prev) => {
      // Nothing selected yet — pick own piece
      if (!prev.from) {
        if (!piece || piece.color !== chess.turn()) return prev
        const moves = getLegalMoves(chess, square)
        setLegalMoves(moves)
        return { from: square, to: null, piece }
      }

      // Clicked same square — deselect
      if (prev.from === square) {
        setLegalMoves([])
        return EMPTY_SELECTION
      }

      // Clicked own piece — switch selection
      if (piece && piece.color === chess.turn()) {
        const moves = getLegalMoves(chess, square)
        setLegalMoves(moves)
        return { from: square, to: null, piece }
      }

      // Set destination
      return { ...prev, to: square }
    })
  }, [gameStatus, connectionStatus])

  const confirmMove = useCallback(() => {
    const chess = chessRef.current
    if (!selection.from || !selection.to || !selection.piece) return

    const capturedPiece = chess.get(selection.to) as BoardPiece | null | false

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

    const lm: LastMove = {
      from: result.from as Square,
      to: result.to as Square,
      san: result.san,
      piece: moved,
      captured,
    }

    setLastMove(lm)

    if (captured) {
      if (result.color === 'w') {
        setCapturedByWhite((prev) => [...prev, captured!])
      } else {
        setCapturedByBlack((prev) => [...prev, captured!])
      }
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

  // Simulates a move arriving from the physical board
  const receiveMoveFromBoard = useCallback((from: Square, to: Square) => {
    const chess = chessRef.current
    const piece = chess.get(from) as BoardPiece | null | false
    if (!piece) return

    const moves = getLegalMoves(chess, from)
    setSelection({ from, to: null, piece: piece as BoardPiece })
    setLegalMoves(moves)

    // After a short pause, set destination (simulating piece being moved)
    setTimeout(() => {
      setSelection((prev) => ({ ...prev, to }))
      setAnnouncement(`Physical board move detected: ${from} to ${to}. Press Confirm Move to execute.`)
    }, 600)
  }, [])

  return {
    board,
    currentTurn,
    lastMove,
    capturedByWhite,
    capturedByBlack,
    gameStatus,
    selection,
    legalMoves,
    announcement,
    connectionStatus,
    setConnectionStatus,
    selectSquare,
    confirmMove,
    cancelSelection,
    receiveMoveFromBoard,
    chess: chessRef.current,
  }
}

// Simulate button panel — dev tool, remove when WebSocket is wired
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
    board,
    currentTurn,
    lastMove,
    capturedByWhite,
    capturedByBlack,
    gameStatus,
    selection,
    legalMoves,
    announcement,
    connectionStatus,
    setConnectionStatus,
    selectSquare,
    confirmMove,
    cancelSelection,
    receiveMoveFromBoard,
  } = useChessGame()

  return (
    <div className="flex flex-col h-screen bg-[#f5f2ed]">
      {/* Accessibility live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <StatusHeader status={connectionStatus} />

      <main className="flex flex-1 overflow-hidden">
        {/* Board area */}
        <div className="flex flex-1 items-center justify-center p-8">
          <ChessBoard
            board={board}
            selectedSquare={selection.from}
            legalMoves={legalMoves}
            lastMove={lastMove}
            inCheck={gameStatus === 'check' || gameStatus === 'checkmate'}
            currentTurn={currentTurn}
            onSquareClick={selectSquare}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-stone-200 shrink-0" />

        {/* Right panel */}
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

          {/* Dev simulate panel */}
          <SimulatePanel onSimulate={receiveMoveFromBoard} />
        </div>
      </main>
    </div>
  )
}
