import { Cinzel } from 'next/font/google'
import { ConnectionStatus } from '@/app/lib/chess'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['700'] })

// Labeled "Server" explicitly — this is the browser's connection to the
// broker, not the physical board (that status lives in the room's own
// "Board" chip, since a board is only relevant once you're in a room).
const statusConfig: Record<ConnectionStatus, { dot: string; label: string }> = {
  connected: { dot: 'bg-green-500', label: 'Server Connected' },
  disconnected: { dot: 'bg-red-500', label: 'Server Offline' },
  syncing: { dot: 'bg-yellow-400 animate-pulse', label: 'Connecting…' },
}

export default function StatusHeader({ status, showStatus = true }: { status: ConnectionStatus; showStatus?: boolean }) {
  const { dot, label } = statusConfig[status]
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#edeff3]">
      <div className="flex items-center gap-0">
        <img
          src="/pieces/header-knight.svg"
          alt=""
          aria-hidden="true"
          className="shrink-0 h-[34px] w-auto"
        />
        <span className={`${cinzel.className} font-bold text-[#1c1917] text-[16px] whitespace-nowrap`}>
          Wizard Chess
        </span>
      </div>
      {showStatus && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
          <span>{label}</span>
        </div>
      )}
    </header>
  )
}
