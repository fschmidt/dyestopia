import { expect, test } from '@playwright/test'

import {
  clearScore,
  findLegalMove,
  findMatches,
  generateBoard,
  parseMask,
  resolveMove,
} from '../../src/board'
import { mulberry32 } from '../../src/rng'
import { FIRST_STAGE } from '../../src/stage'
import {
  board,
  dragWorld,
  moveOfKind,
  open,
  settle,
  stageRules,
  startSeededGame,
  toEngine,
} from '../helpers'

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
  expect(findLegalMove(grid, cells, stageRules)).not.toBeNull()

  await page.evaluate(() => window.dyestopia!.goTo('Menu'))
  const again = await startSeededGame(page, 4711)
  expect(again.cells.map((c) => c.color)).toEqual(first.cells.map((c) => c.color))
})

test('a clearing swap clears, scores, and the board refills', async ({ page }) => {
  await open(page)
  const report = await startSeededGame(page, 4711)
  const { grid, cells } = toEngine(report)

  const move = moveOfKind(grid, cells, 'swap')
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

test('a merge dyes the pair in place, clears, and starts a ×2 colour chain', async ({ page }) => {
  // Find, offline, a seed whose deal holds a legal merge. The scene deals
  // with the same pure generator from the same seed, so the search predicts
  // the live board exactly.
  const grid = parseMask(FIRST_STAGE.board)
  let seed = -1
  let pair: [number, number] | null = null
  // Legal merges need two in-line result tiles at the target now, so the
  // random deal serves them up less often — sweep a wide seed range.
  for (let s = 1; s < 5000 && !pair; s++) {
    const cells = generateBoard(grid, FIRST_STAGE.seed, mulberry32(s), stageRules)
    pair = moveOfKind(grid, cells, 'merge')
    if (pair) seed = s
  }
  expect(pair).not.toBeNull()

  await open(page)
  const report = await startSeededGame(page, seed)
  const { grid: live, cells } = toEngine(report)
  expect(resolveMove(live, cells, stageRules, pair![0], pair![1]).kind).toBe('merge')

  const from = report.cells.find((c) => c.index === pair![0])!
  const to = report.cells.find((c) => c.index === pair![1])!
  await dragWorld(page, 'Game', from, to)

  // The merge pulse hands off into the clear at the old ×1; only after that
  // score snapshot is taken does the first result colour raise the chain to ×2.
  await expect
    .poll(async () => {
      const now = await board(page)
      const engine = toEngine(now)
      return (
        now.multiplier === 2 &&
        now.effectiveMultiplier === 1 &&
        now.score >= clearScore(['red', 'red', 'red'], 1) &&
        now.cells.every((c) => c.color !== null) &&
        findMatches(engine.grid, engine.cells).size === 0
      )
    })
    .toBe(true)
})

test('a swap cashes in a live chain for one resolution and then resets it', async ({ page }) => {
  const grid = parseMask(FIRST_STAGE.board)
  let seed = -1
  let pair: [number, number] | null = null
  for (let s = 1; s < 5000 && !pair; s++) {
    const cells = generateBoard(grid, FIRST_STAGE.seed, mulberry32(s), stageRules)
    pair = moveOfKind(grid, cells, 'merge')
    if (pair) seed = s
  }
  expect(pair).not.toBeNull()

  await open(page)
  let report = await startSeededGame(page, seed)
  await dragWorld(
    page,
    'Game',
    report.cells.find((cell) => cell.index === pair![0])!,
    report.cells.find((cell) => cell.index === pair![1])!,
  )
  await expect.poll(async () => (await board(page)).multiplier).toBe(2)

  // Wait for the board to stop moving, not for the model to agree with
  // itself: `cells` is settled the instant the move is played, so a poll on
  // "full and match-free" is satisfied while the tiles are still catching up —
  // and the swap below would then be refused as a drop mid-resolution.
  report = await settle(page)
  expect(report.resolution).toBe('normal')
  expect(report.cells.every((cell) => cell.color !== null)).toBe(true)
  const engine = toEngine(report)
  expect(findMatches(engine.grid, engine.cells).size).toBe(0)
  const swap = moveOfKind(engine.grid, engine.cells, 'swap')
  expect(swap).not.toBeNull()
  const scoreBefore = report.score
  await dragWorld(
    page,
    'Game',
    report.cells.find((cell) => cell.index === swap![0])!,
    report.cells.find((cell) => cell.index === swap![1])!,
  )

  await expect
    .poll(async () => {
      const now = await board(page)
      return now.multiplier === 1 && now.resolution === 'normal' && now.score >= scoreBefore + 120
    })
    .toBe(true)
})

test('a drop that clears nothing is refused and costs nothing', async ({ page }) => {
  await open(page)
  const report = await startSeededGame(page, 4711)
  const { grid, cells } = toEngine(report)

  // An adjacent pair whose drop resolves to nothing — neither merge nor swap
  // clears. The seeded board is fresh, so one always exists nearby.
  const pair = moveOfKind(grid, cells, 'illegal')
  expect(pair).not.toBeNull()
  const from = report.cells.find((c) => c.index === pair![0])!
  const to = report.cells.find((c) => c.index === pair![1])!

  await dragWorld(page, 'Game', from, to)

  // The model never changed, so once the refusal plays out the board reports
  // the exact same deal and no score.
  const after = await settle(page)
  expect(after.score).toBe(0)
  expect(after.cells.map((c) => c.color)).toEqual(report.cells.map((c) => c.color))
})
