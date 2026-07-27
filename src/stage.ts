import { mixResult, type ColorId } from './colors'

/**
 * A stage: which colours are in play. The board is seeded from `seed`, merges
 * may only produce colours in `active`, and `goals` is what the round asks the
 * player to create.
 */
export interface Stage {
  active: ColorId[]
  seed: ColorId[]
  goals: ColorId[]
}

/**
 * The demo stage. Purple is deliberately not active: red + blue has a
 * perfectly good mix, but this stage doesn't allow it, so that pair swaps
 * instead — the activation rule made visible.
 */
export const DEMO_STAGE: Stage = {
  active: ['red', 'yellow', 'blue', 'orange', 'green'],
  seed: ['red', 'yellow', 'blue'],
  goals: ['orange', 'green'],
}

/** The colour merging `a` and `b` produces here, if the stage allows it. */
export function stageMix(stage: Stage, a: string, b: string): ColorId | undefined {
  const result = mixResult(a, b)
  return result && stage.active.includes(result) ? result : undefined
}
