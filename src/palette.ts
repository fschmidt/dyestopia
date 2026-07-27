/**
 * The game's colour vocabulary. Everything that draws a colour should pull it
 * from here so the whole game can be re-tinted in one place.
 */
export const PALETTE = {
  background: 0x12101a,
  ink: 0xf4f1ea,
  inkMuted: 0x8a8499,
  accent: 0xff5d8f,
} as const

export interface Dye {
  name: string
  value: number
}

/** The colours the player actually plays with. */
export const DYES: Dye[] = [
  { name: 'crimson', value: 0xe4572e },
  { name: 'amber', value: 0xf2a541 },
  { name: 'moss', value: 0x5aa469 },
  { name: 'teal', value: 0x2eb8b0 },
  { name: 'indigo', value: 0x4f5d95 },
  { name: 'violet', value: 0x9b5de5 },
]

/** `0xrrggbb` → `'#rrggbb'`, for the places Phaser wants a CSS string. */
export function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
