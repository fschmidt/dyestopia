import type { ColorId } from './colors'
import type { Dye } from './palette'

/**
 * Colour themes — what each colour *looks like*, and deliberately independent
 * of both shape and game logic.
 *
 * Colour identity and mixing rules live in `src/colors.ts`; a theme is nothing
 * but the answer to "what is red here". This separation is free rather than
 * clever: tile artwork is baked white and coloured with a runtime tint, so any
 * theme can be worn by any shape with no rebaking, and adding one costs
 * nothing in memory.
 *
 * Every theme must style the whole wheel (`Record<ColorId, number>` enforces
 * it), and the mixed colours should sit visually between their ingredients —
 * the merge move reads as pigment mixing, so orange that doesn't look like
 * red-plus-yellow breaks the fiction.
 */

export interface Theme {
  id: string
  label: string
  blurb: string
  values: Record<ColorId, number>
}

export const THEMES: Theme[] = [
  {
    id: 'dyestopia',
    label: 'Dyestopia',
    blurb: 'Muted pigments, the original mix.',
    values: {
      red: 0xc9473b,
      yellow: 0xe8c14d,
      blue: 0x4a6fa5,
      orange: 0xe2762d,
      green: 0x49935f,
      purple: 0x8050a5,
      vermilion: 0xb83d2e,
      amber: 0xf1b927,
      chartreuse: 0xa8cc3a,
      teal: 0x27858e,
      violet: 0x5f63c6,
      magenta: 0xc34483,
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    blurb: 'Loud and saturated, straight off the design doc.',
    values: {
      red: 0xff3b4d,
      yellow: 0xfacc15,
      blue: 0x3b82f6,
      orange: 0xfb923c,
      green: 0x34d399,
      purple: 0xa855f7,
      vermilion: 0xe92f2f,
      amber: 0xffd23f,
      chartreuse: 0x8fe52f,
      teal: 0x00b8c8,
      violet: 0x686de0,
      magenta: 0xf23891,
    },
  },
  {
    id: 'dusk',
    label: 'Dusk',
    blurb: 'Low contrast and dusty, easier on the eyes.',
    values: {
      red: 0xa94f52,
      yellow: 0xd8c477,
      blue: 0x536f99,
      orange: 0xc4773e,
      green: 0x5e8d70,
      purple: 0x765c91,
      vermilion: 0x963f37,
      amber: 0xe0ac54,
      chartreuse: 0x9eb95c,
      teal: 0x3e7f88,
      violet: 0x5965a1,
      magenta: 0xa94f79,
    },
  },
]

export const DEFAULT_THEME = THEMES[0].id

export function getTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

/** The runtime pairing a tile carries: colour identity plus this theme's look. */
export function themedDye(theme: Theme, id: ColorId): Dye {
  return { name: id, value: theme.values[id] }
}
