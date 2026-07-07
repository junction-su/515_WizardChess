'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Chess, Square, PieceSymbol, Color } from 'chess.js'
import {
  BoardPiece,
  LastMove,
  GameStatus,
  LegalMoveSquare,
  chessBoardToDisplay,
  getLegalMoves,
  getGameStatus,
  moveDescription,
} from '@/app/lib/chess'
import { useChessSocket, ServerEvent, buildFen, STARTING_BOARD } from '@/app/lib/socket'
import { useStockfish } from '@/app/lib/stockfish'
import ChessBoard from '@/app/components/ChessBoard'
import RightPanel from '@/app/components/RightPanel'
import GameModeRow from '@/app/components/GameModeRow'
import StatusHeader from '@/app/components/StatusHeader'
import AttackAnimation from '@/app/components/AttackAnimation'

export type PlayerKind = 'human' | 'ai'
export interface PlayerConfig { w: PlayerKind; b: PlayerKind }
const AI_MOVETIME_MS = 1000
const AI_WATCHDOG_MS = 6000

interface MoveSelection {
  from: Square | null
  to: Square | null
  piece: BoardPiece | null
}

interface AttackAnimState {
  id: number
  piece: PieceSymbol
  color: Color
  to: Square
}

const EMPTY_SELECTION: MoveSelection = { from: null, to: null, piece: null }
const normalizePromotion = (promotion?: PieceSymbol): 'q' | 'r' | 'b' | 'n' =>
  promotion === 'r' || promotion === 'b' || promotion === 'n' ? promotion : 'q'
const ATTACK_ANIMATION_FALLBACK_MS = 4500

