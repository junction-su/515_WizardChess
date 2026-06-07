'use client'

import { useEffect, useRef } from 'react'
import { PieceSymbol, Color } from 'chess.js'

const pieceFile: Record<PieceSymbol, (color: Color) => string> = {
  k: () => '/pieces/King.svg',
  q: () => '/pieces/Queen.svg',
  r: () => '/pieces/Rook.svg',
  b: () => '/pieces/Bishop.svg',
  n: (color) => color === 'w' ? '/pieces/Knight_1.svg' : '/pieces/Knight_2.svg',
  p: () => '/pieces/Pawn.svg',
}

// Pieces with a rendered video clip (black bg, keyed out to alpha on canvas).
const pieceVideo: Partial<Record<PieceSymbol, string>> = {
  p: '/effects/pawn_attack.mp4',
}

const filterW = 'brightness(1.65) contrast(0.9) saturate(0.2) sepia(0.55) drop-shadow(1px 2px 1px rgba(80,50,0,0.4))'
const filterB = 'brightness(0.82) contrast(1.6) drop-shadow(0px 2px 4px rgba(0,8,35,0.9))'

// The clip's backdrop is pure black (lum === 0), but the statue's own shadow
// folds render down to near-zero luminance too — a plain per-pixel threshold
// can't tell them apart and punches holes through the cloak. Instead, flood-fill
// from the frame border through dark pixels (lum < EDGE_THRESHOLD): the backdrop
// is one blob touching every edge, while shadows *inside* the silhouette are
// surrounded by bright material and never connect to the border, so they survive.
// KEY_LOW/KEY_HIGH then only shape the soft alpha ramp at the background edge.
const EDGE_THRESHOLD = 30
const KEY_LOW = 2
const KEY_HIGH = 30
const PLAYBACK_RATE = 2.0
const CANVAS_WIDTH = 640

// The statue sits off-center in the 1280x720 render with large black margins;
// crop to its bounding box (sampled across the whole clip) so the keyed sprite
// is tightly framed like the SVG pieces, instead of floating in empty space.
const CROP = { x: 380, y: 40, w: 900, h: 680 }

function KeyedVideo({
  src,
  className,
  style,
  onComplete,
}: {
  src: string
  className?: string
  style?: React.CSSProperties
  onComplete: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buffersRef = useRef<{ lum: Float32Array; bg: Uint8Array; queue: Int32Array; w: number; h: number } | null>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // `display: none` keeps autoplay from ever starting in Chromium, so the
    // source video must stay laid out (just visually hidden behind the canvas)
    // and playback must be kicked explicitly rather than relying on `autoPlay`.
    video.playbackRate = PLAYBACK_RATE
    video.play().catch(() => {})

    let raf = 0
    const draw = () => {
      if (video.videoWidth) {
        const w = CANVAS_WIDTH
        const h = Math.round((CROP.h / CROP.w) * w)
        if (canvas.width !== w) {
          canvas.width = w
          canvas.height = h
        }

        const n = w * h
        let buf = buffersRef.current
        if (!buf || buf.w !== w || buf.h !== h) {
          buf = { lum: new Float32Array(n), bg: new Uint8Array(n), queue: new Int32Array(n), w, h }
          buffersRef.current = buf
        }
        const { lum, bg, queue } = buf
        bg.fill(0)

        ctx.drawImage(video, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, w, h)
        const frame = ctx.getImageData(0, 0, w, h)
        const d = frame.data

        for (let p = 0, i = 0; p < n; p++, i += 4) {
          lum[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        }

        // BFS flood-fill the background inward from the frame border, only
        // travelling through dark pixels. The backdrop is one connected blob
        // touching every edge; shadow folds *inside* the silhouette are walled
        // off by brighter material and never get reached, so they stay opaque.
        let qHead = 0
        let qTail = 0
        const visit = (p: number) => {
          if (!bg[p] && lum[p] < EDGE_THRESHOLD) {
            bg[p] = 1
            queue[qTail++] = p
          }
        }
        for (let x = 0; x < w; x++) {
          visit(x)
          visit((h - 1) * w + x)
        }
        for (let y = 0; y < h; y++) {
          visit(y * w)
          visit(y * w + w - 1)
        }
        while (qHead < qTail) {
          const p = queue[qHead++]
          const x = p % w
          if (x > 0) visit(p - 1)
          if (x < w - 1) visit(p + 1)
          if (p >= w) visit(p - w)
          if (p < n - w) visit(p + w)
        }

        for (let p = 0, i = 0; p < n; p++, i += 4) {
          if (!bg[p]) continue
          const l = lum[p]
          if (l <= KEY_LOW) {
            d[i + 3] = 0
          } else {
            const a = (l - KEY_LOW) / (KEY_HIGH - KEY_LOW)
            // Un-blend edge pixels from the assumed-black backdrop (observed = fg*a),
            // recovering their true color — otherwise translucent edges keep a dark
            // "matte fringe" baked in from the original blend with black.
            d[i] = Math.min(255, d[i] / a)
            d[i + 1] = Math.min(255, d[i + 1] / a)
            d[i + 2] = Math.min(255, d[i + 2] / a)
            d[i + 3] = Math.round(d[i + 3] * a)
          }
        }
        ctx.putImageData(frame, 0, 0)
      }
      if (!video.ended) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        onEnded={onComplete}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      <canvas ref={canvasRef} className={className} style={style} />
    </>
  )
}

export default function AttackAnimation({
  piece,
  color,
  onComplete,
}: {
  piece: PieceSymbol
  color: Color
  onComplete: () => void
}) {
  const video = pieceVideo[piece]

  if (video) {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        <KeyedVideo
          src={video}
          onComplete={onComplete}
          className="absolute w-auto attack-video"
          style={{
            height: '92%',
            bottom: '-45%',
            left: '-130px',
          }}
        />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <img
        src={pieceFile[piece](color)}
        alt=""
        className="absolute w-auto attack-rpg"
        style={{
          filter: color === 'w' ? filterW : filterB,
          height: '90%',
          bottom: '-45%',
          left: '-60px',
        }}
        onAnimationEnd={onComplete}
      />
    </div>
  )
}
