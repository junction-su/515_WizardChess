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
  onClaimDevice,
  claimError = null,
}: {
  localMode: boolean
  onLocalModeChange: (v: boolean) => void
  onResetBoard: () => void
  isDisabled: boolean
  online?: boolean
  onLeaveRoom?: () => void
  roomCode?: string | null
  boardConnected?: boolean
  onClaimDevice?: () => void
  claimError?: string | null
}) {
  if (online) {
    return (
      <>
        <div className="flex items-center gap-2 relative">
          <span className="text-xs text-stone-500">Room</span>
          <span className="text-xs font-mono font-bold tracking-[0.15em] text-[#1c1917]">{roomCode}</span>
          {boardConnected ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
              title="Physical board linked"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Board
            </span>
          ) : (
            <button
              onClick={onClaimDevice}
              className="text-[11px] px-2 py-0.5 rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
              title="Link a physical board that's powered on and waiting to be claimed"
            >
              Link board
            </button>
          )}
          {claimError && (
            <span className="absolute top-full left-0 mt-1 text-[11px] text-red-500 whitespace-nowrap">
              {claimError}
            </span>
          )}
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
