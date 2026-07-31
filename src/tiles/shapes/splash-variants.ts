import { SPLASH_MOTION } from './blob'
import { splashGloss, splashPath } from './splash'
import type { Painter, Shape } from './types'

function shadow(ctx: CanvasRenderingContext2D, size: number, t: number): void {
  splashPath(ctx, size, t)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,.42)'
  ctx.shadowBlur = size * 0.08
  ctx.shadowOffsetX = -size * 0.025
  ctx.shadowOffsetY = size * 0.07
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

/** A flat face lifted above a darker lower lip, like a thick paint sticker. */
const rimBase: Painter = (ctx, size, t) => {
  shadow(ctx, size, t)

  splashPath(ctx, size, t)
  ctx.fillStyle = '#b9b9b9'
  ctx.fill()

  ctx.save()
  splashPath(ctx, size, t)
  ctx.clip()
  ctx.translate(0, -size * 0.085)
  splashPath(ctx, size, t)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
}

/** A quiet radial face shade: dimensional, but without Deep Splash's inset rim. */
const softBase: Painter = (ctx, size, t) => {
  shadow(ctx, size, t)

  splashPath(ctx, size, t)
  const face = ctx.createRadialGradient(
    size * 0.35,
    size * 0.29,
    size * 0.04,
    size * 0.48,
    size * 0.46,
    size * 0.7,
  )
  face.addColorStop(0, '#ffffff')
  face.addColorStop(0.58, '#f8f8f8')
  face.addColorStop(1, '#cfcfcf')
  ctx.fillStyle = face
  ctx.fill()
}

const common = {
  frames: 24,
  fps: 12,
  pad: 14,
  gap: 26,
  gloss: splashGloss,
  motion: SPLASH_MOTION,
} as const

export const RIM_SPLASH: Shape = {
  ...common,
  id: 'rim-splash',
  label: 'Rim Splash',
  blurb: 'Flat dye raised above a darker lower rim.',
  base: rimBase,
}

export const SOFT_SPLASH: Shape = {
  ...common,
  id: 'soft-splash',
  label: 'Soft Splash',
  blurb: 'Gently shaded dye with a soft rounded face.',
  base: softBase,
}
