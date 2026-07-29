/**
 * Colour identity and mixing rules — the game-logic half of a colour.
 *
 * A colour here is an idea ("red"), not a pixel value: what red actually looks
 * like is the theme's business (`src/themes.ts`), and which colours are in
 * play is the stage's (`src/stage.ts`). Base colours cannot be produced by
 * mixing; every other colour names the two that mix into it.
 */

export type ColorId =
  | 'red'
  | 'yellow'
  | 'blue'
  | 'orange'
  | 'green'
  | 'purple'
  | 'vermilion'
  | 'amber'
  | 'chartreuse'
  | 'teal'
  | 'violet'
  | 'magenta'

export interface ColorDef {
  id: ColorId
  /** The two colours that mix into this one. Base colours omit it. */
  mix?: [ColorId, ColorId]
}

export type ColorTier = 0 | 1 | 2

const COLOR_VALUE_BY_TIER: Record<ColorTier, number> = {
  0: 15,
  1: 20,
  2: 30,
}

/**
 * The RYB pigment wheel: three base primaries, the secondaries they mix into,
 * and the tertiaries those mix into. Stages pick a subset; the deeper rings
 * exist so later stages have somewhere to go.
 */
export const COLORS: ColorDef[] = [
  { id: 'red' },
  { id: 'yellow' },
  { id: 'blue' },
  { id: 'orange', mix: ['red', 'yellow'] },
  { id: 'green', mix: ['yellow', 'blue'] },
  { id: 'purple', mix: ['red', 'blue'] },
  { id: 'vermilion', mix: ['red', 'orange'] },
  { id: 'amber', mix: ['yellow', 'orange'] },
  { id: 'chartreuse', mix: ['yellow', 'green'] },
  { id: 'teal', mix: ['blue', 'green'] },
  { id: 'violet', mix: ['blue', 'purple'] },
  { id: 'magenta', mix: ['red', 'purple'] },
]

/** What `a` and `b` mix into, order-independent; undefined if nothing does. */
export function mixResult(a: string, b: string): ColorId | undefined {
  return COLORS.find(
    ({ mix }) => mix && ((mix[0] === a && mix[1] === b) || (mix[0] === b && mix[1] === a)),
  )?.id
}

/** The two colours that mix into `id` — undefined for the base colours. */
export function mixComponents(id: ColorId): [ColorId, ColorId] | undefined {
  return COLORS.find((colour) => colour.id === id)?.mix
}

/**
 * Mixing depth: primaries are matte tier 0, their direct mixes are tier 1,
 * and mixes involving a secondary are tier 2.
 */
export function colorTier(id: string): ColorTier {
  const ingredients = COLORS.find((color) => color.id === id)?.mix
  if (!ingredients) return 0
  const depth = 1 + Math.max(...ingredients.map(colorTier))
  return Math.min(2, depth) as ColorTier
}

/** Score value of one tile, based on its colour's mixing tier. */
export function colorValue(id: ColorId): number {
  return COLOR_VALUE_BY_TIER[colorTier(id)]
}
