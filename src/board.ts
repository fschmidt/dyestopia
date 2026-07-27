import type { ColorId } from './colors'
import { rngPick, rngShuffle, type Rng } from './rng'

/**
 * The match engine: everything about the board that is true regardless of how
 * it is drawn. No Phaser in here — the scene owns tiles and tweens, this owns
 * colours and cells, and the seam between them is index-addressed move lists
 * (falls, spawns, shuffle moves) the scene turns into animation.
 *
 * A board is a *cell mask*, not a rectangle. Stages carve their playfield out
 * of a grid — a 3×3 tutorial square, a full board, a triangle — and every rule
 * here (matching, gravity, refill, legality) follows the mask. Nothing may
 * assume cols × rows; the mask is the single source of board shape.
 */

/** The layout reserves this many cells each way; masks must fit inside it. */
export const BOARD_AREA = 10

export interface Grid {
  cols: number
  rows: number
  /** Row-major; `true` marks a playable cell. */
  mask: boolean[]
}

/**
 * Board contents, row-major over the grid. `null` is an empty playable cell;
 * cells outside the mask are `null` too and stay that way.
 */
export type Cells = (ColorId | null)[]

/** A tile moving between cells — gravity, or a reshuffle. */
export interface CellMove {
  from: number
  to: number
}

/** A new tile entering the board. */
export interface Spawn {
  index: number
  color: ColorId
}

/**
 * Parse a mask from rows of `#` (cell) and `.` (gap) — the shape stages are
 * authored in. Rows may be ragged; short rows pad with gaps.
 */
export function parseMask(rows: string[]): Grid {
  const cols = Math.max(...rows.map((row) => row.length))
  if (rows.length > BOARD_AREA || cols > BOARD_AREA) {
    throw new Error(`Board masks must fit ${BOARD_AREA}x${BOARD_AREA}, got ${cols}x${rows.length}`)
  }
  const mask = rows.flatMap((row) =>
    Array.from({ length: cols }, (_, col) => row[col] === '#'),
  )
  return { cols, rows: rows.length, mask }
}

export function cellIndex(grid: Grid, col: number, row: number): number {
  return row * grid.cols + col
}

/** Orthogonal neighbours, both on the mask. */
export function isAdjacent(grid: Grid, a: number, b: number): boolean {
  if (!grid.mask[a] || !grid.mask[b]) return false
  const colGap = Math.abs((a % grid.cols) - (b % grid.cols))
  const rowGap = Math.abs(Math.floor(a / grid.cols) - Math.floor(b / grid.cols))
  return colGap + rowGap === 1
}

/**
 * Every cell in a straight run of 3+ matching colours. Runs are physical: a
 * mask gap or an empty cell breaks them, so matches never jump holes.
 */
export function findMatches(grid: Grid, cells: Cells): Set<number> {
  const matched = new Set<number>()

  const scan = (line: number[]): void => {
    let start = 0
    for (let i = 1; i <= line.length; i++) {
      const grown =
        i < line.length &&
        cells[line[i]] !== null &&
        cells[line[i]] === cells[line[start]] &&
        grid.mask[line[i]]
      if (grown) continue
      if (cells[line[start]] !== null && grid.mask[line[start]] && i - start >= 3) {
        for (let j = start; j < i; j++) matched.add(line[j])
      }
      start = i
    }
  }

  for (let row = 0; row < grid.rows; row++) {
    scan(Array.from({ length: grid.cols }, (_, col) => cellIndex(grid, col, row)))
  }
  for (let col = 0; col < grid.cols; col++) {
    scan(Array.from({ length: grid.rows }, (_, row) => cellIndex(grid, col, row)))
  }
  return matched
}

/**
 * Drop every tile to the lowest empty cell of its column, falling through mask
 * gaps. Mutates `cells`; the returned moves let the scene animate what moved.
 */
