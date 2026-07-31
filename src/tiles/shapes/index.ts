import { BLOB } from './blob'
import { MOSAIC } from './mosaic'
import { SPLASH } from './splash'
import { RIM_SPLASH, SOFT_SPLASH } from './splash-variants'
import type { Shape } from './types'

export type { Painter, Shape } from './types'

/** Every shape the game can wear. Order is the order shown in settings. */
export const SHAPES: Shape[] = [SPLASH, RIM_SPLASH, SOFT_SPLASH, BLOB, MOSAIC]

export const DEFAULT_SHAPE = SPLASH.id

export function getShape(id: string): Shape {
  return SHAPES.find((shape) => shape.id === id) ?? SPLASH
}
