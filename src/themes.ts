import type { Dye } from './palette'

/**
 * Colour themes — the second half of a tile's look, and deliberately
 * independent of its shape.
 *
 * This separation is free rather than clever: tile artwork is baked white and
 * coloured with a runtime tint, so a theme is nothing but a list of numbers.
 * Any theme can be worn by any shape with no rebaking, and adding one costs
 * nothing in memory.
 *
 * Every theme must supply the same number of dyes, since the board is laid out
 * from them. Names travel with the colours because the round names its target
 * out loud ("Find: moss").
 */

export interface Theme {
  id: string
  label: string
  blurb: string
  dyes: Dye[]
}

export const THEMES: Theme[] = [
  {
    id: 'dyestopia',
    label: 'Dyestopia',
    blurb: 'Muted pigments, the original mix.',
    dyes: [
      { name: 'crimson', value: 0xe4572e },
      { name: 'amber', value: 0xf2a541 },
      { name: 'moss', value: 0x5aa469 },
      { name: 'teal', value: 0x2eb8b0 },
      { name: 'indigo', value: 0x4f5d95 },
      { name: 'violet', value: 0x9b5de5 },
    ],
  },
  {
    id: 'neon',
    label: 'Neon',
    blurb: 'Loud and saturated, straight off the design doc.',
    dyes: [
      { name: 'rose', value: 0xf43f5e },
      { name: 'tangerine', value: 0xfb923c },
      { name: 'citron', value: 0xfacc15 },
      { name: 'mint', value: 0x34d399 },
      { name: 'cyan', value: 0x22d3ee },
      { name: 'orchid', value: 0xc084fc },
    ],
  },
  {
    id: 'dusk',
    label: 'Dusk',
    blurb: 'Low contrast and dusty, easier on the eyes.',
    dyes: [
      { name: 'clay', value: 0xb4654a },
      { name: 'sand', value: 0xd9a566 },
      { name: 'sage', value: 0x7e9b76 },
      { name: 'slate', value: 0x5c8a91 },
      { name: 'denim', value: 0x5a6b8c },
      { name: 'plum', value: 0x8a6a9b },
    ],
  },
]

export const DEFAULT_THEME = THEMES[0].id

export function getTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}
