/**
 * Seedable randomness for everything gameplay-visible.
 *
 * The engine never touches `Math.random` directly: every board build, refill
 * and reshuffle draws from an `Rng` handed in by the scene. That one
 * indirection is what makes boards reproducible — a Playwright test (or a
 * curious console user) plants a seed through the debug bridge and the next
 * round is identical, tile for tile.
 */

/** Returns uniformly in [0, 1), like `Math.random`. */
export type Rng = () => number

/** mulberry32 — tiny, fast, and plenty for shuffling tiles. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform integer in [0, n). */
export function rngInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n)
}

/** One element of a non-empty array. */
export function rngPick<T>(rng: Rng, items: T[]): T {
  return items[rngInt(rng, items.length)]
}

/** In-place Fisher–Yates. */
export function rngShuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

// The debug bridge plants a seed here; the Game scene consumes it when it next
// builds a board. One-shot on purpose — a forgotten seed must not quietly make
// every later round identical.
let pendingSeed: number | undefined

export function plantSeed(seed: number): void {
  pendingSeed = seed
}

export function takeSeed(): number | undefined {
  const seed = pendingSeed
  pendingSeed = undefined
  return seed
}
