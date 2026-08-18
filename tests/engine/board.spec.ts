import { expect, test } from '@playwright/test'

import {
  applyGravity,
  advanceColorChain,
  breakColorChain,
  clearScore,
  findLegalMove,
  findMatches,
  generateBoard,
  mergeClears,
  parseMask,
  refill,
  reshuffle,
  resolveCascade,
  resolveMove,
  scoreResolutionForMerge,
  scoreResolutionForSwap,
  swapClears,
  type ColorChain,
  type Cells,
  type Grid,
} from '../../src/board'
import { colorValue, mixResult, type ColorId } from '../../src/colors'
import { mulberry32 } from '../../src/rng'

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

test.describe('the cascade', () => {
  // Bottom row clears; nothing above it lines up, so the wave count is the
  // clear plus whatever the refill happens to make.
  const grid = parseMask(['###', '###', '###', '###'])
  const rows = ['ygb', 'gyg', 'bgy', 'rrr']
  const seed: ColorId[] = ['red', 'yellow', 'blue']

  test('reports the clear, the fall and the refill as one wave', () => {
    const cells = cellsOf(grid, rows)
    const [first] = resolveCascade(grid, cells, 1, seed, mulberry32(11))

    expect(first.matched).toEqual([9, 10, 11])
    expect(first.colors).toEqual(['red', 'red', 'red'])
    expect(first.points).toBe(colorValue('red') * 3)
    // Every column shuffles down one, bottom-up, column by column.
    expect(first.falls).toEqual([
      { from: 6, to: 9 },
      { from: 3, to: 6 },
      { from: 0, to: 3 },
      { from: 7, to: 10 },
      { from: 4, to: 7 },
      { from: 1, to: 4 },
      { from: 8, to: 11 },
      { from: 5, to: 8 },
      { from: 2, to: 5 },
    ])
    // The three emptied cells are the top row, and refill fills exactly those.
    expect(first.spawns.map((s) => s.index)).toEqual([0, 1, 2])
    expect(first.spawns.every((s) => seed.includes(s.color))).toBe(true)
  })

  test('leaves the board settled', () => {
    const cells = cellsOf(grid, rows)
    resolveCascade(grid, cells, 1, seed, mulberry32(11))
    expect(findMatches(grid, cells).size).toBe(0)
    expect(cells.some((cell) => cell === null)).toBe(false)
  })

  test('every wave scores at the move multiplier — cascades inherit, never grow', () => {
    const cells = cellsOf(grid, rows)
    const waves = resolveCascade(grid, cells, 3, seed, mulberry32(11))
    for (const wave of waves) {
      expect(wave.points).toBe(clearScore(wave.colors, 3))
    }
    expect(waves[0].points).toBe(colorValue('red') * 3 * 3)
  })

  test('same seed in, same waves out', () => {
    const once = cellsOf(grid, rows)
    const twice = cellsOf(grid, rows)
    expect(resolveCascade(grid, once, 1, seed, mulberry32(11))).toEqual(
      resolveCascade(grid, twice, 1, seed, mulberry32(11)),
    )
    expect(once).toEqual(twice)
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

  test('free move permits a legal interaction between non-adjacent tiles', () => {
    const row = parseMask(['#####'])
    const swapCells = cellsOf(row, ['rrybr'])

    expect(resolveMove(row, swapCells, mixResult, 2, 4)).toEqual({ kind: 'illegal' })
    expect(resolveMove(row, swapCells, mixResult, 2, 4, { allowDistant: true })).toEqual({
      kind: 'swap',
    })

    const mergeCells = cellsOf(row, ['ooryy'])
    expect(resolveMove(row, mergeCells, mixResult, 4, 2)).toEqual({ kind: 'illegal' })
    expect(resolveMove(row, mergeCells, mixResult, 4, 2, { allowDistant: true })).toEqual({
      kind: 'merge',
      result: 'orange',
    })
  })

  test('free move still refuses distant interactions that make no match', () => {
    const row = parseMask(['#####'])
    const cells = cellsOf(row, ['rybgo'])

    expect(resolveMove(row, cells, mixResult, 0, 4, { allowDistant: true })).toEqual({
      kind: 'illegal',
    })
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
  test('values tiles by their resulting colour tier', () => {
    expect(colorValue('red')).toBe(15)
    expect(colorValue('orange')).toBe(20)
    expect(colorValue('amber')).toBe(30)
  })

  test('sums cleared tile values before applying the multiplier', () => {
    expect(clearScore(['red', 'yellow', 'blue'], 1)).toBe(45)
    expect(clearScore(['orange', 'orange', 'orange', 'orange'], 2)).toBe(160)
    expect(clearScore(['red', 'orange', 'amber'], 3)).toBe(195)
  })

  test('mixing distinct result colours grows a chain while repeats hold it', () => {
    const empty: ColorChain = { results: [], multiplier: 1 }
    const orange = advanceColorChain(empty, 'orange', 3)
    expect(orange).toEqual({ results: ['orange'], multiplier: 2 })
    expect(advanceColorChain(orange, 'orange', 3)).toEqual(orange)
    expect(advanceColorChain(orange, 'green', 3)).toEqual({
      results: ['orange', 'green'],
      multiplier: 3,
    })
  })

  test('a colour chain cannot grow beyond the stage maximum', () => {
    const capped = advanceColorChain(
      { results: ['orange', 'green'], multiplier: 3 },
      'purple',
      3,
    )
    expect(capped).toEqual({ results: ['orange', 'green'], multiplier: 3 })
  })

  test('swapping breaks the chain back to one', () => {
    expect(breakColorChain({ results: ['orange', 'green'], multiplier: 3 })).toEqual({
      results: [],
      multiplier: 1,
    })
  })

  test('a swap doubles a live chain for one Chain Breaker', () => {
    expect(scoreResolutionForSwap({ results: ['orange'], multiplier: 2 }, 3)).toEqual({
      kind: 'chain-breaker',
      multiplier: 4,
      rainbow: false,
    })
  })

  test('a swap at the stage maximum creates a triple Rainbow Chain Breaker', () => {
    expect(
      scoreResolutionForSwap({ results: ['orange', 'green'], multiplier: 3 }, 3),
    ).toEqual({
      kind: 'rainbow-chain-breaker',
      multiplier: 9,
      rainbow: true,
    })
  })

  test('merges score at the persistent multiplier and turn rainbow at maximum', () => {
    expect(scoreResolutionForMerge({ results: ['orange'], multiplier: 2 }, 3)).toEqual({
      kind: 'normal',
      multiplier: 2,
      rainbow: false,
    })
    expect(
      scoreResolutionForMerge({ results: ['orange', 'green'], multiplier: 3 }, 3),
    ).toEqual({
      kind: 'normal',
      multiplier: 3,
      rainbow: true,
    })
  })
})
