import { expect, test } from '@playwright/test'

import { findLegalSwap, findMatches, isAdjacent, swapClears } from '../src/board'
import { board, dragWorld, open, startSeededGame, toEngine } from './helpers'

/**
 * The match loop, played against the real scene. The engine's rules are
 * proven in board.spec.ts; here the tests re-run those rules on the live
 * board (via `toEngine`) to pick their moves, then check the scene lands on
 * the state the model demands.
 */

test('the same seed deals the same board — match-free, with a move waiting', async ({ page }) => {
  await open(page)
  const first = await startSeededGame(page, 4711)

  const { grid, cells } = toEngine(first)
  expect(cells.filter(Boolean).length).toBe(first.cells.length)
  expect(findMatches(grid, cells).size).toBe(0)
  expect(findLegalSwap(grid, cells)).not.toBeNull()

  await page.evaluate(() => window.dyestopia!.goTo('Menu'))
  const again = await startSeededGame(page, 4711)
  expect(again.cells.map((c) => c.color)).toEqual(first.cells.map((c) => c.color))
})

test('a clearing swap clears, scores, and the board refills', async ({ page }) => {
  await open(page)
  const report = await startSeededGame(page, 4711)
  const { grid, cells } = toEngine(report)

  const move = findLegalSwap(grid, cells)
  expect(move).not.toBeNull()
  const [a, b] = move!
  const from = report.cells.find((c) => c.index === a)!
  const to = report.cells.find((c) => c.index === b)!

  await dragWorld(page, 'Game', from, to)

  // The cascade may take several waves; when the dust settles the board must
  // be full again, match-free, and the clear must have scored.
  await expect
    .poll(async () => {
      const now = await board(page)
      const engine = toEngine(now)
      return (
        now.score > 0 &&
        now.cells.every((c) => c.color !== null) &&
        findMatches(engine.grid, engine.cells).size === 0
      )
    })
    .toBe(true)
})

test('a swap that clears nothing is refused and costs nothing', async ({ page }) => {
  await open(page)
  const report = await startSeededGame(page, 4711)
  const { grid, cells } = toEngine(report)

  // Any adjacent pair whose swap clears nothing — the seeded board is fresh,
  // so one always exists nearby.
  const pair = report.cells.flatMap((cell) => {
    const right = report.cells.find((c) => c.index === cell.index + 1)
    return right &&
      isAdjacent(grid, cell.index, right.index) &&
      !swapClears(grid, cells, cell.index, right.index)
      ? [[cell, right] as const]
      : []
  })[0]
  expect(pair).toBeDefined()

  await dragWorld(page, 'Game', pair[0], pair[1])

  // The model never changed, so once the refusal plays out the board reports
  // the exact same deal and no score.
  await page.waitForTimeout(700)
  const after = await board(page)
  expect(after.score).toBe(0)
  expect(after.cells.map((c) => c.color)).toEqual(report.cells.map((c) => c.color))
})
