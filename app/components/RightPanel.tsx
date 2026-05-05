'use client'

import { Piece, GameState, pieceLabel, squareLabel } from '@/app/lib/chess'

import ChessPiece from './ChessPiece'

interface MoveSelection {
  from: { row: number; col: number } | null
  to: { row: number; col: number } | null
  piece: Piece | null
}

interface RightPanelProps {
  gameState: GameState
  selection: MoveSelection
  onConfirm: () => void
  onCancel: () => void
  disabled: boolean
}

function CapturedRow({ pieces, label }: { pieces: Piece[]; label: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-stone-400 mb-1">{label}</div>
      <div className="flex flex-wrap gap-0.5 min-h-[28px]">
        {pieces.length === 0 ? (
          <span className="text-stone-400 text-sm">—</span>
        ) : (
          pieces.map((p, i) => (
            <ChessPiece key={i} type={p.type} color={p.color} size={24} />
          ))
        )}
      </div>
    </div>
  )
}

export default function RightPanel({
  gameState,
  selection,
  onConfirm,
  onCancel,
  disabled,
}: RightPanelProps) {
  const { currentTurn, lastMove, capturedByWhite, capturedByBlack } = gameState

  const fromLabel = selection.from
    ? squareLabel(selection.from.col, selection.from.row)
    : null
  const toLabel = selection.to
    ? squareLabel(selection.to.col, selection.to.row)
    : null

  const selectionText =
    selection.piece && fromLabel
      ? `${pieceLabel(selection.piece)} ${fromLabel}${toLabel ? ` → ${toLabel}` : ''}`
      : null

  const canConfirm = !!(selection.from && selection.to && selection.piece)

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Turn */}
      <section>
        <div className="text-xs uppercase tracking-widest text-stone-400 mb-2">Current Turn</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-full border-2 ${
              currentTurn === 'w'
                ? 'bg-white border-stone-400'
                : 'bg-stone-800 border-stone-600'
            }`}
          />
          <span className="font-medium text-stone-800">
            {currentTurn === 'w' ? "White's turn" : "Black's turn"}
          </span>
        </div>
      </section>

      <div className="border-t border-stone-100" />

      {/* Last Move */}
      <section>
        <div className="text-xs uppercase tracking-widest text-stone-400 mb-2">Last Move</div>
        {lastMove ? (
          <div>
            <div className="text-xl font-bold text-stone-800 tracking-tight font-mono">
              {squareLabel(lastMove.from.charCodeAt(0) - 97, parseInt(lastMove.from[1]) - 1)} →{' '}
              {squareLabel(lastMove.to.charCodeAt(0) - 97, parseInt(lastMove.to[1]) - 1)}
            </div>
            <div className="text-sm text-stone-500 mt-1">
              {pieceLabel(lastMove.piece)} moved to {lastMove.to}
            </div>
          </div>
        ) : (
          <span className="text-stone-400 text-sm">No moves yet</span>
        )}
      </section>

      <div className="border-t border-stone-100" />

      {/* Captured */}
      <section className="flex flex-col gap-3">
        <div className="text-xs uppercase tracking-widest text-stone-400">Captured Pieces</div>
        <CapturedRow pieces={capturedByWhite} label="Captured by White" />
        <CapturedRow pieces={capturedByBlack} label="Captured by Black" />
      </section>

      <div className="border-t border-stone-100" />

      {/* Move Control */}
      <section className="flex flex-col gap-4">
        <div className="text-xs uppercase tracking-widest text-stone-400">Move Control</div>

        {disabled && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Board not connected. Reconnect to send moves.
          </div>
        )}

        <div className="bg-stone-50 rounded-lg px-4 py-3 text-sm text-stone-700 min-h-[48px] flex items-center">
          {selectionText ? (
            <span>
              <span className="font-medium">Selected:</span>{' '}
              <span className="font-mono">{selectionText}</span>
            </span>
          ) : (
            <span className="text-stone-400">Click a piece to select it</span>
          )}
        </div>

        {!selection.from && (
          <p className="text-xs text-stone-400">
            Select a piece on the board, then click the destination square.
          </p>
        )}
        {selection.from && !selection.to && (
          <p className="text-xs text-stone-500">Now click a destination square.</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={!canConfirm || disabled}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors
              bg-stone-800 text-white
              hover:bg-stone-700
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Confirm Move
          </button>
          <button
            onClick={onCancel}
            disabled={!selection.from}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-stone-300 text-stone-700 transition-colors
              hover:bg-stone-50
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  )
}
