import { expect, test } from '@playwright/test'

import {
  applyGravity,
  advanceColorChain,
  breakColorChain,
  clearScore,
  comboConversions,
  findLegalMove,
  findMatches,
  generateBoard,
  mergeClears,
  parseMask,
  refill,
  reshuffle,
  resolveMove,
  swapClears,
  type ColorChain,
  type Cells,
  type Grid,
} from '../src/board'
import { mixResult, type ColorId } from '../src/colors'
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
    expect(findLegalMove(grid, live)).not.toBeNull()

    // Diagonal stripes of three colours: every row and column cycles r-y-b,
    // so any two cells within distance two differ — no swap can complete a
    // run, because the two unswapped cells of the run would have to match.
    const dead = cellsOf(grid, ['rybr', 'ybry', 'bryb'])
    expect(findMatches(grid, dead).size).toBe(0)
    expect(findLegalMove(grid, dead)).toBeNull()
  })
})

test.describe('merge resolution', () => {
  const grid = parseMask(['####', '####', '####'])

  test('a mix clears exactly when the dyed target completes a line', () => {
    // Dragging the r at 0 onto the y at 1: the dyed target joins the two
    // oranges already on the row. The dragged tile supplies nothing.
    const cells = cellsOf(grid, ['ryoo', 'bgbg', 'gbgb'])
    expect(mergeClears(grid, cells, 1, 'orange')).toBe(true)
    // The other direction: dyeing 0 leaves it out of line with the pair.
    expect(mergeClears(grid, cells, 0, 'orange')).toBe(false)
    // A colour with no pair on the board never clears.
    expect(mergeClears(grid, cells, 1, 'green')).toBe(false)
  })

  test('mixing is directional — the dye pours onto the target', () => {
    // The roadmap's canonical example: o-o-r-y. Dragging the yellow onto the
    // red dyes it orange beside the pair; dragging the red onto the yellow
    // dyes a tile no orange lines up with, and the swap clears nothing
    // either.
    const row = parseMask(['####'])
    const cells = cellsOf(row, ['oory'])
    expect(resolveMove(row, cells, mixResult, 3, 2)).toEqual({
      kind: 'merge',
      result: 'orange',
    })
    expect(resolveMove(row, cells, mixResult, 2, 3)).toEqual({ kind: 'illegal' })
  })

  test('merge wins over a swap that would also clear', () => {
    // Dragging r(0) onto y(1) lines the dyed target up with the oranges;
    // swapping them would line up y-y-y down the left column instead.
    // Merge-before-swap picks the merge — and the other direction, whose
    // mix cannot clear, falls through to that same swap.
    const cells = cellsOf(grid, ['ryoo', 'yrgb', 'ybgg'])
    expect(swapClears(grid, cells, 0, 1)).toBe(true)
    expect(resolveMove(grid, cells, mixResult, 0, 1)).toEqual({
      kind: 'merge',
      result: 'orange',
    })
    expect(resolveMove(grid, cells, mixResult, 1, 0)).toEqual({ kind: 'swap' })
  })

  test('the swap gets its chance when the merge would not clear', () => {
    // y(1) and r(5) mix into orange, but no third orange exists — the swap,
    // which lines up r-r-r on the top row, happens instead.
    const cells = cellsOf(grid, ['ryrr', 'yrgb', 'bgyg'])
    expect(resolveMove(grid, cells, mixResult, 1, 5)).toEqual({ kind: 'swap' })
  })

  test('neither clearing means illegal — mixable or not', () => {
    const cells = cellsOf(grid, ['ryrr', 'yrgb', 'bgyg'])
    // y(4) and b(8) mix into green, but neither the merge nor the swap clears.
    expect(resolveMove(grid, cells, mixResult, 4, 8)).toEqual({ kind: 'illegal' })
    // Non-adjacent cells are never a move.
    expect(resolveMove(grid, cells, mixResult, 0, 2)).toEqual({ kind: 'illegal' })
  })

  test('the pair alone never makes a mix legal — setup does', () => {
    const row = parseMask(['####'])
    // r+y would mix, but the dyed target completes no orange line: the pair
    // supplies nothing to legality, in either direction.
    const cells = cellsOf(row, ['ryrb'])
    expect(resolveMove(row, cells, mixResult, 0, 1)).toEqual({ kind: 'illegal' })
    expect(resolveMove(row, cells, mixResult, 1, 0)).toEqual({ kind: 'illegal' })

    // The setup tiles may also flank the target: dragging the red up onto
    // the yellow dyes the cell *between* the two oranges.
    const cross = parseMask(['###', '.#.'])
    const flanked = cellsOf(cross, ['oyo', '.r.'])
    expect(resolveMove(cross, flanked, mixResult, 4, 1)).toEqual({
      kind: 'merge',
      result: 'orange',
    })
  })

  test('a board dead to swaps can be alive through a mix', () => {
    // One row: no swap rearranges o-o-r-y into a run, but dragging the
    // yellow onto the red dyes it into the pair's line — and the finder
    // reports the working direction.
    const row = parseMask(['####'])
    const cells = cellsOf(row, ['oory'])
    expect(findLegalMove(row, cells)).toBeNull()
    expect(findLegalMove(row, cells, mixResult)).toEqual([3, 2])
  })
})

