import { DEFAULT_THEME, getTheme, type Theme } from './themes'
import { DEFAULT_SHAPE, getShape } from './tiles/shapes'
import type { Shape } from './tiles/shapes'

/**
 * Player settings, persisted across visits.
 *
 * Shape and theme are separate keys on purpose — they're orthogonal in the
 * renderer (artwork is baked white, colour is a tint), so there's no reason to
 * make the player choose them as a pair.
 */

export interface Settings {
  shape: string
  theme: string
}

const STORAGE_KEY = 'dyestopia:settings'

const defaults: Settings = { shape: DEFAULT_SHAPE, theme: DEFAULT_THEME }

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
    }
  } catch {
    // Private browsing, disabled storage, or corrupt JSON. Not worth failing
    // the boot over.
    return { ...defaults }
  }
}

export function getSettings(): Settings {
  return { ...current }
}

export function activeShape(): Shape {
  return getShape(current.shape)
}

export function activeTheme(): Theme {
  return getTheme(current.theme)
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Setting still applies for this session; it just won't survive a reload.
  }
  return getSettings()
}
