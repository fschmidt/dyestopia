import Phaser from 'phaser'

import { DPR } from '../config'

/**
 * Tiles are baked to sprite sheets at boot rather than drawn live.
 *
 * Everything the tile design asks for — soft drop shadows, radial gloss,
 * an organically deforming outline — is native to the 2D canvas API and absent
 * from Phaser's `Graphics`. Baking each animation frame once turns all of it
 * into a plain textured quad, so the runtime cost is a texture lookup no matter
 * how elaborate the artwork gets.
 *
 * Two sheets, not one, because of how tinting works: `setTint` multiplies, so a
 * white specular highlight baked into the tinted layer would simply come back
 * as the tint colour. The silhouette carries only shading (darkening survives
 * multiplication) and the highlight rides on a second, untinted sprite.
 *
 * The pay-off is that colour is a runtime property: one pair of white sheets
 * serves the entire palette, and the memory cost stays flat as dyes are added.
 */

/** Logical size of the blob itself — the part a player sees and clicks. */
export const TILE_SIZE = 96

/**
 * Slack around the blob for its drop shadow. Without it the shadow bleeds into
 * the neighbouring cell of the atlas and every tile renders with a sliver of
 * its neighbour's shadow down one edge.
 */
const PAD = 14

/** Full atlas cell. Sprites are displayed at this size, not at TILE_SIZE. */
export const CELL_SIZE = TILE_SIZE + PAD * 2

const FRAMES = 24
const COLS = 6

/**
 * 24 frames over two seconds. Low for a frame rate, but judder comes from the
 * per-frame delta rather than the rate, and a breath this slow moves the
 * outline by well under a pixel per frame.
 */
export const IDLE_FPS = 12

/**
 * Baking resolution, deliberately below the display DPR on 3x screens: the
 * artwork is soft gradients and blurred shadows with no hard edges to resolve,
 * so the third multiple costs 2.25x the memory for nothing anyone can see.
 *
 * Read lazily, not at module scope. `config.ts` imports the scenes, which reach
 * back here, so at import time `DPR` is still in its temporal dead zone.
 */
function bakeDpr(): number {
  return Math.min(DPR, 2)
}

const BASE_KEY = 'tile-base'
const GLOSS_KEY = 'tile-gloss'
export const IDLE_ANIM = 'tile-idle'

/**
 * Corner radii as `[h1..h4, v1..v4]` fractions, matching the eight-value CSS
 * `border-radius` the design doc uses. Each pair sums to 1, so no straight edge
 * survives and the outline is four elliptical arcs — a blob.
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

/** Traces the blob outline as four elliptical arcs joined corner to corner. */
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

type Layer = (ctx: CanvasRenderingContext2D, size: number, radii: number[]) => void

/** White silhouette plus shading — the layer that gets tinted to a dye colour. */
const drawBase: Layer = (ctx, size, radii) => {
  ctx.fillStyle = '#ffffff'
  blobPath(ctx, size, radii)
  ctx.shadowBlur = size * 0.075
  ctx.shadowColor = 'rgba(0,0,0,.42)'
  ctx.shadowOffsetY = size * 0.04
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Darkening only — anything lighter than the fill would be flattened by the
  // tint. Kept to a tight inner rim rather than a broad gradient: a wide one
  // shades the whole face and the tile stops reading as a flat blob of paint
  // and starts reading as a glossy sphere.
  //
  // The trick for CSS's `inset` shadow is to clip to the blob, then fill
  // *everything outside* it with a shadow enabled. The fill itself is clipped
  // away and only its shadow, spilling inward, survives.
  ctx.save()
  ctx.clip()
  // Blob first — it starts the path — then the surrounding rect as a second
  // subpath, so even-odd leaves exactly the region outside the blob.
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

/** The glossy highlight, drawn untinted on top so it stays white. */
const drawGloss: Layer = (ctx, size, radii) => {
  blobPath(ctx, size, radii)
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

function bakeSheet(scene: Phaser.Scene, key: string, layer: Layer): void {
  if (scene.textures.exists(key)) return

  const dpr = bakeDpr()
  const cell = CELL_SIZE * dpr
  const tile = TILE_SIZE * dpr
  const pad = PAD * dpr
  const rows = Math.ceil(FRAMES / COLS)

  const canvas = document.createElement('canvas')
  canvas.width = COLS * cell
  canvas.height = rows * cell
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cannot bake tile sheets: no 2D canvas context')

  for (let frame = 0; frame < FRAMES; frame++) {
    const t = frame / FRAMES
    ctx.save()
    // Rotate about the tile's centre, then draw from its top-left corner.
    ctx.translate((frame % COLS) * cell + pad + tile / 2, Math.floor(frame / COLS) * cell + pad + tile / 2)
    ctx.rotate(Math.sin(t * Math.PI * 2) * 0.04)
    ctx.translate(-tile / 2, -tile / 2)
    layer(ctx, tile, radiiAt(t))
    ctx.restore()
  }

  // Registered as a canvas texture with the frames cut by hand: `addSpriteSheet`
  // only accepts an image or an existing texture, and slicing here avoids
  // registering a second, redundant source texture just to feed it.
  const texture = scene.textures.addCanvas(key, canvas)
  if (!texture) throw new Error(`Cannot bake tile sheet "${key}": texture rejected`)

  for (let frame = 0; frame < FRAMES; frame++) {
    texture.add(frame, 0, (frame % COLS) * cell, Math.floor(frame / COLS) * cell, cell, cell)
  }
}

/**
 * Bakes both sheets and registers the idle animation. Call once, before any
 * scene builds tiles.
 */
export function bakeTiles(scene: Phaser.Scene): void {
  bakeSheet(scene, BASE_KEY, drawBase)
  bakeSheet(scene, GLOSS_KEY, drawGloss)

  if (!scene.anims.exists(IDLE_ANIM)) {
    scene.anims.create({
      key: IDLE_ANIM,
      frames: scene.anims.generateFrameNumbers(BASE_KEY, { start: 0, end: FRAMES - 1 }),
      frameRate: IDLE_FPS,
      repeat: -1,
    })
  }
}

export const TILE_TEXTURES = { base: BASE_KEY, gloss: GLOSS_KEY, frames: FRAMES } as const
