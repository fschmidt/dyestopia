import { DEFAULT_BACKGROUND, getBackground, type Background } from './backgrounds'
import { DEFAULT_THEME, getTheme, type Theme } from './themes'
import { DEFAULT_SHAPE, getShape } from './tiles/shapes'
import type { Shape } from './tiles/shapes'
import {
  DEFAULT_VISUAL_PROFILE,
  getVisualProfile,
  selectVisualProfile,
} from './ui/visual-system'

/**
 * Player settings, persisted across visits.
 *
 * Shape, colour theme, background and visual style are separate keys on
 * purpose. The visual style owns UI treatment, never tile artwork or pigment
 * identity, which keeps later skins from multiplying every other setting.
 * Sound is the M5 mute toggle; the SFX module checks it on every play, so
 * flipping it takes effect mid-round.
 */

export interface Settings {
  shape: string
  theme: string
  background: string
  visualStyle: string
  sound: boolean
  unlockAllStages: boolean
}

const STORAGE_KEY = 'dyestopia:settings'

const defaults: Settings = {
  shape: DEFAULT_SHAPE,
  theme: DEFAULT_THEME,
  background: DEFAULT_BACKGROUND,
  visualStyle: DEFAULT_VISUAL_PROFILE,
  sound: true,
  unlockAllStages: false,
}

let current: Settings = load()

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<Settings>
    // Resolved through the registries so a stale id from an older build — or a
    // hand-edited value — falls back rather than rendering an empty board.
    return {
      shape: getShape(parsed.shape ?? '').id,
      theme: getTheme(parsed.theme ?? '').id,
      background: getBackground(parsed.background ?? '').id,
      visualStyle: getVisualProfile(parsed.visualStyle ?? DEFAULT_VISUAL_PROFILE).id,
      // Anything but an explicit false means sound on — same spirit as the
      // registry fallbacks above: a mangled value never mutes the game.
      sound: parsed.sound !== false,
      unlockAllStages: parsed.unlockAllStages === true,
    }
  } catch {
    // Private browsing, disabled storage, or corrupt JSON. Not worth failing
    // the boot over.
    return { ...defaults }
  }
}

selectVisualProfile(current.visualStyle)

export function getSettings(): Settings {
  return { ...current }
}

export function activeShape(): Shape {
  return getShape(current.shape)
}

export function activeTheme(): Theme {
  return getTheme(current.theme)
}

export function activeBackground(): Background {
  return getBackground(current.background)
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = { ...current, ...patch }
  current.visualStyle = getVisualProfile(current.visualStyle).id
  selectVisualProfile(current.visualStyle)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Setting still applies for this session; it just won't survive a reload.
  }
  return getSettings()
}
