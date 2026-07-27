import type { Painter, Shape } from './types'

/**
 * "Splash of color" — a wet blob of paint with a glossy highlight, sitting on
 * the board rather than in it. The outline itself deforms, which is the one
 * thing no transform can express and so the reason this shape needs frames at
 * all.
 */

/**
 * Corner radii as `[h1..h4, v1..v4]` fractions, matching the eight-value CSS
 * `border-radius` in the design doc. Each pair sums to 1, so no straight edge
 * survives and the outline is four elliptical arcs.
 *
 * The idle drifts through these and back to the first, so the loop closes
 * seamlessly by construction rather than by tuning.
 */
const KEYFRAMES = [
  [0.54, 0.46, 0.48, 0.52, 0.46, 0.56, 0.44, 0.54],
  [0.42, 0.58, 0.6, 0.4, 0.58, 0.42, 0.57, 0.43],
  [0.6, 0.4, 0.44, 0.56, 0.46, 0.6, 0.4, 0.54],
  [0.45, 0.55, 0.58, 0.42, 0.56, 0.44, 0.6, 0.4],
]

/** Cosine ease, so the drift has no velocity discontinuity at a keyframe. */
function ease(t: number): number {
  return 0.5 - 0.5 * Math.cos(t * Math.PI)
}

function radiiAt(t: number): number[] {
  const scaled = t * KEYFRAMES.length
  const index = Math.floor(scaled)
  const blend = ease(scaled - index)
  const from = KEYFRAMES[index % KEYFRAMES.length]
  const to = KEYFRAMES[(index + 1) % KEYFRAMES.length]
  return from.map((value, i) => value + (to[i] - value) * blend)
}

/**
 * Traces the blob as four elliptical arcs joined corner to corner.
 *
 * Note this calls `beginPath` — callers wanting a second subpath (for an
 * even-odd fill) must add it *after* this, or it will be discarded.
 */
function blobPath(ctx: CanvasRenderingContext2D, size: number, radii: number[]): void {
  const [p1, p2, p3, p4, q1, q2, q3, q4] = radii
  const a1 = p1 * size
  const a2 = p2 * size
  const a3 = p3 * size
  const a4 = p4 * size
  const b1 = q1 * size
  const b2 = q2 * size
  const b3 = q3 * size
  const b4 = q4 * size

  ctx.beginPath()
  ctx.moveTo(a1, 0)
  ctx.lineTo(size - a2, 0)
  ctx.ellipse(size - a2, b2, a2, b2, 0, -Math.PI / 2, 0)
  ctx.lineTo(size, size - b3)
  ctx.ellipse(size - a3, size - b3, a3, b3, 0, 0, Math.PI / 2)
  ctx.lineTo(a4, size)
  ctx.ellipse(a4, size - b4, a4, b4, 0, Math.PI / 2, Math.PI)
  ctx.lineTo(0, b1)
  ctx.ellipse(a1, b1, a1, b1, 0, Math.PI, -Math.PI / 2)
  ctx.closePath()
}

const base: Painter = (ctx, size, t) => {
  const radii = radiiAt(t)

  ctx.fillStyle = '#ffffff'
  blobPath(ctx, size, radii)
  ctx.shadowBlur = size * 0.075
  ctx.shadowColor = 'rgba(0,0,0,.42)'
  ctx.shadowOffsetY = size * 0.04
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Kept to a tight inner rim rather than a broad gradient: a wide one shades
  // the whole face and the tile stops reading as a flat blob of paint and
  // starts reading as a glossy sphere.
  //
  // The trick for CSS's `inset` shadow is to clip to the blob, then fill
  // everything *outside* it with a shadow enabled. The fill itself is clipped
  // away and only its shadow, spilling inward, survives.
  ctx.save()
  ctx.clip()
  blobPath(ctx, size, radii)
  ctx.rect(-size, -size, size * 3, size * 3)
  ctx.shadowColor = 'rgba(0,0,0,.34)'
  ctx.shadowBlur = size * 0.1
  ctx.shadowOffsetX = -size * 0.035
  ctx.shadowOffsetY = -size * 0.05
  ctx.fillStyle = '#000000'
  ctx.fill('evenodd')
  ctx.restore()
}

const gloss: Painter = (ctx, size, t) => {
  blobPath(ctx, size, radiiAt(t))
  ctx.save()
  ctx.clip()
  const sheen = ctx.createRadialGradient(
    size * 0.32,
    size * 0.26,
    0,
    size * 0.32,
    size * 0.26,
    size * 0.42,
  )
  sheen.addColorStop(0, 'rgba(255,255,255,.4)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, size, size)
  ctx.restore()
}

export const BLOB: Shape = {
  id: 'blob',
  label: 'Splash',
  blurb: 'Wet paint. The outline breathes.',
  frames: 24,
  fps: 12,
  pad: 14,
  gap: 26,
  sway: (t) => Math.sin(t * Math.PI * 2) * 0.04,
  base,
  gloss,
  // Liquid: slow, elastic, deforming. Held paint wobbles faster (agitation),
  // flows toward the pointer when pulled — elongating along the drag and
  // springing back with a jiggle when it stops — lands with a splat, and
  // merges by swelling as it takes the other's volume.
  motion: {
    lift: 1.12,
    liftDuration: 170,
    straighten: false,
    followLerp: 0.22,
    stretch: 0.32,
    flow: { range: 1.1, stiffness: 0.16, damping: 0.9 },
    lean: 8,
    agitation: 1.8,
    drop: { squashX: 1.18, squashY: 0.84, duration: 260, ease: 'Back.easeOut' },
    swap: { duration: 380, ease: 'Sine.easeInOut', arc: 0.15, stretch: 0.12, passiveLift: 1.08 },
    merge: {
      swell: 1.2,
      rise: 160,
      settle: 320,
      settleEase: 'Back.easeOut',
      agitation: 2.5,
      tint: 350,
    },
  },
}
