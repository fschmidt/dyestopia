import { BLOB } from './blob'
import { MOSAIC } from './mosaic'
import type { Shape } from './types'

export type { Painter, Shape } from './types'

/** Every shape the game can wear. Order is the order shown in settings. */
export const SHAPES: Shape[] = [BLOB, MOSAIC]

export const DEFAULT_SHAPE = BLOB.id

export function getShape(id: string): Shape {
  return SHAPES.find((shape) => shape.id === id) ?? BLOB
}
