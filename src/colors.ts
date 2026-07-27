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
