'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['100'] })

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
    <div className="fixed inset-0 overflow-hidden bg-[#071426]">
      {/* Radial dim overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(12,25,43,0) 0%, rgba(3,18,40,1) 100%)',
        }}
      />

      {/*
        Knight video.
        Figma desktop (1440×900): w=2277px, h=1281px, left=calc(50%+24px), top=-6.62px
        2277/1440 ≈ 158vw → scale by viewport width so it matches Figma proportions.
        Mobile/tablet use slightly larger vw ratio to maintain visual coverage.
      */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="
          absolute pointer-events-none h-auto -translate-x-1/2
          blur-[2px] opacity-50 mix-blend-color-dodge
          w-[220vw] left-[calc(50%+30px)] top-0
          md:w-[190vw] md:left-[calc(50%+40px)]
          lg:w-[158vw] lg:left-[calc(50%+24px)]
        "
      >
        <source src="/intro/piece-knight.webm" type="video/webm" />
      </video>

      {/* Content layer */}
      <div className="relative z-10 h-full">

        {/*
          Title block.
          Positions from Figma frame data:
            mobile:  calc(50% - 136px)
            tablet:  30% from top  (303px / 1024px)
            desktop: 24% from top  (216px / 900px)

          SVG widths are proportional to Figma font sizes:
            wizard.svg exported at 130px → 522px wide at desktop
            chess.svg  exported at 140px → 437px wide at desktop
            mobile scale: 80/130=0.615 wizard, 90/140=0.643 chess
            tablet scale: 100/130=0.769 wizard, 110/140=0.786 chess
        */}
        <div
          className="
            absolute left-1/2 -translate-x-1/2 flex flex-col items-center
            top-[calc(50%-136px)]
            md:top-[30%]
            lg:top-[24%]
          "
        >
          {/* WIZARD */}
          <img
            src="/intro/wizard.svg"
            alt="Wizard"
            className="
              w-[321px] mb-3
              md:w-[401px] md:mb-2
              lg:w-[522px] lg:mb-2
            "
          />

          {/* — Team DA — divider */}
          <div
            className="
              flex items-center w-full gap-6
              md:gap-16
              lg:gap-[77px]
            "
          >
            <div className="flex-1 h-px bg-white/40" />
            <span
              className={`${inter.className} text-white/80 whitespace-nowrap team-da-spacing`}
              style={{ fontWeight: 100, fontSize: '14px' }}
            >
              Team DA
            </span>
            <div className="flex-1 h-px bg-white/40" />
          </div>

          {/* CHESS */}
          <img
            src="/intro/chess.svg"
            alt="Chess"
            className="
              w-[281px] mt-3
              md:w-[343px] md:mt-2
              lg:w-[437px] lg:mt-2
            "
          />
        </div>

        {/*
          Connect button.
          mobile:  pinned bottom, full width, 20px side padding, pb-12
          tablet:  240px wide, 70% from top
          desktop: 240px wide, 74% from top
        */}
        <div
          className="
            absolute left-1/2 -translate-x-1/2
            bottom-0 pb-12 px-5 w-full flex flex-col items-center
            md:bottom-auto md:top-[70%] md:w-auto md:px-0
            lg:top-[74%]
          "
        >
          <button
            onClick={handleConnect}
            disabled={status !== 'idle'}
            className={`
              flex items-center justify-center gap-2
              w-full md:w-[240px] rounded-[8px] px-8 py-4
              text-[16px] font-medium transition-all duration-200
              ${status === 'idle'
                ? 'bg-white text-[#00357d] md:hover:bg-[#cde2ff] md:hover:font-bold'
                : status === 'connecting'
                ? 'cursor-not-allowed bg-white/80 text-[#00357d]/50'
                : 'bg-emerald-500 text-white'
              }
            `}
          >
            {status === 'idle' && 'Connect'}
            {status === 'connecting' && <><Spinner />Connecting...</>}
            {status === 'done' && '✓  Done!'}
          </button>

          <p
            className={`mt-4 text-xs text-white/40 text-center transition-opacity duration-300 ${
              status === 'idle' ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {status === 'connecting' && 'Establishing connection with the board…'}
            {status === 'done' && 'Board connected. Launching game…'}
            {status === 'idle' && ' '}
          </p>
        </div>
      </div>
    </div>
  )
}
