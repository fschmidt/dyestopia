import { expect, test } from '@playwright/test'

import { COMBO_RULES, comboConversions, parseMask, type Cells, type Grid } from '../../src/board'
import type { ColorId } from '../../src/colors'
import { CHAIN_POLICY, POINTS_POLICY, policyGap, runStage } from '../../src/playout'
import { STAGES } from '../../src/stages'

/**
 * `T-031`. The combo spike measured rather than argued: the wave becomes an
 * axis the harness can select, with off as the default and the baseline, and
 * one bounded variant beside the full flood so `T-012` has something between
 * ship and drop to choose from.
 *
 * These fix the contract — that the rules are selectable, bounded and
 * reproducible, and that the report counts what the card asks for. What the
 * numbers turn out to *say* belongs in the card, not in an assertion.
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

test.describe('the rule as an axis', () => {
  const grid = parseMask(['#####'])

  test('off converts nothing and leaves the board untouched', () => {
    const cells = cellsOf(grid, ['orryr'])
    expect(comboConversions(grid, cells, [0], 'off')).toEqual([])
    expect(cells).toEqual(cellsOf(grid, ['orryr']))
  })

  test('contact takes the tiles touching the merge and stops there', () => {
    // `full` rolls this whole row orange (board.spec.ts). The bound is the
    // point: the red at 1 touches the fresh orange, so it converts; the group
    // behind it does not flood, and the wave does not chain onward.
    const cells = cellsOf(grid, ['orryr'])
    expect(comboConversions(grid, cells, [0], 'contact')).toEqual([
      { index: 1, color: 'orange', step: 1 },
    ])
    expect(cells).toEqual(cellsOf(grid, ['ooryr']))
  })

  test('contact is a subset of full, never a different wave', () => {
    const rows = ['orryr', 'ryrry', 'yrrgb']
    const full = comboConversions(grid, cellsOf(grid, rows), [0], 'full')
    const contact = comboConversions(grid, cellsOf(grid, rows), [0], 'contact')
    const flooded = new Set(full.map((conversion) => conversion.index))
    expect(contact.length).toBeLessThanOrEqual(full.length)
    for (const conversion of contact) expect(flooded.has(conversion.index)).toBe(true)
  })

  test('no rule spreads a colour the merge did not make', () => {
    for (const rule of COMBO_RULES) {
      const cells = cellsOf(grid, ['grygb'])
      for (const conversion of comboConversions(grid, cells, [0], rule)) {
        expect(conversion.color).toBe('green')
      }
    }
  })
})

test.describe('the harness reports what the decisions need', () => {
  const stage = STAGES[9]

  test('off is the default, so the baseline is the game as it stands', () => {
    for (const policy of [POINTS_POLICY, CHAIN_POLICY]) {
      const implicit = runStage(stage, policy, 12, 700)
      const explicit = runStage(stage, policy, 12, 700, { combo: 'off' })
      expect(explicit.summary).toEqual(implicit.summary)
      expect(explicit.playouts).toEqual(implicit.playouts)
    }
  })

  test('every rule is reproducible, move for move', () => {
    for (const rule of COMBO_RULES) {
      const first = runStage(stage, CHAIN_POLICY, 8, 4711, { combo: rule })
      const again = runStage(stage, CHAIN_POLICY, 8, 4711, { combo: rule })
      expect(again.playouts).toEqual(first.playouts)
    }
  })

  test('mixes per run are counted, since the supply hypothesis is about them', () => {
    for (const rule of COMBO_RULES) {
      const { playouts, summary } = runStage(stage, CHAIN_POLICY, 12, 300, { combo: rule })
      const counted = playouts.map(
        (playout) => playout.moves.filter((move) => move.kind === 'merge').length,
      )
      expect(summary.mixes.mean).toBeCloseTo(
        counted.reduce((sum, count) => sum + count, 0) / counted.length,
      )
      expect(summary.mixes.max).toBe(Math.max(...counted))
    }
  })

  test('the greedy-versus-chain gap is chain minus points, and it is its own figure', () => {
    const points = runStage(stage, POINTS_POLICY, 12, 88).summary
    const chain = runStage(stage, CHAIN_POLICY, 12, 88).summary
    const gap = policyGap(points, chain)
    expect(gap.stage).toBe(stage.name)
    expect(gap.winRate).toBeCloseTo(chain.winRate - points.winRate)
    expect(gap.score).toBeCloseTo(chain.score.mean - points.score.mean)
    expect(gap.movesUsed).toBeCloseTo(chain.movesUsed.mean - points.movesUsed.mean)
  })
})
