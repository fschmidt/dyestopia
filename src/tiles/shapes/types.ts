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

/**
 * Tween parameters for the gameplay moves — drag, swap, merge. `Tile` owns the
 * one implementation and reads its numbers from here, so the shapes differ in
 * feel without owning code paths. The reasoning behind the values lives in
 * docs/tile-motion.md.
 */
export interface Motion {
  /** Scale while held, and how long the pick-up takes to get there. */
  lift: number
  liftDuration: number

  /** Tween the jitter angle to zero while held — ceramic comes out of the grout square. */
  straighten: boolean

  /** Fraction of the remaining distance to the pointer closed per frame (at 60fps). */
  followLerp: number

  /**
   * Peak deformation from a drag: axis-aligned squash-and-stretch by default,
   * or the elongation toward the pointer when `flow` is set. Zero keeps the
   * tile rigid.
   */
  stretch: number

  /**
   * Thick-liquid deformation. The tile elongates *toward the pointer* — along
   * the actual pull direction, not a screen axis — by an amount driven by how
   * far the pointer has run ahead, so the shape visibly stretches out and
   * contracts back as it catches up. A damped spring drives the amount, which
   * is where the jiggle comes from: stop the pointer mid-drag and the blob
   * wobbles back to round. Rigid shapes omit this and get the axis-aligned
   * stretch plus lean instead.
   */
  flow?: {
    /** Pointer lead, in tile sizes, at which the stretch maxes out. */
    range: number
    /** Spring stiffness — how eagerly the deformation chases the pull. */
    stiffness: number
    /** Per-frame velocity retention. Higher rings longer when the pull stops. */
    damping: number
  }

  /** Maximum lean into the travel direction, in degrees. */
  lean: number

  /** Idle-loop speed multiplier while held. Above 1 reads as agitated. */
  agitation: number

  /** Landing pose, set on impact, and the rebound back to rest. */
  drop: { squashX: number; squashY: number; duration: number; ease: string }

  /**
   * Cell-to-cell travel. `arc` bows the path sideways as a fraction of the
   * distance — the two swapping tiles bow to opposite sides, so anything above
   * zero makes them circle each other rather than collide.
   */
  swap: { duration: number; ease: string; arc: number; stretch: number; passiveLift: number }

  merge: {
    /** Swell scale while the colours combine, its rise time, and the settle back. */
    swell: number
    rise: number
    settle: number
    settleEase: string
    /** Idle-loop spike while mixing, decaying back to 1. */
    agitation: number
    /** Tint crossfade to the result colour. */
    tint: number
  }

  /**
   * Destruction — a matched tile leaving the board. A short swell telegraphs
   * the burst, then the tile vanishes: the blob pops like a bubble of paint,
   * the mosaic cracks out of its grout with an angular jolt.
   */
  clear: {
    /** Pre-burst inflation and the time it takes. */
    swell: number
    rise: number
    /** Collapse to nothing, and its ease. */
    vanish: number
    vanishEase: string
    /** Idle-loop spike while bursting. Above 1 reads as thrashing liquid. */
    agitation: number
    /** Angular jolt during the vanish, in degrees — the ceramic crack. */
    spin: number
  }

  /**
   * Gravity. Every falling tile shares one constant acceleration — duration
   * is `unit * sqrt(cells fallen)` — so tiles in a column never overtake each
   * other mid-flight. `unit` is the time a one-cell fall takes.
   */
  fall: { unit: number }

  /**
   * Idle frame to jump to on landing, for shapes whose flourish is light — the
   * mosaic catches its glint as it settles.
   */
  glintFrame?: number
}

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

  /** How the shape moves when dragged, swapped and merged. */
  motion: Motion
}