export function applyGravity(grid: Grid, cells: Cells): CellMove[] {
  const moves: CellMove[] = []
  for (let col = 0; col < grid.cols; col++) {
    // Masked cells of the column, bottom-up. A write cursor walks them and
    // each tile met on the way up lands on the cursor — the compaction that
    // *is* gravity on a masked board.
    const column: number[] = []
    for (let row = grid.rows - 1; row >= 0; row--) {
      const index = cellIndex(grid, col, row)
      if (grid.mask[index]) column.push(index)
    }
    let write = 0
    for (let read = 0; read < column.length; read++) {
      const tile = cells[column[read]]
      if (tile === null) continue
      if (read !== write) {
        cells[column[write]] = tile
        cells[column[read]] = null
        moves.push({ from: column[read], to: column[write] })
      }
      write++
    }
  }
  return moves
}

/**
 * Fill every empty cell with a colour drawn from the stage's seed list —
 * post-gravity, the empties are the top of each column, which is where new
 * tiles fall in from. Mutates `cells`.
 */
export function refill(grid: Grid, cells: Cells, seed: ColorId[], rng: Rng): Spawn[] {
  const spawns: Spawn[] = []
  for (let index = 0; index < grid.mask.length; index++) {
    if (!grid.mask[index] || cells[index] !== null) continue
    const color = rngPick(rng, seed)
    cells[index] = color
    spawns.push({ index, color })
  }
  return spawns
}

/**
 * What two colours mix into, if anything — the stage's merge rules, seen from
 * the engine. The engine takes a function rather than a stage so it stays
 * ignorant of stage data; `() => undefined` gives a merge-free board.
 */
export type MixRule = (a: ColorId, b: ColorId) => ColorId | undefined

const NO_MIX: MixRule = () => undefined

/** Would swapping `a` and `b` clear anything? The move-legality dry run. */
export function swapClears(grid: Grid, cells: Cells, a: number, b: number): boolean {
  if (cells[a] === null || cells[b] === null || cells[a] === cells[b]) return false
  const trial = cells.slice()
  ;[trial[a], trial[b]] = [trial[b], trial[a]]
  return findMatches(grid, trial).size > 0
}

/**
 * Would merging `a` and `b` into `result` clear anything? Both tiles take the
 * result colour in place — the merge supplies 2 of the 3 a match needs, so
 * this is true exactly when a third result-coloured tile already lines up.
 */
export function mergeClears(
  grid: Grid,
  cells: Cells,
  a: number,
  b: number,
  result: ColorId,
): boolean {
  if (cells[a] === null || cells[b] === null) return false
  const trial = cells.slice()
  trial[a] = trial[b] = result
  return findMatches(grid, trial).size > 0
}

/** What a drop resolves to. Merges carry the colour both tiles become. */
export type Move = { kind: 'merge'; result: ColorId } | { kind: 'swap' } | { kind: 'illegal' }

/**
 * The single entry point for a drop onto a neighbour: merge before swap.
 *
 * 1. If the pair mixes and the merge would clear, it merges.
 * 2. Otherwise, if the swap would clear, it swaps — which also catches
 *    mergeable pairs whose merge would not match: the swap gets its chance
 *    rather than the drop dead-ending.
 * 3. Neither clears → illegal; the drop returns home and costs nothing.
 *
 * A same-colour drop falls out illegal by construction: identical colours
 * mix into nothing, and `swapClears` knows swapping them changes nothing.
 */
export function resolveMove(
  grid: Grid,
  cells: Cells,
  mix: MixRule,
  a: number,
  b: number,
): Move {
  const first = cells[a]
  const second = cells[b]
  if (first === null || second === null || !isAdjacent(grid, a, b)) return { kind: 'illegal' }
  const result = mix(first, second)
  if (result && mergeClears(grid, cells, a, b, result)) return { kind: 'merge', result }
  if (swapClears(grid, cells, a, b)) return { kind: 'swap' }
  return { kind: 'illegal' }
}

