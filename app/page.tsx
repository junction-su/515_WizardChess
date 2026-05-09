'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cinzel } from 'next/font/google'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['700'] })

type ConnectStatus = 'idle' | 'connecting' | 'done'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function IntroPage() {
  const router = useRouter()
  const [status, setStatus] = useState<ConnectStatus>('idle')

  const handleConnect = () => {
    if (status !== 'idle') return
    setStatus('connecting')
    setTimeout(() => setStatus('done'), 2200)
    setTimeout(() => router.push('/game'), 3000)
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #061e3f 0%, #0f4fa5 100%)' }}
    >
      {/* Background chess-pattern texture (subtle repeat) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply"
        style={{
          backgroundImage: `url('/pieces/King.svg'), url('/pieces/Queen.svg'), url('/pieces/Rook.svg')`,
          backgroundSize: '220px, 180px, 160px',
          backgroundPosition: '5% 20%, 85% 70%, 60% 10%',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(10)',
        }}
      />

      {/* Left knight — 3D webm (rotated, bleeds off left edge) */}
      <div
        className="pointer-events-none absolute bottom-0 left-[-8%]"
        style={{ transform: 'rotate(9.28deg)', transformOrigin: 'bottom left' }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-[88vh] max-h-[760px] w-auto object-contain"
        >
          <source src="/intro/piece-knight.webm" type="video/webm" />
          <source src="/intro/piece-knight.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Right queen — 3D webm (inverted, rotated, bleeds off top-right) */}
      <div
        className="pointer-events-none absolute right-[-6%] top-[-18%]"
        style={{ transform: 'rotate(2.2deg) scaleY(-1)', transformOrigin: 'top right' }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-[76vh] max-h-[660px] w-auto object-contain"
        >
          <source src="/intro/piece-queen.webm" type="video/webm" />
          <source src="/intro/piece-queen.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">

        {/* Title block */}
        <div className="relative flex flex-col items-center">
          {/* Magic effect swirl — behind title */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70 w-[700px] h-[350px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/intro/magic-effect.svg" alt="" className="size-full object-cover" />
          </div>

          {/* Team DA label */}
          <p className="relative mb-1 text-[16px] font-thin tracking-[0.18em] text-white/70">
            Team DA
          </p>

          {/* Main title */}
          <h1
            className={`${cinzel.className} relative text-center text-[100px] font-bold leading-[1.05] text-white`}
            style={{ textShadow: '0px 0px 5.5px rgba(6, 26, 51, 0.38)' }}
          >
            Wizarding
            <br />
            Chess
          </h1>
        </div>

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={status !== 'idle'}
          className={`
            mt-10 flex w-[200px] items-center justify-center gap-2
            rounded-[8px] px-[16px] py-[14px]
            text-[16px] font-medium transition-all duration-200
            ${status === 'idle'
              ? 'border border-[#004cb2] bg-[#071c38] text-white hover:border-white hover:bg-white hover:text-[#013c8c]'
              : status === 'connecting'
              ? 'cursor-not-allowed border border-[#004cb2] bg-[#071c38] text-white/60'
              : 'border border-emerald-500 bg-emerald-600 text-white'
            }
          `}
        >
          {status === 'idle' && 'Connect'}
          {status === 'connecting' && (
            <>
              <Spinner />
              Connecting...
            </>
          )}
          {status === 'done' && '✓  Done!'}
        </button>

        {/* Status message */}
        <p
          className={`mt-4 text-xs text-white/40 transition-opacity duration-300 ${
            status === 'idle' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {status === 'connecting' && 'Establishing connection with the board…'}
          {status === 'done' && 'Board connected. Launching game…'}
          {status === 'idle' && ' '}
        </p>
      </div>
    </div>
  )
}
