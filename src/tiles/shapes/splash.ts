import { SPLASH_MOTION } from './blob'
import type { Painter, Shape } from './types'

/**
 * The flat system-dye Splash: a softly irregular drop with one cream paint
 * glint. Its artwork is deliberately restrained; its handling is shared with
 * Deep Splash so choosing between them never changes the game feel.
 */

const OUTLINES = [
  [0.51, 0.07, 0.8, 0.03, 0.95, 0.23, 0.98, 0.51, 1, 0.79, 0.82, 0.96, 0.56, 0.99, 0.27, 1, 0.06, 0.83, 0.03, 0.55, 0, 0.28, 0.2, 0.1, 0.51, 0.07],
  [0.48, 0.06, 0.76, 0.02, 0.93, 0.2, 0.99, 0.47, 1, 0.75, 0.86, 0.93, 0.61, 0.98, 0.31, 1, 0.08, 0.87, 0.02, 0.59, 0, 0.31, 0.17, 0.11, 0.48, 0.06],
  [0.47, 0.08, 0.73, 0.01, 0.92, 0.18, 0.98, 0.45, 1, 0.72, 0.9, 0.92, 0.66, 0.98, 0.36, 1, 0.1, 0.89, 0.01, 0.62, 0, 0.34, 0.14, 0.13, 0.47, 0.08],
  [0.52, 0.08, 0.78, 0.03, 0.94, 0.21, 0.99, 0.49, 1, 0.77, 0.84, 0.95, 0.59, 0.99, 0.29, 1, 0.07, 0.85, 0.02, 0.57, 0, 0.29, 0.18, 0.1, 0.52, 0.08],
]

function ease(t: number): number {
  return 0.5 - 0.5 * Math.cos(t * Math.PI)
}

function outlineAt(t: number): number[] {
  const scaled = t * OUTLINES.length
  const index = Math.floor(scaled)
  const blend = ease(scaled - index)
  const from = OUTLINES[index % OUTLINES.length]
  const to = OUTLINES[(index + 1) % OUTLINES.length]
  return from.map((value, i) => value + (to[i] - value) * blend)
}

function splashPath(ctx: CanvasRenderingContext2D, size: number, t: number): void {
  const p = outlineAt(t).map((value) => value * size)
  ctx.beginPath()
  ctx.moveTo(p[0], p[1])
  for (let i = 2; i < p.length; i += 6) {
    const end = (i + 4) % p.length
    ctx.bezierCurveTo(p[i], p[i + 1], p[i + 2], p[i + 3], p[end], p[(end + 1) % p.length])
  }
  ctx.closePath()
}

const base: Painter = (ctx, size, t) => {
  splashPath(ctx, size, t)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,.42)'
  ctx.shadowBlur = size * 0.08
  ctx.shadowOffsetX = -size * 0.025
  ctx.shadowOffsetY = size * 0.07
  ctx.fill()
}

const gloss: Painter = (ctx, size, t) => {
  const drift = Math.sin(t * Math.PI * 2)
  ctx.save()
  ctx.translate(size * (0.29 + drift * 0.006), size * (0.27 - drift * 0.004))
  ctx.rotate(-0.28)
  ctx.scale(1.3, 0.86)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.083, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,244,218,.7)'
  ctx.fill()
  ctx.restore()
}

export const SPLASH: Shape = {
  id: 'splash',
  label: 'Splash',
  blurb: 'Flat system dye with a soft cream glint.',
  frames: 24,
  fps: 12,
  pad: 14,
  gap: 26,
  base,
  gloss,
  motion: SPLASH_MOTION,
}
