import { STAGES } from './stages'

/**
 * Stage progress, persisted across visits — the "close the tab and come back"
 * half of the meta. One number is the whole model: how many stages are
 * playable. Stage 1 always is; winning stage n unlocks stage n+1; replaying
 * anything already open is free.
 */

const STORAGE_KEY = 'dyestopia:progress'

let unlocked = load()

function clamp(value: number): number {
  if (!Number.isInteger(value)) return 1
  return Math.max(1, Math.min(value, STAGES.length))
}

function load(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 1
    // Clamped so a stale value from a build with more stages — or a
    // hand-edited one — degrades to something the select screen can render.
    return clamp((JSON.parse(raw) as { unlocked?: number }).unlocked ?? 1)
  } catch {
    // Private browsing, disabled storage, or corrupt JSON. Not worth failing
    // the boot over.
    return 1
  }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked }))
  } catch {
    // Progress still holds for this session; it just won't survive a reload.
  }
}

/** How many stages are playable, from the front. Always at least 1. */
export function unlockedCount(): number {
  return unlocked
}

/**
 * Record a win on stage `index` (0-based). True when it opened a new stage —
 * the select screen plays its unlock reveal off this.
 */
export function recordWin(index: number): boolean {
  const next = clamp(index + 2)
  if (next <= unlocked) return false
  unlocked = next
  save()
  return true
}

/** Back to only stage 1 — for tests and console archaeology. */
export function resetProgress(): void {
  unlocked = 1
  save()
}
