import { toCss } from '../palette'

export interface VisualProfile {
  id: string
  colors: {
    surface: number
    surfaceStrong: number
    primaryInk: number
    secondaryInk: number
    accent: number
    accentInk: number
    warning: number
    critical: number
    focus: number
  }
  alpha: {
    surface: number
    surfaceStrong: number
    disabled: number
  }
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number }
  radii: { sm: number; md: number; lg: number; pill: number }
  type: {
    family: string
    display: string
    label: string
    body: string
    small: string
  }
  motion: { quick: number; standard: number }
}

/** Opaque lab stock: restrained enough for every expressive pigment backdrop. */
export const LAB_PROFILE: VisualProfile = {
  id: 'lab-dark',
  colors: {
    surface: 0x11131a,
    surfaceStrong: 0x090b10,
    primaryInk: 0xfffbef,
    secondaryInk: 0xb8b4aa,
    accent: 0xffcf4a,
    accentInk: 0x19140a,
    warning: 0xffa629,
    critical: 0xff5b66,
    focus: 0x7de6e3,
  },
  alpha: { surface: 0.88, surfaceStrong: 0.96, disabled: 0.42 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 },
  radii: { sm: 8, md: 14, lg: 22, pill: 999 },
  type: {
    family: '"Avenir Next", "Trebuchet MS", sans-serif',
    display: '56px',
    label: '13px',
    body: '18px',
    small: '14px',
  },
  motion: { quick: 110, standard: 180 },
}

/** Deliberately different fixture: proves scenes depend on roles, not values. */
export const PAPER_PROFILE: VisualProfile = {
  ...LAB_PROFILE,
  id: 'paper-test',
  colors: {
    ...LAB_PROFILE.colors,
    surface: 0xf5eedf,
    surfaceStrong: 0xfffbf2,
    primaryInk: 0x201d18,
    secondaryInk: 0x655f55,
    accent: 0x007e7a,
    accentInk: 0xffffff,
  },
}

let override: VisualProfile | undefined

export function resolveVisualProfile(): VisualProfile {
  return override ?? LAB_PROFILE
}

/** Test/design seam. Background selection remains intentionally uninvolved. */
export function setVisualProfile(profile?: VisualProfile): void {
  override = profile
}

export function ink(color: number): string {
  return toCss(color)
}