function useChessGame() {
  const [initialChess] = useState(() => new Chess())
  const chessRef = useRef(initialChess)

  const [board, setBoard] = useState(() => chessBoardToDisplay(initialChess))
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w')
  const [lastMove, setLastMove] = useState<LastMove | null>(null)
  const [capturedByWhite, setCapturedByWhite] = useState<BoardPiece[]>([])
  const [capturedByBlack, setCapturedByBlack] = useState<BoardPiece[]>([])
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const [selection, setSelection] = useState<MoveSelection>(EMPTY_SELECTION)
  const [legalMoves, setLegalMoves] = useState<LegalMoveSquare[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [players, setPlayers] = useState<PlayerConfig>({ w: 'human', b: 'human' })
  const [localMode, setLocalMode] = useState(true)
  const [lobbyOpen, setLobbyOpen] = useState(true)
  const [attackAnim, setAttackAnim] = useState<AttackAnimState | null>(null)
  const nextAttackAnimIdRef = useRef(0)

  const playAttackAnimation = useCallback((piece: PieceSymbol, color: Color, to: Square) => {
    nextAttackAnimIdRef.current += 1
    setAttackAnim({ id: nextAttackAnimIdRef.current, piece, color, to })
  }, [])

  const pendingLocalMoveRef = useRef<{ from: Square; to: Square; promotion: 'q' | 'r' | 'b' | 'n' } | null>(null)
  const pendingLocalMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pendingLocalMoveTimerRef.current) clearTimeout(pendingLocalMoveTimerRef.current)
    }
  }, [])

  const applyLocalMove = useCallback((from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): boolean => {
    const chess = chessRef.current
    let result
    try { result = chess.move({ from, to, promotion }) }
    catch { result = null }
    if (!result) return false

    const moved: BoardPiece = { type: result.piece, color: result.color, square: result.to as Square }
    const captured = result.captured
      ? { type: result.captured, color: result.color === 'w' ? 'b' : 'w', square: result.to as Square } as BoardPiece
      : undefined

    const lm: LastMove = { from: result.from as Square, to: result.to as Square, san: result.san, piece: moved, captured }
    setLastMove(lm)
    if (captured) {
      if (result.color === 'w') setCapturedByWhite((p) => [...p, captured])
      else setCapturedByBlack((p) => [...p, captured])
    }
    setAnnouncement(moveDescription(lm))
    setSelection(EMPTY_SELECTION)
    setLegalMoves([])
    setBoard(chessBoardToDisplay(chess))
    setCurrentTurn(chess.turn())
    setGameStatus(getGameStatus(chess))
    return true
  }, [])

  // Play the attack animation first and apply the move when it finishes
  // (with a timer fallback in case the animation never completes).
  const deferMoveForAnimation = useCallback((from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): boolean => {
    const chess = chessRef.current
    const matchingMove = chess.moves({ square: from, verbose: true }).find((m) => m.to === to)
    const movingPiece = chess.get(from)
    if (!matchingMove?.captured || !movingPiece) return false

    pendingLocalMoveRef.current = { from, to, promotion }
    if (pendingLocalMoveTimerRef.current) clearTimeout(pendingLocalMoveTimerRef.current)
    pendingLocalMoveTimerRef.current = setTimeout(() => {
      const pending = pendingLocalMoveRef.current
      if (!pending) return
      pendingLocalMoveRef.current = null
      pendingLocalMoveTimerRef.current = null
      applyLocalMove(pending.from, pending.to, pending.promotion)
    }, ATTACK_ANIMATION_FALLBACK_MS)
    playAttackAnimation(movingPiece.type, movingPiece.color, to)
    setSelection(EMPTY_SELECTION)
    setLegalMoves([])
    return true
  }, [applyLocalMove, playAttackAnimation])

  const handleServerEvent = useCallback((e: ServerEvent) => {
    const chess = chessRef.current

    if (e.kind === 'state') {
      // Full resync replaces everything — drop any deferred move/animation.
      pendingLocalMoveRef.current = null
      if (pendingLocalMoveTimerRef.current) {
        clearTimeout(pendingLocalMoveTimerRef.current)
        pendingLocalMoveTimerRef.current = null
      }
      setAttackAnim(null)
      const wasStart = e.board64 === STARTING_BOARD
      try {
        // Prefer the server's full FEN (castling/en-passant exact); fall back
        // to rebuilding from the 64-char board for older senders.
        chess.load(e.fen ?? buildFen(e.board64, e.turn))
      } catch {
        chessRef.current = new Chess()
      }
      setBoard(chessBoardToDisplay(chessRef.current))
      setCurrentTurn(chessRef.current.turn())
      setGameStatus(getGameStatus(chessRef.current))
      setSelection(EMPTY_SELECTION)
      setLegalMoves([])
      if (wasStart) {
        setLastMove(null)
        setCapturedByWhite([])
        setCapturedByBlack([])
        setAnnouncement('Board reset to starting position.')
      }
      return
    }

    if (e.kind === 'done') {
      // Captures get the attack animation first; the move lands on the board
      // when it finishes (same flow as local mode).
      if (deferMoveForAnimation(e.from, e.to)) return

      let result
      try {
        result = chess.move({ from: e.from, to: e.to, promotion: 'q' })
      } catch {
        result = null
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
        if (result.color === 'w') setCapturedByWhite((p) => [...p, captured])
        else setCapturedByBlack((p) => [...p, captured])
      }
      setAnnouncement(moveDescription(lm))
      setSelection(EMPTY_SELECTION)
      setLegalMoves([])
      setBoard(chessBoardToDisplay(chess))
      setCurrentTurn(chess.turn())
      setGameStatus(getGameStatus(chess))
      return
    }

    if (e.kind === 'turn') {
      setCurrentTurn(e.turn)
      return
    }

    if (e.kind === 'illegal') {
      setSelection(EMPTY_SELECTION)
      setLegalMoves([])
      setAnnouncement(`Illegal move: ${e.reason}`)
      return
    }

    if (e.kind === 'room') {
      // Entered a room (create/join/auto-rejoin) — switch to online play.
      setLocalMode(false)
      setLobbyOpen(false)
      setAnnouncement(
        e.color
          ? `Joined room ${e.code} as ${e.color === 'w' ? 'White' : 'Black'}.`
          : `Watching room ${e.code} as a spectator.`
      )
      return
    }

    if (e.kind === 'peer') {
      setAnnouncement(e.connected ? 'Opponent connected.' : 'Opponent disconnected.')
      return
    }

    if (e.kind === 'error') {
      setAnnouncement(e.reason)
      return
    }
  }, [deferMoveForAnimation])

  const socket = useChessSocket(handleServerEvent)
  const {
    status: connectionStatus, pending, illegalReason,
    roomCode, myColor, peerConnected, createRoom, joinRoom, leaveRoom,
    sendMove, sendReset, clearIllegal,
  } = socket

  // Auto-join a room from a shared link (/game?room=CODE) once connected.
  const urlJoinDoneRef = useRef(false)
  useEffect(() => {
    if (urlJoinDoneRef.current) return
    if (connectionStatus !== 'connected') return
    const code = new URLSearchParams(window.location.search).get('room')
    urlJoinDoneRef.current = true
    if (code && !roomCode) joinRoom(code)
  }, [connectionStatus, roomCode, joinRoom])

  const engine = useStockfish()
  const engineReady = engine.ready
  const getBestMove = engine.getBestMove

  const localMove = useCallback((from: Square, to: Square, skipAnim = false, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): boolean => {
    if (!skipAnim && deferMoveForAnimation(from, to, promotion)) return true
    return applyLocalMove(from, to, promotion)
  }, [applyLocalMove, deferMoveForAnimation])

  const aiThinkingRef = useRef(false)
  const aiRequestIdRef = useRef(0)
  useEffect(() => {
    if (aiThinkingRef.current) return
    // Online rooms are human-vs-human; the seat's color is fixed server-side.
    if (!localMode && roomCode) return
    if (players[currentTurn] !== 'ai') return
    if (attackAnim || pendingLocalMoveRef.current) return
    if (gameStatus !== 'playing' && gameStatus !== 'check') return
    if (!localMode && connectionStatus !== 'connected') return
    if (!localMode && pending) return
    aiThinkingRef.current = true
    const requestId = ++aiRequestIdRef.current
    const fen = chessRef.current.fen()
    const turnAtRequest = currentTurn
    const playFallbackMove = () => {
      const fallbackMove = chessRef.current.moves({ verbose: true })[0]
      if (!fallbackMove) {
        setAnnouncement('AI did not find a legal move.')
        return
      }

      if (localMode) {
        localMove(fallbackMove.from as Square, fallbackMove.to as Square, false, normalizePromotion(fallbackMove.promotion))
      } else if (sendMove(fallbackMove.from as Square, fallbackMove.to as Square)) {
        setAnnouncement(`AI fallback move: ${fallbackMove.from} → ${fallbackMove.to}.`)
      } else {
        setAnnouncement('AI fallback move could not be sent.')
        return
      }

      setAnnouncement(`AI fallback move: ${fallbackMove.from} → ${fallbackMove.to}.`)
    }
    const watchdog = setTimeout(() => {
      if (aiRequestIdRef.current !== requestId) return
      if (chessRef.current.turn() !== turnAtRequest) return

      aiRequestIdRef.current += 1
      aiThinkingRef.current = false
      playFallbackMove()
    }, AI_WATCHDOG_MS)

    getBestMove(fen, AI_MOVETIME_MS).then((mv) => {
      clearTimeout(watchdog)
      if (aiRequestIdRef.current !== requestId) return
      aiThinkingRef.current = false
      if (chessRef.current.turn() !== turnAtRequest) return
      if (!mv) {
        playFallbackMove()
        return
      }
      if (localMode) {
        const ok = localMove(mv.from as Square, mv.to as Square, false, mv.promotion ?? 'q')
        if (!ok) {
          const fallbackMove = chessRef.current.moves({ verbose: true })[0]
          if (fallbackMove) {
            localMove(fallbackMove.from as Square, fallbackMove.to as Square, false, normalizePromotion(fallbackMove.promotion))
            setAnnouncement(`AI fallback move: ${fallbackMove.from} → ${fallbackMove.to}.`)
          } else {
            setAnnouncement(`AI move failed: ${mv.from} → ${mv.to}.`)
          }
        }
      } else {
        const ok = sendMove(mv.from, mv.to)
        if (ok) setAnnouncement(`AI move: ${mv.from} → ${mv.to}.`)
        else {
          const fallbackMove = chessRef.current.moves({ verbose: true })[0]
          if (fallbackMove && sendMove(fallbackMove.from as Square, fallbackMove.to as Square)) {
            setAnnouncement(`AI fallback move: ${fallbackMove.from} → ${fallbackMove.to}.`)
          } else {
            setAnnouncement(`AI move failed: ${mv.from} → ${mv.to}.`)
          }
        }
      }
    }).catch(() => {
      clearTimeout(watchdog)
      if (aiRequestIdRef.current !== requestId) return
      aiThinkingRef.current = false
      if (chessRef.current.turn() === turnAtRequest) playFallbackMove()
    })
    return () => {
      clearTimeout(watchdog)
      if (aiRequestIdRef.current === requestId) {
        aiRequestIdRef.current += 1
        aiThinkingRef.current = false
      }
    }
  }, [players, currentTurn, gameStatus, connectionStatus, pending, attackAnim, getBestMove, sendMove, localMode, localMove, roomCode])

  const selectSquare = useCallback((square: Square, piece: BoardPiece | null) => {
    const chess = chessRef.current
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw') return
    if (pendingLocalMoveRef.current) return // attack animation in flight
    if (!localMode && connectionStatus === 'disconnected') return
    if (!localMode && pending) return
    // Online: you can only move on your own turn (spectators never move).
    if (!localMode && roomCode && myColor !== chess.turn()) return
    if (players[chess.turn()] === 'ai') return

    if (illegalReason) clearIllegal()

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
  }, [gameStatus, connectionStatus, pending, illegalReason, clearIllegal, players, localMode, roomCode, myColor])

  const flushPendingLocalMove = useCallback(() => {
    const pending = pendingLocalMoveRef.current
    if (!pending) return
    if (pendingLocalMoveTimerRef.current) {
      clearTimeout(pendingLocalMoveTimerRef.current)
      pendingLocalMoveTimerRef.current = null
    }
    pendingLocalMoveRef.current = null
    applyLocalMove(pending.from, pending.to, pending.promotion)
  }, [applyLocalMove])

  const confirmMove = useCallback(() => {
    if (!selection.from || !selection.to || !selection.piece) return
    if (localMode) {
      const chess = chessRef.current
      const matchingMove = chess.moves({ square: selection.from, verbose: true }).find(m => m.to === selection.to)
      localMove(selection.from, selection.to, false, normalizePromotion(matchingMove?.promotion))
      return
    }
    const ok = sendMove(selection.from, selection.to)
    if (!ok) {
      setAnnouncement('Not connected. Move not sent.')
      return
    }
    setAnnouncement(`Move sent: ${selection.from} → ${selection.to}.`)
  }, [selection, sendMove, localMode, localMove])

  const cancelSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION)
    setLegalMoves([])
    if (illegalReason) clearIllegal()
  }, [illegalReason, clearIllegal])

  const resetBoard = useCallback(() => {
    if (localMode) {
      chessRef.current = new Chess()
      setBoard(chessBoardToDisplay(chessRef.current))
      setCurrentTurn('w')
      setLastMove(null)
      setCapturedByWhite([])
      setCapturedByBlack([])
      setGameStatus('playing')
      setSelection(EMPTY_SELECTION)
      setLegalMoves([])
      setAttackAnim(null)
      pendingLocalMoveRef.current = null
      if (pendingLocalMoveTimerRef.current) {
        clearTimeout(pendingLocalMoveTimerRef.current)
        pendingLocalMoveTimerRef.current = null
      }
      setAnnouncement('Board reset.')
      return
    }
    setAnnouncement('Reset requested.')
    sendReset()
  }, [sendReset, localMode])

  // Game Mode toggle: local ⇆ online. Going local leaves the room; going
  // online without a room opens the lobby to create/join one.
  const changeMode = useCallback((local: boolean) => {
    if (local) {
      leaveRoom()
      setLocalMode(true)
      setLobbyOpen(false)
    } else {
      setLocalMode(false)
      if (!roomCode) setLobbyOpen(true)
    }
  }, [leaveRoom, roomCode])

  return {
    board, currentTurn, lastMove, capturedByWhite, capturedByBlack,
    gameStatus, selection, legalMoves, announcement, connectionStatus,
    pending, illegalReason,
    players, setPlayers, engineReady,
    localMode, changeMode, attackAnim, setAttackAnim, flushPendingLocalMove,
    lobbyOpen, setLobbyOpen, roomCode, myColor, peerConnected, createRoom, joinRoom,
    selectSquare, confirmMove, cancelSelection, resetBoard,
  }
}