/**
 * Any legal move on the board — swap or merge — or null: the dead-board
 * detector, and later the hint system.
 */
export function findLegalMove(
  grid: Grid,
  cells: Cells,
  mix: MixRule = NO_MIX,
): [number, number] | null {
  for (let index = 0; index < grid.mask.length; index++) {
    if (!grid.mask[index]) continue
    const right = index + 1
    if (resolveMove(grid, cells, mix, index, right).kind !== 'illegal') return [index, right]
    const below = index + grid.cols
    if (resolveMove(grid, cells, mix, index, below).kind !== 'illegal') return [index, below]
  }
  return null
}

/**
 * A fresh board: every masked cell seeded, no match already sitting on the
 * board, and at least one legal move waiting.
 */
export function generateBoard(
  grid: Grid,
  seed: ColorId[],
  rng: Rng,
  mix: MixRule = NO_MIX,
): Cells {
  const cells: Cells = new Array(grid.mask.length).fill(null)
  for (let index = 0; index < grid.mask.length; index++) {
    if (!grid.mask[index]) continue
    // Only the colours that would not complete a run of 3 with what's already
    // placed left and above. With under three seed colours every choice can be
    // forbidden — then any colour goes and the pre-clear below mops up.
    const allowed = seed.filter((color) => {
      cells[index] = color
      const matches = findMatches(grid, cells)
      cells[index] = null
      return !matches.has(index)
    })
    cells[index] = allowed.length > 0 ? rngPick(rng, allowed) : rngPick(rng, seed)
  }
  for (let matches = findMatches(grid, cells); matches.size > 0; matches = findMatches(grid, cells)) {
    for (const index of matches) cells[index] = rngPick(rng, seed)
  }
  if (!findLegalMove(grid, cells, mix)) return reshuffle(grid, cells, rng, mix).cells
  return cells
}

/**
 * Rearrange the existing tiles into a live board: same colours, new places,
 * no instant match, at least one legal move. Dead boards call this instead of
 * ending the round — the reshuffle costs the player nothing.
 *
 * Colour sets exist (all one colour, say) where no arrangement satisfies
 * both constraints, so the search degrades gracefully: first arrangement with
 * both, else with a legal move, else the last one tried.
 */
export function reshuffle(
  grid: Grid,
  cells: Cells,
  rng: Rng,
  mix: MixRule = NO_MIX,
): { cells: Cells; moves: CellMove[] } {
  const occupied: number[] = []
  for (let index = 0; index < grid.mask.length; index++) {
    if (grid.mask[index] && cells[index] !== null) occupied.push(index)
  }

  const arrange = (): { cells: Cells; moves: CellMove[] } => {
    const order = rngShuffle(rng, occupied.slice())
    const next = cells.slice()
    const moves: CellMove[] = []
    for (let i = 0; i < occupied.length; i++) {
      next[order[i]] = cells[occupied[i]]
      if (order[i] !== occupied[i]) moves.push({ from: occupied[i], to: order[i] })
    }
    return { cells: next, moves }
  }

  let fallback: { cells: Cells; moves: CellMove[] } | null = null
  let attempt = arrange()
  for (let tries = 0; tries < 120; tries++) {
    const live = findLegalMove(grid, attempt.cells, mix) !== null
    if (live && findMatches(grid, attempt.cells).size === 0) return attempt
    if (live && !fallback) fallback = attempt
    attempt = arrange()
  }
  return fallback ?? attempt
}

/**
 * Points for one clear. Tuning constants, not design: count is what the rules
 * reward, the wave multiplier is the cascade dopamine, and a merge-triggered
 * clear pays half again more than a swapped one — the twist should be worth
 * choosing. The caller flags only the clear the merge itself caused; cascade
 * waves after it score as cascades.
 */
export function clearScore(count: number, wave: number, merged = false): number {
  return count * (merged ? 15 : 10) * wave
}
