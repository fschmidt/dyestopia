import type { Grid } from './board'
import { mixComponents, mixResult, type ColorId } from './colors'

/**
 * A stage: which colours are in play, the shape of the board they play on,
 * and what winning it takes. The board is seeded (and refilled) from `seed`,
 * merges may only produce colours in `active`, and the round is won by
 * reaching `threshold` points within `moves` legal moves.
 *
 * `board` is authored as rows of `#` (cell), `.` (gap) and colour letters
 * (a cell whose initial deal is fixed — see `stagePreset`). Sizes and shapes
 * are stage data; the layout only guarantees a 10×10 area for them to fit in.
 */
export interface Stage {
  name: string
  /** The one teaching line under the board. */
  hint: string
  /** Score that wins the stage. Tuning numbers, not design — see clearScore. */
  threshold: number
  /** Legal moves the player may spend; illegal drops and reshuffles are free. */
  moves: number
  active: ColorId[]
  seed: ColorId[]
  board: string[]
}

/**
 * The colour letters `board` rows may use. Refills only ever drop `seed`
 * colours, so these are how a stage places the secondaries and tertiaries its
 * first mixes need — a mix is legal only when the dyed target completes a
 * line with two result-coloured tiles already in place, so stages author
 * them as in-line pairs.
 */
const LETTER_COLORS: Record<string, ColorId> = {
  r: 'red',
  y: 'yellow',
  b: 'blue',
  o: 'orange',
  g: 'green',
  p: 'purple',
  v: 'vermilion',
  a: 'amber',
  c: 'chartreuse',
  t: 'teal',
  i: 'violet', // v is taken by vermilion
  m: 'magenta',
}

/**
 * The authored part of a stage's opening deal: colour letters in the board
 * rows, as a sparse per-index array `generateBoard` lays down before the
 * random fill.
 */
export function stagePreset(rows: string[], grid: Grid): (ColorId | undefined)[] {
  const preset: (ColorId | undefined)[] = new Array(grid.mask.length).fill(undefined)
  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col++) {
      const letter = row[col]
      if (letter === '#' || letter === '.') continue
      const color = LETTER_COLORS[letter]
      if (!color) {
        throw new Error(`Unknown board letter "${letter}" in row ${rowIndex}`)
      }
      preset[rowIndex * grid.cols + col] = color
    }
  })
  return preset
}

/**
 * The dev stage: a plain 8×8 board for shaking down the engine, reachable
 * only through the debug bridge (`goTo('Game')` with no stage). The budget is
 * effectively bottomless so engine tests never trip over the win/lose flow.
 *
 * Five seed colours, though the design says refills drop primaries only — the
 * seed provides the secondaries a first merge needs. Authored stages instead
 * start primaries-only boards with secondaries placed in the initial deal
 * (colour letters in `board`), making every one on the board player-made.
 * Purple stays out: nothing seeds it, so a red+blue merge could never clear.
 */
export const FIRST_STAGE: Stage = {
  name: 'Dev board',
  hint: 'Drag a tile onto a neighbour — mix a colour, or line up 3',
  threshold: 999999,
  moves: 999,
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

export interface StageMix {
  result: ColorId
  ingredients: [ColorId, ColorId]
}

/** Every recipe whose result and both ingredients are available in this stage. */
export function stageMixes(stage: Stage): StageMix[] {
  return stage.active.flatMap((result) => {
    const ingredients = mixComponents(result)
    return ingredients?.every((ingredient) => stage.active.includes(ingredient))
      ? [{ result, ingredients }]
      : []
  })
}

/** ×1 plus every active mix result whose ingredients are active here too. */
export function stageMaxMultiplier(stage: Stage): number {
  return 1 + stageMixes(stage).length
}
