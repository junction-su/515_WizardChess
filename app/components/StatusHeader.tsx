import { GameState } from '@/app/lib/chess'

const statusConfig = {
  connected: { dot: 'bg-green-500', label: 'Connected' },
  disconnected: { dot: 'bg-red-500', label: 'Disconnected' },
  syncing: { dot: 'bg-yellow-400 animate-pulse', label: 'Syncing…' },
}

export default function StatusHeader({ status }: { status: GameState['connectionStatus'] }) {
  const { dot, label } = statusConfig[status]
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-white">
      <div className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 45 45" className="shrink-0">
          <g fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
            <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0l2-12.5c0-2.5-2.5-4-4-4-3 0-5 3.5-7 3.5s-4-3.5-7-3.5c-1.5 0-4 1.5-4 4L11.5 37z" />
            <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0" />
          </g>
        </svg>
        <span className="font-semibold text-stone-800 tracking-tight text-lg">Wizarding Chess</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-stone-600">
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
        <span>{label}</span>
      </div>
    </header>
  )
}
