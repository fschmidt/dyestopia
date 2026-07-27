import type { Painter, Shape } from './types'

/**
 * "Mosaic" — glazed tesserae set in grout. Rigid where the blob is fluid, so
 * almost none of its life comes from the outline: the hand-set feel is a static
 * per-tile rotation (a transform, not frames) and the animation is a specular
 * glint travelling across the glaze, as if the light moved rather than the tile.
 */

/** Corner radii as top-left, top-right, bottom-right, bottom-left fractions. */
const RADII = [6 / 84, 4 / 84, 8 / 84, 5 / 84]

function tilePath(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.beginPath()
  ctx.roundRect(
    0,
    0,
    size,
    size,
    RADII.map((r) => r * size),
  )
}

/**
 * CSS's `inset` box-shadow: clip to the tile, then fill everything outside it
 * with a shadow enabled. The fill lands outside the clip and is discarded;
 * only its shadow, spilling inward, survives.
 */
function inset(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  blur: number,
  dx: number,
  dy: number,
): void {
  ctx.save()
  tilePath(ctx, size)
  ctx.clip()
  tilePath(ctx, size)
  ctx.rect(-size, -size, size * 3, size * 3)
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.shadowOffsetX = dx
  ctx.shadowOffsetY = dy
  ctx.fillStyle = '#000000'
  ctx.fill('evenodd')
  ctx.restore()
}

const base: Painter = (ctx, size) => {
  ctx.fillStyle = '#ffffff'
  tilePath(ctx, size)
  ctx.shadowColor = 'rgba(0,0,0,.4)'
  ctx.shadowBlur = size * 0.035
  ctx.shadowOffsetY = size * 0.012
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // The dark half of the 135deg glaze. Its white half is a highlight and so
  // belongs on the gloss layer, where the tint can't flatten it.
  ctx.save()
  tilePath(ctx, size)
  ctx.clip()
  const glaze = ctx.createLinearGradient(0, 0, size, size)
  glaze.addColorStop(0.45, 'rgba(0,0,0,0)')
  glaze.addColorStop(1, 'rgba(0,0,0,.18)')
  ctx.fillStyle = glaze
  ctx.fillRect(0, 0, size, size)
  ctx.restore()

  // Bevel: hard-edged, so no blur. Bottom-right sits in shadow.
  inset(ctx, size, 'rgba(0,0,0,.25)', 0, -size * 0.012, -size * 0.024)
}

const gloss: Painter = (ctx, size, t) => {
  ctx.save()
  tilePath(ctx, size)
  ctx.clip()

  const glaze = ctx.createLinearGradient(0, 0, size, size)
  glaze.addColorStop(0, 'rgba(255,255,255,.25)')
  glaze.addColorStop(0.45, 'rgba(255,255,255,0)')
  ctx.fillStyle = glaze
  ctx.fillRect(0, 0, size, size)

  // A glint crossing on the same diagonal as the glaze, confined to a third of
  // the loop so tiles catch the light now and then rather than pulsing. Outside
  // that window the band sits off the tile entirely, so the loop has no seam.
  const travel = (t - 0.08) / 0.34
  if (travel > 0 && travel < 1) {
    const centre = -0.45 + travel * 1.9
    const width = 0.22
    const sweep = ctx.createLinearGradient(0, 0, size, size)
    sweep.addColorStop(Math.max(0, Math.min(1, centre - width)), 'rgba(255,255,255,0)')
    sweep.addColorStop(Math.max(0, Math.min(1, centre)), 'rgba(255,255,255,.3)')
    sweep.addColorStop(Math.max(0, Math.min(1, centre + width)), 'rgba(255,255,255,0)')
    ctx.fillStyle = sweep
    ctx.fillRect(0, 0, size, size)
  }
  ctx.restore()

  inset(ctx, size, 'rgba(255,255,255,.3)', 0, size * 0.012, size * 0.012)
}

export const MOSAIC: Shape = {
  id: 'mosaic',
  label: 'Mosaic',
  blurb: 'Glazed tesserae in grout. The light moves, not the tile.',
  frames: 24,
  fps: 12,
  pad: 10,
  gap: 10,
  board: { color: 0x7f7f7f, alpha: 0.09, radius: 12, inset: 12 },
  jitter: [-1.4, 1.1, -0.7, 1.6, -1, 0.8, -1.5],
  sway: (t) => Math.sin(t * Math.PI * 2) * 0.008,
  base,
  gloss,
  // Ceramic: quick, crisp, rigid — no stretch, ever. It lifts out of the grout
  // square (straighten), clicks back in with a dip, and lands on the start of
  // the glint window so the light crosses the glaze as it settles.
  motion: {
    lift: 1.08,
    liftDuration: 120,
    straighten: true,
    followLerp: 0.35,
    stretch: 0,
    lean: 6,
    agitation: 1,
    drop: { squashX: 0.98, squashY: 0.98, duration: 90, ease: 'Quad.easeOut' },
    swap: { duration: 260, ease: 'Cubic.easeInOut', arc: 0, stretch: 0, passiveLift: 1.04 },
    merge: {
      swell: 1.12,
      rise: 140,
      settle: 100,
      settleEase: 'Quad.easeOut',
      agitation: 1,
      tint: 200,
    },
    glintFrame: 2,
  },
}
