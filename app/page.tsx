'use client'

import type { CSSProperties } from 'react'
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

const titleStroke: CSSProperties = {
  WebkitTextStroke: '1.5px rgba(200, 215, 240, 0.70)',
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
      {/* Radial dim overlay — dark edges, transparent center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(12,25,43,0) 0%, rgba(3,18,40,1) 100%)',
        }}
      />

      {/*
        Knight background video
        Sizing from Figma frames:
          mobile  (390×844):  h≈112vh, centered with slight right+down offset
          tablet  (768×1024): h≈116vh, centered with larger right+down offset
          desktop (1440×900): h≈142vh, pinned near top with slight right offset
      */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="
          absolute pointer-events-none w-auto
          blur-[2px] opacity-50 mix-blend-color-dodge
          h-[112vh] left-[calc(50%+55px)] top-[calc(50%+49px)] -translate-x-1/2 -translate-y-1/2
          md:h-[116vh] md:left-[calc(50%+63px)] md:top-[calc(50%+81px)]
          lg:h-[142vh] lg:left-[calc(50%+24px)] lg:top-[-7px] lg:translate-y-0
        "
      >
        <source src="/intro/piece-knight.webm" type="video/webm" />
      </video>

      {/* Content layer */}
      <div className="relative z-10 h-full">

        {/* Title block
            mobile:  vertically centered at 50%−42px
            tablet:  top edge at 30% (≈303px/1024px)
            desktop: top edge at 24% (≈216px/900px)
        */}
        <div
          className="
            absolute left-1/2 -translate-x-1/2 flex flex-col items-center
            top-[calc(50%-42px)] -translate-y-1/2
            md:top-[30%] md:translate-y-0
            lg:top-[24%]
          "
        >
          {/* WIZARD */}
          <p
            className={`
              ${cinzel.className} font-bold leading-none text-transparent text-center whitespace-nowrap
              text-[80px] mb-[-2px]
              md:text-[100px] md:mb-[-10px]
              lg:text-[130px] lg:mb-[-16px]
            `}
            style={titleStroke}
          >
            Wizard
          </p>

          {/* — Team DA — divider */}
          <div
            className="
              flex items-center w-full
              h-[17px] mb-[-2px] gap-6
              md:h-[18px] md:mb-[-10px] md:gap-16
              lg:h-[20px] lg:mb-[-16px] lg:gap-[77px]
            "
          >
            <div className="flex-1 h-px bg-white/40" />
            <span
              className="
                text-white/80 font-thin whitespace-nowrap
                text-[14px] tracking-[15.82px]
                md:tracking-[26.46px]
                lg:text-[16px] lg:tracking-[30.24px]
              "
            >
              Team DA
            </span>
            <div className="flex-1 h-px bg-white/40" />
          </div>

          {/* CHESS */}
          <p
            className={`
              ${cinzel.className} font-bold leading-none text-transparent text-center whitespace-nowrap
              text-[90px]
              md:text-[110px]
              lg:text-[140px]
            `}
            style={titleStroke}
          >
            Chess
          </p>
        </div>

        {/* Connect button
            mobile:  pinned to bottom, full width (minus 20px side padding), pb-12
            tablet:  centered, fixed width 240px, at ~70% from top
            desktop: centered, fixed width 240px, at ~74% from top
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
            {status === 'idle' && ' '}
          </p>
        </div>
      </div>
    </div>
  )
}
