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
 * The dev stage: a plain 8×8 board for shaking down the engine.
 *
 * Five seed colours, though the design says refills drop primaries only. A
 * merge is only legal when it clears, and the merge supplies just 2 of the 3
 * result-coloured tiles a match needs — so the first merge needs a secondary
 * already on the board. Here the seed provides them; authored stages (M4)
 * will instead start primaries-only boards with secondaries placed in the
 * initial deal, making every one on the board player-made. Purple stays out:
 * nothing seeds it, so a red+blue merge could never clear.
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
