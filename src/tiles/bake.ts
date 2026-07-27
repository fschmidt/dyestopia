import Phaser from 'phaser'

import { DPR } from '../config'
import { SHAPES, type Shape } from './shapes'

/**
 * Tiles are baked to sprite sheets at boot rather than drawn live.
 *
 * Everything the tile designs ask for — soft drop shadows, radial and linear
 * gloss, an organically deforming outline — is native to the 2D canvas API and
 * absent from Phaser's `Graphics`. Baking each animation frame once turns all
 * of it into a plain textured quad, so runtime cost is a texture lookup no
 * matter how elaborate the artwork gets.
 *
 * Two sheets per shape, not one, because of how tinting works: `setTint`
 * multiplies, so a white highlight baked into the tinted layer would simply
 * come back as the tint colour. The silhouette carries only shading (darkening
 * survives multiplication) and highlights ride on a second, untinted sprite.
 *
 * The pay-off is that colour is a runtime property, independent of shape: one
 * pair of white sheets per shape serves every theme, and memory stays flat as
 * themes and dyes are added.
 */

/** Logical size of a tile — the part a player sees and clicks. */
export const TILE_SIZE = 96

const COLS = 6

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

export function cellSize(shape: Shape): number {
  return TILE_SIZE + shape.pad * 2
}

export function textureKeys(shape: Shape): { base: string; gloss: string; idle: string } {
  return {
    base: `tile-${shape.id}-base`,
    gloss: `tile-${shape.id}-gloss`,
    idle: `tile-${shape.id}-idle`,
  }
}

function bakeSheet(scene: Phaser.Scene, shape: Shape, key: string, layer: Shape['base']): void {
  if (scene.textures.exists(key)) return

  const dpr = bakeDpr()
  const cell = cellSize(shape) * dpr
  const tile = TILE_SIZE * dpr
  const pad = shape.pad * dpr
  const rows = Math.ceil(shape.frames / COLS)

  const canvas = document.createElement('canvas')
  canvas.width = COLS * cell
  canvas.height = rows * cell
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cannot bake tile sheets: no 2D canvas context')

  for (let frame = 0; frame < shape.frames; frame++) {
    const t = frame / shape.frames
    ctx.save()
    // Rotate about the tile's centre, then draw from its top-left corner.
    ctx.translate(
      (frame % COLS) * cell + pad + tile / 2,
      Math.floor(frame / COLS) * cell + pad + tile / 2,
    )
    ctx.rotate(shape.sway?.(t) ?? 0)
    ctx.translate(-tile / 2, -tile / 2)
    layer(ctx, tile, t)
    ctx.restore()
  }

  // Registered as a canvas texture with the frames cut by hand: `addSpriteSheet`
  // only accepts an image or an existing texture, and slicing here avoids
  // registering a second, redundant source texture just to feed it.
  const texture = scene.textures.addCanvas(key, canvas)
  if (!texture) throw new Error(`Cannot bake tile sheet "${key}": texture rejected`)

  for (let frame = 0; frame < shape.frames; frame++) {
    texture.add(frame, 0, (frame % COLS) * cell, Math.floor(frame / COLS) * cell, cell, cell)
  }
}

function bakeShape(scene: Phaser.Scene, shape: Shape): void {
  const keys = textureKeys(shape)
  bakeSheet(scene, shape, keys.base, shape.base)
  bakeSheet(scene, shape, keys.gloss, shape.gloss)

  if (!scene.anims.exists(keys.idle)) {
    scene.anims.create({
      key: keys.idle,
      frames: scene.anims.generateFrameNumbers(keys.base, { start: 0, end: shape.frames - 1 }),
      frameRate: shape.fps,
      repeat: -1,
    })
  }
}

/**
 * Bakes every shape and registers their idle animations. Call once, before any
 * scene builds tiles.
 *
 * All shapes rather than just the active one: each is a couple of milliseconds,
 * and having them ready is what lets the settings screen switch instantly.
 */
export function bakeTiles(scene: Phaser.Scene): void {
  for (const shape of SHAPES) bakeShape(scene, shape)
}
