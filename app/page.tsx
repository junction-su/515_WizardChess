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
    // fixed inset-0 ensures the gradient covers the entire viewport
    // regardless of the body's white background in globals.css
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #061E3F 27.57%, #0F4FA5 145.98%)' }}
    >
      {/* ── Background texture overlays (place files in public/intro/) ── */}
      {/* bg-bottom.png : chess-pattern texture, mix-blend-multiply, opacity 40% */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/intro/bg-bottom.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 w-[88%] h-auto mix-blend-overlay opacity-40"
      />
      {/* bg-topleft.png : top-left vignette overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/intro/bg-topleft.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 w-[46%] h-auto mix-blend-overlay opacity-60"
      />

      {/* ── Left: knight webm ── */}
      {/* Figma: container left=-555px (of 1440), height=1073, rotated 9.28deg */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: '-38%',
          bottom: '-8%',
          transform: 'rotate(9.28deg)',
          transformOrigin: 'bottom center',
        }}
      >
        <video
          autoPlay loop muted playsInline
          style={{ height: 'clamp(50vh, 56vw, 90vh)' }}
          className="w-auto object-contain"
        >
          <source src="/intro/piece-knight.webm" type="video/webm" />
          <source src="/intro/piece-knight.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── Right: queen webm (flipped vertically, bleeds off top-right) ── */}
      {/* Figma: container left=652px (of 1440), top=-177px, scaleY(-1), rotate 2.2deg */}
      <div
        className="pointer-events-none absolute"
        style={{
          right: '-30%',
          top: '-18%',
          transform: 'rotate(2.2deg) scaleY(-1)',
          transformOrigin: 'center',
        }}
      >
        <video
          autoPlay loop muted playsInline
          style={{ height: 'clamp(42vh, 49vw, 78vh)' }}
          className="w-auto object-contain"
        >
          <source src="/intro/piece-queen.webm" type="video/webm" />
          <source src="/intro/piece-queen.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── Center content ── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center">

        {/* Title block with magic-effect behind */}
        <div className="relative flex flex-col items-center">

          {/* Magic swirl effect — place magic-effect.png in public/intro/ */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/intro/magic_effect.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] object-contain opacity-70"
          />

          {/* Team DA */}
          <p className="relative text-[16px] font-thin text-white/70 mb-1">
            Team DA
          </p>

          {/* Wizarding Chess */}
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
              ? 'border border-[#004cb2] bg-[#071c38] text-white hover:bg-white hover:text-[#013c8c] hover:border-white'
              : status === 'connecting'
              ? 'cursor-not-allowed border border-[#004cb2] bg-[#071c38] text-white/60'
              : 'border border-emerald-500 bg-emerald-600 text-white'
            }
          `}
        >
          {status === 'idle' && 'Connect'}
          {status === 'connecting' && <><Spinner />Connecting...</>}
          {status === 'done' && '✓  Done!'}
        </button>

        {/* Status hint */}
        <p className={`mt-4 text-xs text-white/40 transition-opacity duration-300 ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
          {status === 'connecting' && 'Establishing connection with the board…'}
          {status === 'done' && 'Board connected. Launching game…'}
          {status === 'idle' && ' '}
        </p>
      </div>
    </div>
  )
}
