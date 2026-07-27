import { expect, test } from '@playwright/test'

import {
  applyGravity,
  clearScore,
  findLegalSwap,
  findMatches,
  generateBoard,
  parseMask,
  refill,
  reshuffle,
  swapClears,
  type Cells,
  type Grid,
} from '../src/board'
import type { ColorId } from '../src/colors'
import { mulberry32 } from '../src/rng'

/**
 * The match engine is pure data-in data-out, so it gets exercised here
 * directly — no browser, no Phaser, no timing. The specs against the running
 * game (match.spec.ts) only need to prove the scene obeys this model.
 */

/** Cells from rows of colour initials — `r`/`y`/`b`/`o`/`g`, `.` for empty/gap. */
function cellsOf(grid: Grid, rows: string[]): Cells {
  const byInitial: Record<string, ColorId> = {
    r: 'red',
    y: 'yellow',
    b: 'blue',
    o: 'orange',
    g: 'green',
  }
  return Array.from({ length: grid.cols * grid.rows }, (_, i) => {
    const char = rows[Math.floor(i / grid.cols)]?.[i % grid.cols]
    return char && char !== '.' ? byInitial[char] : null
  })
}

test.describe('mask parsing', () => {
  test('reads # as cells, pads ragged rows, rejects oversize masks', () => {
    const grid = parseMask(['###', '#.##', '##'])
    expect(grid.cols).toBe(4)
    expect(grid.rows).toBe(3)
    expect(grid.mask).toEqual([
      true, true, true, false,
      true, false, true, true,
      true, true, false, false,
    ])
    expect(() => parseMask(Array(11).fill('#'))).toThrow(/10x10/)
  })
})

test.describe('match detection', () => {
  const grid = parseMask(['####', '####', '####'])

  test('finds rows, columns, and their overlaps', () => {
    const cells = cellsOf(grid, ['rrry', 'ybyy', 'rbgy'])
    // Top row holds r-r-r; the right column y-y-y; they share nothing.
    expect(findMatches(grid, cells)).toEqual(new Set([0, 1, 2, 3, 7, 11]))
  })

  test('needs three — pairs are not matches', () => {
    const cells = cellsOf(grid, ['rryy', 'yrrb', 'ryry'])
    expect(findMatches(grid, cells).size).toBe(0)
  })

  test('mask gaps break runs', () => {
    const gapped = parseMask(['##.#'])
    // Three reds in the row, but the gap splits them 2 + 1.
    const cells = cellsOf(gapped, ['rr.r'])
    expect(findMatches(gapped, cells).size).toBe(0)
  })

  test('empty cells break runs', () => {
    const cells = cellsOf(grid, ['r.rr', 'yyby', 'bgbg'])
    expect(findMatches(grid, cells).size).toBe(0)
  })
})

test.describe('gravity and refill', () => {
  test('tiles compact to the bottom of their column', () => {
    const grid = parseMask(['#', '#', '#', '#'])
    const cells = cellsOf(grid, ['r', '.', 'y', '.'])
    const moves = applyGravity(grid, cells)
    expect(cells).toEqual([null, null, 'red', 'yellow'])
    // Order within the column survives the fall.
    expect(moves).toEqual([
      { from: 2, to: 3 },
      { from: 0, to: 2 },
    ])
  })

  test('tiles fall through mask gaps', () => {
    const grid = parseMask(['#', '.', '#'])
    const cells = cellsOf(grid, ['r', '.', '.'])
    applyGravity(grid, cells)
    expect(cells).toEqual([null, null, 'red'])
  })

  test('refill fills exactly the empty masked cells, from the seed list', () => {
    const grid = parseMask(['##', '.#'])
    const cells = cellsOf(grid, ['r.', '..'])
    const spawns = refill(grid, cells, ['blue'], mulberry32(7))
    expect(spawns.map((s) => s.index).sort()).toEqual([1, 3])
    expect(cells).toEqual(['red', 'blue', null, 'blue'])
  })
})

test.describe('move legality', () => {
  const grid = parseMask(['####', '####', '####'])

  test('a swap is legal exactly when it clears', () => {
    const cells = cellsOf(grid, ['ryrr', 'yrgb', 'bgyg'])
    // Swapping the y at 1 with the r at 5 lines up r-r-r on the top row.
    expect(swapClears(grid, cells, 1, 5)).toBe(true)
    // Swapping 4 and 8 lines up nothing.
    expect(swapClears(grid, cells, 4, 8)).toBe(false)
  })

  test('same-colour swaps are never legal', () => {
    // The g-g-g line is already on the board (a mid-cascade state). Swapping
    // the identical pair at 0-1 changes nothing and must not ride that line
    // to legality.
    const cells = cellsOf(grid, ['rryb', 'ygob', 'gggo'])
    expect(swapClears(grid, cells, 0, 1)).toBe(false)
  })

  test('finds a legal move, and knows a dead board', () => {
    const live = cellsOf(grid, ['ryrr', 'yrgb', 'bgyg'])
    expect(findLegalSwap(grid, live)).not.toBeNull()

    // Diagonal stripes of three colours: every row and column cycles r-y-b,
    // so any two cells within distance two differ — no swap can complete a
    // run, because the two unswapped cells of the run would have to match.
    const dead = cellsOf(grid, ['rybr', 'ybry', 'bryb'])
    expect(findMatches(grid, dead).size).toBe(0)
    expect(findLegalSwap(grid, dead)).toBeNull()
  })
})

test.describe('board generation', () => {
  const grid = parseMask(['######', '######', '######', '######', '######', '######'])
  const seed: ColorId[] = ['red', 'yellow', 'blue', 'orange', 'green']

  test('deals full, match-free, live boards — deterministically per seed', () => {
    const first = generateBoard(grid, seed, mulberry32(42))
    const again = generateBoard(grid, seed, mulberry32(42))
    const other = generateBoard(grid, seed, mulberry32(43))

    expect(again).toEqual(first)
    expect(other).not.toEqual(first)
    expect(first.every((c, i) => (grid.mask[i] ? c !== null : c === null))).toBe(true)
    expect(findMatches(grid, first).size).toBe(0)
    expect(findLegalSwap(grid, first)).not.toBeNull()
  })

  test('holds across many seeds', () => {
    for (let n = 0; n < 50; n++) {
      const cells = generateBoard(grid, seed, mulberry32(n))
      expect(findMatches(grid, cells).size).toBe(0)
      expect(findLegalSwap(grid, cells)).not.toBeNull()
    }
  })
})

test.describe('reshuffle', () => {
  test('rearranges the same tiles into a live, match-free board', () => {
    const grid = parseMask(['####', '####', '####'])
    // The dead diagonal-stripe board again — 4r + 4y + 4b has plenty of live,
    // match-free arrangements for the search to land on.
    const cells = cellsOf(grid, ['rybr', 'ybry', 'bryb'])
    expect(findLegalSwap(grid, cells)).toBeNull()

    const { cells: next, moves } = reshuffle(grid, cells, mulberry32(5))

    expect([...next].sort()).toEqual([...cells].sort())
    expect(findMatches(grid, next).size).toBe(0)
    expect(findLegalSwap(grid, next)).not.toBeNull()

    // The move list really is the delta between the two arrangements.
    const replayed = cells.slice()
    for (const { from, to } of moves) replayed[to] = cells[from]
    expect(replayed).toEqual(next)
  })
})

test.describe('scoring', () => {
  test('scales with tiles cleared and cascade wave', () => {
    expect(clearScore(3, 1)).toBe(30)
    expect(clearScore(4, 1)).toBe(40)
    expect(clearScore(3, 2)).toBe(60)
  })
})