test.describe('combo conversions (M3 prototype)', () => {
  test('the fresh colour absorbs adjacent ingredient groups, and the wave chains', () => {
    const grid = parseMask(['#####'])
    // The orange at 0 just changed. It soaks up the red group, the absorbed
    // tiles reach the yellow, and that reaches the last red — the whole row
    // rolls orange, one step at a time.
    const cells = cellsOf(grid, ['orryr'])
    expect(comboConversions(grid, cells, [0])).toEqual([
      { index: 1, color: 'orange', step: 1 },
      { index: 2, color: 'orange', step: 2 },
      { index: 3, color: 'orange', step: 3 },
      { index: 4, color: 'orange', step: 4 },
    ])
    expect(cells).toEqual(new Array(5).fill('orange'))
  })

  test('non-ingredient colours stop the wave — twins beyond stay put', () => {
    const grid = parseMask(['#####'])
    // Green absorbs blue and yellow only; the red wall shields the far blue.
    const cells = cellsOf(grid, ['gbbrb'])
    expect(comboConversions(grid, cells, [0])).toEqual([
      { index: 1, color: 'green', step: 1 },
      { index: 2, color: 'green', step: 2 },
    ])
    expect(cells).toEqual(['green', 'green', 'green', 'red', 'blue'])
  })

  test('primaries absorb nothing — only mixed colours have ingredients', () => {
    const grid = parseMask(['###'])
    expect(comboConversions(grid, cellsOf(grid, ['ryb']), [0])).toEqual([])
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
    expect(findLegalMove(grid, first)).not.toBeNull()
  })

  test('holds across many seeds', () => {
    for (let n = 0; n < 50; n++) {
      const cells = generateBoard(grid, seed, mulberry32(n))
      expect(findMatches(grid, cells).size).toBe(0)
      expect(findLegalMove(grid, cells)).not.toBeNull()
    }
  })
})

test.describe('reshuffle', () => {
  test('rearranges the same tiles into a live, match-free board', () => {
    const grid = parseMask(['####', '####', '####'])
    // The dead diagonal-stripe board again — 4r + 4y + 4b has plenty of live,
    // match-free arrangements for the search to land on.
    const cells = cellsOf(grid, ['rybr', 'ybry', 'bryb'])
    expect(findLegalMove(grid, cells)).toBeNull()

    const { cells: next, moves } = reshuffle(grid, cells, mulberry32(5))

    expect([...next].sort()).toEqual([...cells].sort())
    expect(findMatches(grid, next).size).toBe(0)
    expect(findLegalMove(grid, next)).not.toBeNull()

    // The move list really is the delta between the two arrangements.
    const replayed = cells.slice()
    for (const { from, to } of moves) replayed[to] = cells[from]
    expect(replayed).toEqual(next)
  })
})

test.describe('scoring', () => {
  test('applies the player-built multiplier to base clear points', () => {
    expect(clearScore(3, 1)).toBe(30)
    expect(clearScore(4, 1)).toBe(40)
    expect(clearScore(3, 2)).toBe(60)
    expect(clearScore(3, 3)).toBe(90)
  })

  test('mixing distinct result colours grows a chain while repeats hold it', () => {
    const empty: ColorChain = { results: [], multiplier: 1 }
    const orange = advanceColorChain(empty, 'orange')
    expect(orange).toEqual({ results: ['orange'], multiplier: 2 })
    expect(advanceColorChain(orange, 'orange')).toEqual(orange)
    expect(advanceColorChain(orange, 'green')).toEqual({
      results: ['orange', 'green'],
      multiplier: 3,
    })
  })

  test('swapping breaks the chain back to one', () => {
    expect(breakColorChain({ results: ['orange', 'green'], multiplier: 3 })).toEqual({
      results: [],
      multiplier: 1,
    })
  })
})
