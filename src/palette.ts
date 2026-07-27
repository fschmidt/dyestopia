/**
 * Chrome colours — the page around the game, and text. Fixed regardless of the
 * player's theme.
 *
 * The colours the game is actually *played* with live in `src/themes.ts`,
 * because they're a setting rather than a constant.
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

/** `0xrrggbb` → `'#rrggbb'`, for the places Phaser wants a CSS string. */
export function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
