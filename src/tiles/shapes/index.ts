import { BLOB } from './blob'
import { MOSAIC } from './mosaic'
import { SPLASH } from './splash'
import type { Shape } from './types'

export type { Painter, Shape } from './types'

/** Every shape the game can wear. Order is the order shown in settings. */
export const SHAPES: Shape[] = [SPLASH, BLOB, MOSAIC]

export const DEFAULT_SHAPE = SPLASH.id

export function getShape(id: string): Shape {
  return SHAPES.find((shape) => shape.id === id) ?? SPLASH
}
