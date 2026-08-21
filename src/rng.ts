/**
 * Seedable randomness for everything gameplay-visible, as a value.
 *
 * The engine never touches `Math.random`: every board build, refill and
 * reshuffle draws from an `Rng` handed in with the position it is acting on.
 * That one indirection is what makes boards reproducible — a Playwright test
 * (or a curious console user) plants a seed through the debug bridge and the
 * next round is identical, tile for tile.
 *
 * **A stream is a number, not a closure** (`T-020`). mulberry32 keeps one
 * uint32 of state, so a draw is `state in, value and next state out` and a
 * position can be copied, stored, compared and *forked*: evaluate a move
 * against a copy, throw the copy away, and the round it was forked from has not
 * advanced. A closure could not be forked, which is why `immediateScore` could
 * never simulate a cascade and why `I-029` existed as an obstacle rather than a
 * question.
 */

/** mulberry32's whole state. One uint32, so copying a stream is copying it. */
export interface Rng {
  readonly state: number
}

/** A stream at its start. Same seed in, same sequence out, for ever. */
export function mulberry32(seed: number): Rng {
  return { state: seed >>> 0 }
}

/** One draw, uniformly in [0, 1), with the stream that follows it. */
export function rngNext(rng: Rng): [number, Rng] {
  const state = (rng.state + 0x6d2b79f5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, { state }]
}

/** Uniform integer in [0, n). */
export function rngInt(rng: Rng, n: number): [number, Rng] {
  const [value, next] = rngNext(rng)
  return [Math.floor(value * n), next]
}

/** One element of a non-empty array. */
export function rngPick<T>(rng: Rng, items: readonly T[]): [T, Rng] {
  const [index, next] = rngInt(rng, items.length)
  return [items[index], next]
}

/** Fisher–Yates, into a fresh array. */
export function rngShuffle<T>(rng: Rng, items: readonly T[]): [T[], Rng] {
  const shuffled = items.slice()
  let next = rng
  for (let i = shuffled.length - 1; i > 0; i--) {
    const [j, advanced] = rngInt(next, i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    next = advanced
  }
  return [shuffled, next]
}

// The debug bridge plants a seed here; the Game scene consumes it when it next
// builds a board. One-shot on purpose — a forgotten seed must not quietly make
// every later round identical. This is a channel into the scene rather than
// part of the engine: what crosses it is a seed, never a stream.
let pendingSeed: number | undefined

export function plantSeed(seed: number): void {
  pendingSeed = seed
}

export function takeSeed(): number | undefined {
  const seed = pendingSeed
  pendingSeed = undefined
  return seed
}
