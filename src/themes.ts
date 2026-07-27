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
      orange: 0xd97b3f,
      green: 0x6da35c,
      purple: 0x7d5a96,
      vermilion: 0xd0603a,
      amber: 0xe0a145,
      chartreuse: 0xa9b352,
      teal: 0x54897f,
      violet: 0x635f9e,
      magenta: 0xa2527b,
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
      vermilion: 0xff6b35,
      amber: 0xfdae1c,
      chartreuse: 0xa3e635,
      teal: 0x22d3ee,
      violet: 0x818cf8,
      magenta: 0xec4899,
    },
  },
  {
    id: 'dusk',
    label: 'Dusk',
    blurb: 'Low contrast and dusty, easier on the eyes.',
    values: {
      red: 0xb4654a,
      yellow: 0xd9b36c,
      blue: 0x5a6b8c,
      orange: 0xc78b5b,
      green: 0x7e9b76,
      purple: 0x8a6a9b,
      vermilion: 0xbc7452,
      amber: 0xd0a163,
      chartreuse: 0xa5a26f,
      teal: 0x5c8a91,
      violet: 0x73719a,
      magenta: 0x9f6d84,
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
