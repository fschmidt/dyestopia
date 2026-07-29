import { mixComponents, type ColorId } from './colors'
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
 * authored in. Any other letter is also a cell: stages use colour letters to
 * place tiles in the initial deal (see `stagePreset` in src/stage.ts), and
 * the mask doesn't care which. Rows may be ragged; short rows pad with gaps.
 */
export function parseMask(rows: string[]): Grid {
  const cols = Math.max(...rows.map((row) => row.length))
  if (rows.length > BOARD_AREA || cols > BOARD_AREA) {
    throw new Error(`Board masks must fit ${BOARD_AREA}x${BOARD_AREA}, got ${cols}x${rows.length}`)
  }
  const mask = rows.flatMap((row) =>
    Array.from({ length: cols }, (_, col) => col < row.length && row[col] !== '.'),
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
 * Would dyeing `target` to `result` clear anything? The mix-legality dry run,
 * and deliberately *narrower* than the mix's actual effect: only the target
 * converts here, so a mix is legal exactly when the dyed target completes a
 * line with two result-coloured tiles already in place. The dragged tile
 * (which also converts when the mix goes ahead) supplies nothing to legality,
 * and neither does the combo wave — mixes are earned by setup, not conjured
 * by the pair itself. This is what makes drops directional: dragging yellow
 * onto a red beside two oranges mixes; dragging that red onto the yellow
 * does not.
 */
export function mergeClears(grid: Grid, cells: Cells, target: number, result: ColorId): boolean {
  if (cells[target] === null) return false
  const trial = cells.slice()
  trial[target] = result
  return findMatches(grid, trial).size > 0
}

/** What a drop resolves to. Merges carry the colour both tiles become. */
export type Move = { kind: 'merge'; result: ColorId } | { kind: 'swap' } | { kind: 'illegal' }

/**
 * The single entry point for a drop onto a neighbour: merge before swap.
 * `from` is the dragged tile, `to` the one it lands on — and since mix
 * legality anchors on the target (see `mergeClears`), the same pair can
 * resolve differently in the two directions: the dye pours from the dragged
 * tile onto the target.
 *
 * 1. If the pair mixes and the dyed *target* would complete a line, it
 *    merges (both tiles then take the result colour).
 * 2. Otherwise, if the swap would clear, it swaps — which also catches
 *    mergeable pairs whose mix would not match: the swap gets its chance
 *    rather than the drop dead-ending. Swaps stay direction-blind.
 * 3. Neither clears → illegal; the drop returns home and costs nothing.
 *
 * A same-colour drop falls out illegal by construction: identical colours
 * mix into nothing, and `swapClears` knows swapping them changes nothing.
 */
export function resolveMove(grid: Grid, cells: Cells, mix: MixRule, from: number, to: number): Move {
  const dragged = cells[from]
  const target = cells[to]
  if (dragged === null || target === null || !isAdjacent(grid, from, to)) return { kind: 'illegal' }
  const result = mix(dragged, target)
  if (result && mergeClears(grid, cells, to, result)) return { kind: 'merge', result }
  if (swapClears(grid, cells, from, to)) return { kind: 'swap' }
  return { kind: 'illegal' }
}

/**
 * Any legal move on the board — swap or merge — or null: the dead-board
 * detector, and later the hint system. Returned as `[from, to]` in a
 * direction that actually resolves: mixes are directional, so each adjacent
 * pair is tried both ways.
 */
export function findLegalMove(
  grid: Grid,
  cells: Cells,
  mix: MixRule = NO_MIX,
): [number, number] | null {
  for (let index = 0; index < grid.mask.length; index++) {
    if (!grid.mask[index]) continue
    for (const other of [index + 1, index + grid.cols]) {
      if (resolveMove(grid, cells, mix, index, other).kind !== 'illegal') {
        return [index, other]
      }
      if (resolveMove(grid, cells, mix, other, index).kind !== 'illegal') {
        return [other, index]
      }
    }
  }
  return null
}

/** One tile taking a new colour in a combo wave, `step` hops from the merge. */
export interface Conversion {
  index: number
  color: ColorId
  /** BFS distance from the triggering change — the ripple's stagger. */
  step: number
}

/** The four masked orthogonal neighbours (fewer at edges and gaps). */
function maskedNeighbours(grid: Grid, index: number): number[] {
  const out: number[] = []
  for (const n of [index - grid.cols, index - 1, index + 1, index + grid.cols]) {
    if (n >= 0 && n < grid.mask.length && isAdjacent(grid, index, n)) out.push(n)
  }
  return out
}

/**
 * The combo prototype (roadmap M3, behind `flags.combo`): a freshly mixed
 * colour *absorbs its own ingredients*. When a tile's colour changes, any
 * adjacent group of either component colour converts to the new colour —
 * an orange merge soaks up neighbouring reds and yellows, flood-fill style —
 * and freshly absorbed tiles keep the wave rolling. Each cell converts at
 * most once, which bounds the whole affair.
 *
 * The wave only ever spreads the merge's result, which is stage-gated by
 * merge legality already — so it never litters the board with colours the
 * stage doesn't play.
 *
 * Mutates `cells`; the returned list carries each conversion's BFS distance
 * from the trigger so the scene can play the recolour as a travelling
 * ripple.
 */
export function comboConversions(grid: Grid, cells: Cells, changed: number[]): Conversion[] {
  const out: Conversion[] = []
  const locked = new Set(changed)
  let frontier = changed.map((index) => ({ index, step: 0 }))

  while (frontier.length > 0) {
    const next: { index: number; step: number }[] = []
    for (const { index, step } of frontier) {
      const colour = cells[index]
      if (colour === null) continue
      const ingredients = mixComponents(colour)
      if (!ingredients) continue
      for (const contact of maskedNeighbours(grid, index)) {
        if (locked.has(contact)) continue
        const other = cells[contact]
        if (other === null || !ingredients.includes(other)) continue

        // Flood the connected `other`-coloured group from the contact point,
        // converting as it goes — the wave rolls outward through the group,
        // not to colour twins elsewhere on the board.
        const queue = [{ index: contact, step: step + 1 }]
        locked.add(contact)
        while (queue.length > 0) {
          const tile = queue.shift()!
          cells[tile.index] = colour
          out.push({ index: tile.index, color: colour, step: tile.step })
          next.push(tile)
          for (const beyond of maskedNeighbours(grid, tile.index)) {
            if (!locked.has(beyond) && cells[beyond] === other) {
              locked.add(beyond)
              queue.push({ index: beyond, step: tile.step + 1 })
            }
          }
        }
      }
    }
    frontier = next
  }
  return out
}

/**
 * A fresh board: every masked cell seeded, no match already sitting on the
 * board, and at least one legal move waiting.
 *
 * `preset` fixes chosen cells to authored colours before the random fill —
 * how stages start a primaries-seeded board with a few secondaries already
 * placed. Preset cells survive the deal untouched; three of them in a line
 * is an authoring error, not something the deal can fix, so it throws.
 */
export function generateBoard(
  grid: Grid,
  seed: ColorId[],
  rng: Rng,
  mix: MixRule = NO_MIX,
  preset?: (ColorId | undefined)[],
): Cells {
  const cells: Cells = new Array(grid.mask.length).fill(null)
  const fixed = new Set<number>()
  for (let index = 0; index < grid.mask.length; index++) {
    const color = preset?.[index]
    if (color !== undefined && grid.mask[index]) {
      cells[index] = color
      fixed.add(index)
    }
  }
  for (let index = 0; index < grid.mask.length; index++) {
    if (!grid.mask[index] || fixed.has(index)) continue
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
    const loose = [...matches].filter((index) => !fixed.has(index))
    if (loose.length === 0) {
      throw new Error('Stage preset deals a ready-made match')
    }
    for (const index of loose) cells[index] = rngPick(rng, seed)
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

/** The uninterrupted set of result colours mixed since the last legal swap. */
export interface ColorChain {
  results: ColorId[]
  multiplier: number
}

export function advanceColorChain(
  chain: ColorChain,
  result: ColorId,
  maxMultiplier: number,
): ColorChain {
  if (chain.results.includes(result)) return chain
  if (chain.multiplier >= maxMultiplier) return chain
  const results = [...chain.results, result]
  return { results, multiplier: results.length + 1 }
}

export function breakColorChain(_chain: ColorChain): ColorChain {
  return { results: [], multiplier: 1 }
}

export interface ScoreResolution {
  kind: 'normal' | 'chain' | 'ultimate'
  multiplier: number
  rainbow: boolean
}

export function scoreResolutionForMerge(
  chain: ColorChain,
  maxMultiplier: number,
): ScoreResolution {
  return {
    kind: 'normal',
    multiplier: chain.multiplier,
    rainbow: maxMultiplier > 1 && chain.multiplier >= maxMultiplier,
  }
}

export function scoreResolutionForSwap(
  chain: ColorChain,
  maxMultiplier: number,
): ScoreResolution {
  if (chain.multiplier <= 1) return { kind: 'normal', multiplier: 1, rainbow: false }
  const ultimate = maxMultiplier > 1 && chain.multiplier >= maxMultiplier
  return {
    kind: ultimate ? 'ultimate' : 'chain',
    multiplier: chain.multiplier * (ultimate ? 3 : 2),
    rainbow: ultimate,
  }
}

/**
 * Points for one clear. Clear size establishes the base value; the multiplier
 * is built by consecutive player mixes. Every automatic wave caused by that
 * move receives the same snapshot rather than growing merely for cascading.
 */
export function clearScore(count: number, multiplier: number): number {
  return count * 10 * multiplier
}
