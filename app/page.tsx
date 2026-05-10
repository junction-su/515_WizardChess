'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cinzel, Inter } from 'next/font/google'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['700'] })
// Inter weight 100 = Thin, closest to Pretendard Thin used in Figma
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

// 0.75px keeps the outline thin and clean on Cinzel Bold's complex serif shapes
const titleStroke: CSSProperties = {
  WebkitTextFillColor: 'transparent',
  WebkitTextStroke: '0.75px rgba(180, 200, 235, 0.75)',
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
      {/* Radial dim overlay — transparent center, dark edges (Figma vignette) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(12,25,43,0) 0%, rgba(3,18,40,1) 100%)',
        }}
      />

      {/*
        Knight background video
        Avoid translate-y — Tailwind v4 responsive override for translate-y is unreliable.
        Instead calculate top directly from Figma frame positions:
          mobile  (390×844):  knight center y=50%+49px → top edge ≈ 0
          tablet  (768×1024): knight center y=50%+81px → top edge ≈ 0
          desktop (1440×900): Figma top=-6.62px → top-0 (effectively same)
        Sizes: mobile 112vh · tablet 116vh · desktop 142vh
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
          Title block — avoid translate-y for same reason.
          Top positions derived directly from Figma:
            mobile:  center at 50%−42px → top edge ≈ calc(50% − 136px)
                     (136 = 42 + half of ~187px title height at 80/90px font)
            tablet:  Figma top=303px/1024px ≈ 30%
            desktop: Figma top=216px/900px  ≈ 24%
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
          <p
            className={`
              ${cinzel.className} font-bold leading-none text-center whitespace-nowrap
              text-[80px] mb-1
              md:text-[100px] md:mb-[-4px]
              lg:text-[130px] lg:mb-[-8px]
            `}
            style={titleStroke}
          >
            Wizard
          </p>

          {/* — Team DA — divider */}
          <div
            className="
              flex items-center w-full
              h-[17px] gap-6
              md:h-[18px] md:gap-16
              lg:h-[20px] lg:gap-[77px]
            "
          >
            <div className="flex-1 h-px bg-white/40" />
            <span
              className={`
                ${inter.className} text-white/80 whitespace-nowrap
                text-[14px] tracking-[15.82px]
                md:tracking-[26.46px]
                lg:text-[16px] lg:tracking-[30.24px]
              `}
              style={{ fontWeight: 100 }}
            >
              Team DA
            </span>
            <div className="flex-1 h-px bg-white/40" />
          </div>

          {/* CHESS */}
          <p
            className={`
              ${cinzel.className} font-bold leading-none text-center whitespace-nowrap
              text-[90px] mt-1
              md:text-[110px] md:mt-[-4px]
              lg:text-[140px] lg:mt-[-8px]
            `}
            style={titleStroke}
          >
            Chess
          </p>
        </div>

        {/*
          Connect button
          mobile:  pinned to bottom, full width with 20px side padding, pb-12
          tablet:  fixed 240px, at ~70% from top
          desktop: fixed 240px, at ~74% from top
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