function LobbyOverlay({
  connectionStatus,
  onLocalPlay,
  onCreateRoom,
  onJoinRoom,
}: {
  connectionStatus: 'connected' | 'disconnected' | 'syncing'
  onLocalPlay: () => void
  onCreateRoom: () => void
  onJoinRoom: (code: string) => void
}) {
  const [joinCode, setJoinCode] = useState('')
  const online = connectionStatus === 'connected'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-40 p-4"
      style={{ background: 'rgba(237, 239, 243, 0.76)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Choose game mode"
    >
      <div className="bg-white border border-[#d8dde7] rounded-2xl shadow-2xl px-8 py-8 flex flex-col gap-5 w-full max-w-[360px]">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#1c1917] tracking-tight">Play Chess</div>
          <div className="text-sm text-stone-500 mt-1">Choose how you want to play</div>
        </div>

        <button
          onClick={onLocalPlay}
          className="h-[48px] rounded-xl border border-[#c4c7ce] text-[#1c1917] font-semibold text-sm hover:bg-stone-50 transition-colors"
          autoFocus
        >
          Local Play
        </button>

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400 uppercase tracking-widest">Online</span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        <button
          onClick={onCreateRoom}
          disabled={!online}
          className="h-[48px] rounded-xl bg-[#1d4ed8] text-white font-semibold text-sm hover:bg-[#1e40af] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create Room
        </button>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CODE"
            maxLength={4}
            aria-label="Room code"
            className="flex-1 min-w-0 h-[48px] rounded-xl border border-[#c4c7ce] px-4 text-center font-mono text-lg tracking-[0.3em] uppercase placeholder:text-stone-300 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#4091ff]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && joinCode.length === 4 && online) onJoinRoom(joinCode)
            }}
          />
          <button
            onClick={() => onJoinRoom(joinCode)}
            disabled={!online || joinCode.length !== 4}
            className="h-[48px] px-5 rounded-xl border border-[#1d4ed8] text-[#1d4ed8] font-semibold text-sm hover:bg-[#f5f9ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join
          </button>
        </div>

        {!online && (
          <div className="text-xs text-stone-400 text-center">
            Connecting to server… online play will enable shortly.
          </div>
        )}
      </div>
    </div>
  )
}

