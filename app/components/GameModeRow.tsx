'use client'

export default function GameModeRow({
  localMode,
  onLocalModeChange,
  onResetBoard,
  isDisabled,
  online = false,
  onLeaveRoom,
  roomCode = null,
  boardConnected = false,
}: {
  localMode: boolean
  onLocalModeChange: (v: boolean) => void
  onResetBoard: () => void
  isDisabled: boolean
  online?: boolean
  onLeaveRoom?: () => void
  roomCode?: string | null
  boardConnected?: boolean
}) {
  if (online) {
    return (
      <>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Room</span>
          <span className="text-xs font-mono font-bold tracking-[0.15em] text-[#1c1917]">{roomCode}</span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
              boardConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'
            }`}
            title={boardConnected ? 'Physical board linked' : 'No physical board'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${boardConnected ? 'bg-emerald-500' : 'bg-stone-300'}`} />
            Board
          </span>
        </div>
        <button
          onClick={onLeaveRoom}
          className="text-xs px-3 py-2 rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors"
        >
          Leave Room
        </button>
      </>
    )
  }

  return (
    <>
      <span className="text-xs text-stone-500">Local Play</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onLocalModeChange(false)}
          className="text-xs px-3 py-2 rounded-md border border-[#1d4ed8] text-[#1d4ed8] bg-white hover:bg-[#f5f9ff] transition-colors"
        >
          Play Online
        </button>
        <button
          onClick={onResetBoard}
          disabled={!localMode && isDisabled}
          className="text-xs px-3 py-2 rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset Board
        </button>
      </div>
    </>
  )
}
