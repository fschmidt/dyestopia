/**
 * A tile shape: everything about how a tile looks, minus its colour.
 *
 * Shape and colour are deliberately separate axes. Colour is applied as a
 * runtime tint, so any theme can be worn by any shape without rebaking — see
 * `src/themes.ts`.
 */

/**
 * Paints one layer of one animation frame into a `size` x `size` box whose
 * origin is already translated to the top-left corner of the tile.
 *
 * `t` runs 0..1 across the idle loop and is periodic: `paint(0)` and the
 * frame after `paint(1 - 1/frames)` must join without a seam.
 */
export type Painter = (ctx: CanvasRenderingContext2D, size: number, t: number) => void

export interface Shape {
  id: string
  label: string
  /** One-line description, shown in settings. */
  blurb: string

  /** Frames in the idle loop, and the rate they play at. */
  frames: number
  fps: number

  /**
   * Slack around the tile inside its atlas cell. Without enough, the tile's
   * drop shadow bleeds into the neighbouring cell and every tile renders with
   * a sliver of its neighbour's shadow down one edge.
   */
  pad: number

  /** Space between tiles on the board. */
  gap: number

  /**
   * Backdrop drawn behind the whole grid — grout, for the shapes that sit in
   * something rather than floating above it.
   */
  board?: { color: number; alpha: number; radius: number; inset: number }

  /**
   * Per-tile rotation in degrees, cycled by tile index. Applied as a transform
   * rather than baked, so one set of frames serves every tile.
   */
  jitter?: number[]

  /** Rotation applied during the bake, in radians. Shared by both layers. */
  sway?: (t: number) => number

  /**
   * The silhouette and everything that darkens it. Painted white, because this
   * is the layer that gets tinted, and `setTint` multiplies — anything lighter
   * than the fill would come back as the tint colour.
   */
  base: Painter

  /** Highlights, painted on an untinted sprite so white stays white. */
  gloss: Painter
}
