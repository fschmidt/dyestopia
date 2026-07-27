import { mixResult, type ColorId } from './colors'

/**
 * A stage: which colours are in play, and the shape of the board they play
 * on. The board is seeded (and refilled) from `seed`, and merges may only
 * produce colours in `active`.
 *
 * `board` is authored as rows of `#` (cell) and `.` (gap) — see
 * `parseMask` in src/board.ts. Sizes and shapes are stage data; the layout
 * only guarantees a 10×10 area for them to fit in.
 */
export interface Stage {
  active: ColorId[]
  seed: ColorId[]
  board: string[]
}

/**
 * The M1 engine stage: a plain 8×8 board for shaking down the match engine.
 *
 * Five seed colours, though the design says refills drop primaries only —
 * with three colours nearly every swap matches and legality stops meaning
 * anything, which makes for a poor test bench. Once merging lands (M2) and
 * stages are authored (M4), seed lists shrink back toward the primaries and
 * the mixed colours become player-made again.
 */
export const FIRST_STAGE: Stage = {
  active: ['red', 'yellow', 'blue', 'orange', 'green'],
  seed: ['red', 'yellow', 'blue', 'orange', 'green'],
  board: [
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
  ],
}

/** The colour merging `a` and `b` produces here, if the stage allows it. */
export function stageMix(stage: Stage, a: string, b: string): ColorId | undefined {
  const result = mixResult(a, b)
  return result && stage.active.includes(result) ? result : undefined
}
