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
        Knight video — dimensions from Figma per breakpoint:
          mobile  390×844:  h=941px  → h-[112vh]
          tablet  768×1024: h=1186px → h-[116vh]
          desktop 1440×900: h=1281px → h-[142vh]
        width is auto (follows aspect ratio). top-0 per Figma for all breakpoints.
      */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="
          absolute pointer-events-none w-auto -translate-x-1/2
          blur-[2px] opacity-50 mix-blend-color-dodge
          h-[112vh] left-[calc(50%+55px)] top-0
          md:h-[116vh] md:left-[calc(50%+63px)]
          lg:h-[142vh] lg:left-[calc(50%+24px)]
        "
      >
        <source src="/intro/piece-knight.webm" type="video/webm" />
      </video>

      {/* Content layer */}
      <div className="relative z-10 h-full">

        {/*
          Title block.
          Container is full-width with px-5 on mobile so SVGs fill the screen.
          SVGs have built-in whitespace (~42px bottom on wizard, ~36px top on chess
          at desktop size) — negative margins cancel that whitespace to tighten the gap.

          Positions from Figma:
            mobile:  top calc(50% - 136px)
            tablet:  top 30%  (303px / 1024px)
            desktop: top 24%  (216px / 900px)

          SVG widths at each breakpoint:
            wizard.svg: mobile w-full (~350px), tablet 401px, desktop 522px
            chess.svg:  mobile w-full (~350px), tablet 343px, desktop 437px
        */}
        <div
          className="
            absolute left-1/2 -translate-x-1/2 flex flex-col items-center
            w-full px-5
            top-[calc(50%-136px)]
            md:w-auto md:px-0 md:top-[30%]
            lg:top-[24%]
          "
        >
          <img
            src="/intro/wizard.svg"
            alt="Wizard"
            className="
              w-full mb-[-26px]
              md:w-[401px] md:mb-[-30px]
              lg:w-[522px] lg:mb-[-38px]
            "
          />

          {/* — Team DA — divider */}
          <div className="flex items-center w-full gap-6 md:gap-16 lg:gap-[77px]">
            <div className="flex-1 h-px bg-white/40" />
            <span
              className={`${inter.className} text-white/80 whitespace-nowrap team-da-spacing`}
              style={{ fontWeight: 100, fontSize: '14px' }}
            >
              Team DA
            </span>
            <div className="flex-1 h-px bg-white/40" />
          </div>

          <img
            src="/intro/chess.svg"
            alt="Chess"
            className="
              w-full mt-[-22px]
              md:w-[343px] md:mt-[-26px]
              lg:w-[437px] lg:mt-[-32px]
            "
          />
        </div>

        {/*
          Connect button.
          mobile:  pinned bottom, full width, pb-[24px] per Figma
          tablet:  240px wide, top 69.6% (712.5px / 1024px)
          desktop: 240px wide, top 73.9% (665px / 900px)
        */}
        <div
          className="
            absolute left-1/2 -translate-x-1/2
            bottom-0 pb-6 px-5 w-full flex flex-col items-center
            md:bottom-auto md:top-[69.6%] md:w-auto md:px-0
            lg:top-[73.9%]
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
