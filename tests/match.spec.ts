import { expect, test } from '@playwright/test'

import {
  applyGravity,
  clearScore,
  comboConversions,
  findLegalMove,
  findMatches,
  generateBoard,
  parseMask,
  refill,
  resolveMove,
} from '../src/board'
import { mixResult } from '../src/colors'
import { mulberry32 } from '../src/rng'
import { FIRST_STAGE } from '../src/stage'
import {
  board,
  dragWorld,
  moveOfKind,
  open,
  stageRules,
  startSeededGame,
  toEngine,
} from './helpers'

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

test('a merge dyes the pair in place, clears, and pays the merge bonus', async ({ page }) => {
  // Find, offline, a seed whose deal holds a legal merge. The scene deals
  // with the same pure generator from the same seed, so the search predicts
  // the live board exactly.
  const grid = parseMask(FIRST_STAGE.board)
  let seed = -1
  let pair: [number, number] | null = null
  for (let s = 1; s < 200 && !pair; s++) {
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

  // The merge pulse hands off into the clear; a merged first wave of 3+ pays
  // at least clearScore(3, 1, merged) — more than any swap could at 3 tiles.
  await expect
    .poll(async () => {
      const now = await board(page)
      const engine = toEngine(now)
      return (
        now.score >= clearScore(3, 1, true) &&
        now.cells.every((c) => c.color !== null) &&
        findMatches(engine.grid, engine.cells).size === 0
      )
    })
    .toBe(true)
})

test('the combo prototype ripples the merge into adjacent groups', async ({ page }) => {
  // Predict, offline, a seed whose merge sets off at least one conversion —
  // then replay the entire resolve (conversions, cascade, refills) on the
  // same rng stream the scene will consume, down to the exact settled board.
  const grid = parseMask(FIRST_STAGE.board)
  let seed = -1
  let pair: [number, number] | null = null
  let settled: (string | null)[] = []
  for (let s = 1; s < 300 && !pair; s++) {
    const rng = mulberry32(s)
    const cells = generateBoard(grid, FIRST_STAGE.seed, rng, stageRules)
    const move = moveOfKind(grid, cells, 'merge')
    if (!move) continue
    const resolved = resolveMove(grid, cells, stageRules, move[0], move[1])
    if (resolved.kind !== 'merge') continue
    cells[move[0]] = cells[move[1]] = resolved.result
    const conversions = comboConversions(grid, cells, [move[0], move[1]], mixResult)
    if (conversions.length === 0) continue
    for (let m = findMatches(grid, cells); m.size > 0; m = findMatches(grid, cells)) {
      for (const index of m) cells[index] = null
      applyGravity(grid, cells)
      refill(grid, cells, FIRST_STAGE.seed, rng)
    }
    // A dead settled board would reshuffle live and spend rng the replay
    // didn't — skip such seeds rather than model it.
    if (!findLegalMove(grid, cells, stageRules)) continue
    seed = s
    pair = move
    settled = cells
  }
  expect(pair).not.toBeNull()

  await open(page)
  await page.evaluate(() => window.dyestopia!.combo(true))
  const report = await startSeededGame(page, seed)
  const from = report.cells.find((c) => c.index === pair![0])!
  const to = report.cells.find((c) => c.index === pair![1])!
  await dragWorld(page, 'Game', from, to)

  // The scene must land on the exact board the model predicts — conversions,
  // cascade and refills included.
  await expect
    .poll(async () => {
      const now = await board(page)
      return now.cells.every((c) => c.color === settled[c.index])
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
  await page.waitForTimeout(700)
  const after = await board(page)
  expect(after.score).toBe(0)
  expect(after.cells.map((c) => c.color)).toEqual(report.cells.map((c) => c.color))
})