function GameOverOverlay({
  status,
  lastMove,
  onReset,
}: {
  status: GameStatus
  lastMove: LastMove | null
  onReset: () => void
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
      className="fixed inset-0 flex items-center justify-center z-30"
      style={{ background: 'rgba(237, 239, 243, 0.76)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
    >
      <div className="bg-white border border-[#d8dde7] rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 min-w-[260px]">
        <div className="text-4xl font-bold text-[#1c1917] tracking-tight">
          {titles[status]}
        </div>
        <div className="text-stone-500 text-sm text-center">
          {subtitles[status]}
        </div>
        <button
          onClick={onReset}
          className="mt-2 px-8 py-3 rounded-xl bg-[#1d4ed8] text-white font-semibold text-sm hover:bg-[#1e40af] active:bg-[#1e3a8a] transition-colors shadow-sm"
          autoFocus
        >
          Reset Board
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const {
    board, currentTurn, lastMove, capturedByWhite, capturedByBlack,
    gameStatus, selection, legalMoves, announcement, connectionStatus,
    pending, illegalReason,
    players, setPlayers, engineReady,
    localMode, changeMode, attackAnim, setAttackAnim, flushPendingLocalMove,
    lobbyOpen, setLobbyOpen, roomCode, myColor, peerConnected, createRoom, joinRoom,
    selectSquare, confirmMove, cancelSelection, resetBoard,
  } = useChessGame()

  const online = !localMode && !!roomCode

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-[#edeff3]">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <StatusHeader status={connectionStatus} />

      {lobbyOpen && (
        <LobbyOverlay
          connectionStatus={connectionStatus}
          onLocalPlay={() => changeMode(true)}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
        />
      )}

      <main className="flex flex-col md:flex-row md:flex-1 md:overflow-hidden">
        {/* Board area */}
        <div className="relative flex items-center justify-center p-3 sm:p-6 md:flex-1 md:p-4 lg:p-6 xl:p-8 overflow-hidden">
          <ChessBoard
            board={board}
            selectedSquare={selection.from}
            destinationSquare={selection.to}
            impactSquare={attackAnim?.to ?? null}
            legalMoves={legalMoves}
            lastMove={lastMove}
            inCheck={gameStatus === 'check' || gameStatus === 'checkmate'}
            currentTurn={currentTurn}
            onSquareClick={selectSquare}
            flipped={online && myColor === 'b'}
          />
          {pending && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white/95 border border-stone-200 shadow rounded-full px-4 py-1.5 text-xs font-medium text-stone-700">
              {pending.phase === 'sending'
                ? `Sending ${pending.from.toUpperCase()} → ${pending.to.toUpperCase()}…`
                : `Robot moving ${pending.from.toUpperCase()} → ${pending.to.toUpperCase()}…`}
            </div>
          )}
          <GameOverOverlay
            status={gameStatus}
            lastMove={lastMove}
            onReset={resetBoard}
          />
          {attackAnim && (
            <AttackAnimation
              key={attackAnim.id}
              piece={attackAnim.piece}
              color={attackAnim.color}
              onComplete={() => {
                setAttackAnim(null)
                flushPendingLocalMove()
              }}
            />
          )}
        </div>

        <div className="h-px md:hidden bg-stone-200 shrink-0" />

        {/* Right panel */}
        <div className="w-full md:w-80 shrink-0 bg-white flex flex-col md:rounded-[32px] md:border md:border-[#e0e4ec] md:my-[22px] md:mr-[22px] md:overflow-hidden">
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
            pending={!!pending}
            illegalReason={illegalReason}
            players={players}
            onPlayersChange={setPlayers}
            engineReady={engineReady}
            localMode={localMode}
            onLocalModeChange={changeMode}
            onResetBoard={resetBoard}
            roomCode={online ? roomCode : null}
            myColor={myColor}
            peerConnected={peerConnected}
          />

          {/* Game Mode + Reset — desktop/tablet only; mobile renders this
              inside RightPanel's scrollable column instead (see RightPanel). */}
          <div className="hidden md:flex px-4 pt-3 pb-3 items-center justify-between border-t border-[#e0e4ec]">
            <GameModeRow
              localMode={localMode}
              onLocalModeChange={changeMode}
              onResetBoard={resetBoard}
              isDisabled={connectionStatus === 'disconnected'}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
