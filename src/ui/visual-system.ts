import { toCss } from '../palette'

export interface VisualProfile {
  id: string
  label: string
  blurb: string
  treatment: 'lab' | 'spray-can' | 'splash-colors'
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
  label: 'Lab',
  blurb: 'The original restrained dye-lab interface.',
  treatment: 'lab',
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
  label: 'Paper test',
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

/**
 * Industrial spray-booth labels over wet pigment: condensed type, hot yellow
 * actions, hard edges and visible construction lines.
 */
export const SPRAY_CAN_PROFILE: VisualProfile = {
  id: 'spray-can',
  label: 'Spray Can',
  blurb: 'Dark spray-booth labels with signal-yellow controls.',
  treatment: 'spray-can',
  colors: {
    surface: 0x171815,
    surfaceStrong: 0x0b0c0b,
    primaryInk: 0xf4f0e6,
    secondaryInk: 0xaaa69d,
    accent: 0xffcd2e,
    accentInk: 0x17150d,
    warning: 0xff9d24,
    critical: 0xe93476,
    focus: 0x43bedc,
  },
  alpha: { surface: 0.9, surfaceStrong: 0.97, disabled: 0.4 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 },
  radii: { sm: 2, md: 3, lg: 18, pill: 3 },
  type: {
    family: '"Arial Narrow", "Roboto Condensed", Impact, sans-serif',
    display: '64px',
    label: '13px',
    body: '18px',
    small: '14px',
  },
  motion: { quick: 90, standard: 150 },
}

export const VISUAL_PROFILES: VisualProfile[] = [SPRAY_CAN_PROFILE, LAB_PROFILE]
export const DEFAULT_VISUAL_PROFILE = SPRAY_CAN_PROFILE.id

export function getVisualProfile(id: string): VisualProfile {
  return VISUAL_PROFILES.find((profile) => profile.id === id) ?? LAB_PROFILE
}

let override: VisualProfile | undefined
let selected = getVisualProfile(DEFAULT_VISUAL_PROFILE)

export function resolveVisualProfile(): VisualProfile {
  return override ?? selected
}

export function selectVisualProfile(id: string): VisualProfile {
  selected = getVisualProfile(id)
  return selected
}

/** Test/design seam. Background selection remains intentionally uninvolved. */
export function setVisualProfile(profile?: VisualProfile): void {
  override = profile
}

export function ink(color: number): string {
  return toCss(color)
}
