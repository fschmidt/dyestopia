import { expect, test, type Page } from '@playwright/test'

import { findLegalMove, findMatches, generateBoard, parseMask } from '../src/board'
import { mulberry32 } from '../src/rng'
import { stageMaxMultiplier, stageMixes, stagePreset } from '../src/stage'
import { STAGES } from '../src/stages'
import {
  board,
  clickWorld,
  dragWorld,
  hitTarget,
  moveOfKind,
  open,
  rulesFor,
  startStage,
  toEngine,
  waitForScene,
} from './helpers'

/**
 * The M4 layer: stages with win conditions, the select screen's linear
 * unlock, and progress that survives a reload. The engine's rules are proven
 * in board.spec.ts; here the authored content is linted offline and the
 * win/lose flow is played against the real scene, with the bridge's stage
 * overrides standing in for twenty honest moves.
 */

test.describe('stage authoring', () => {
  // Offline lint over the real data: a stage that deals a dead or matched
  // board, or plays colours it never seeds a path to, fails here rather than
  // in someone's playtest.
  test('every stage parses, deals clean, and keeps its colours honest', () => {
    expect(STAGES).toHaveLength(10)
    for (const [i, stage] of STAGES.entries()) {
      const label = `stage ${i + 1} (${stage.name})`
      expect(stage.threshold, label).toBeGreaterThan(0)
      expect(stage.moves, label).toBeGreaterThan(0)
      expect(stage.hint.length, label).toBeGreaterThan(0)
      expect(stage.seed.length, label).toBeGreaterThan(0)
      for (const color of stage.seed) expect(stage.active, label).toContain(color)

      const grid = parseMask(stage.board)
      const preset = stagePreset(stage.board, grid)
      for (const color of preset) {
        if (color) expect(stage.active, `${label} presets`).toContain(color)
      }

      // Several deals per stage: none may throw (a preset three-in-line
      // does), and each must come up full, match-free and alive.
      for (let seed = 1; seed <= 5; seed++) {
        const cells = generateBoard(grid, stage.seed, mulberry32(seed), rulesFor(stage), preset)
        const full = cells.filter(Boolean).length
        expect(full, `${label} seed ${seed} fills the mask`).toBe(
          grid.mask.filter(Boolean).length,
        )
        expect(findMatches(grid, cells).size, `${label} seed ${seed} deals no match`).toBe(0)
        expect(
          findLegalMove(grid, cells, rulesFor(stage)),
          `${label} seed ${seed} has a move`,
        ).not.toBeNull()
      }
    }
  })

  test('the deal fixes authored cells exactly where their letters sit', () => {
    const stage = STAGES[1] // Mixing Lesson: three authored oranges
    const grid = parseMask(stage.board)
    const preset = stagePreset(stage.board, grid)
    const authored = preset
      .map((color, index) => ({ color, index }))
      .filter(({ color }) => color !== undefined)
    expect(authored.length).toBeGreaterThan(0)

    const cells = generateBoard(grid, stage.seed, mulberry32(7), rulesFor(stage), preset)
    for (const { color, index } of authored) {
      expect(cells[index]).toBe(color)
    }
  })

  test('the maximum multiplier follows the mix results each stage can produce', () => {
    expect(stageMaxMultiplier(STAGES[0])).toBe(1)
    expect(stageMaxMultiplier(STAGES[1])).toBe(2)
    expect(stageMaxMultiplier(STAGES[2])).toBe(3)
    expect(stageMaxMultiplier(STAGES[6])).toBe(4)
  })

  test('the stage mix reference contains only recipes possible in that stage', () => {
    expect(stageMixes(STAGES[0])).toEqual([])
    expect(stageMixes(STAGES[1])).toEqual([
      { result: 'orange', ingredients: ['red', 'yellow'] },
    ])
    expect(stageMixes(STAGES[8])).toEqual([
      { result: 'orange', ingredients: ['red', 'yellow'] },
      { result: 'green', ingredients: ['yellow', 'blue'] },
      { result: 'purple', ingredients: ['red', 'blue'] },
      { result: 'magenta', ingredients: ['red', 'purple'] },
    ])
  })

  test('score targets reflect each board shape and chain-scoring capacity', () => {
    expect(STAGES.map(({ threshold }) => threshold)).toEqual([
      600,
      1300,
      1800,
      2900,
      1700,
      2000,
      2500,
      3550,
      2500,
      5700,
    ])
  })
})

test('the select screen opens every stage', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ unlockAllStages: true })
    window.dyestopia!.goTo('StageSelect')
  })
  await waitForScene(page, 'StageSelect')

  const names = await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').map((t) => t.name),
  )
  expect(names.filter((name) => name.startsWith('stage-'))).toHaveLength(STAGES.length)
  expect(names).toContain(`stage-${STAGES.length - 1}`)

  const cell = await hitTarget(page, 'StageSelect', `stage-${STAGES.length - 1}`)
  await clickWorld(page, 'StageSelect', cell.x, cell.y)
  await waitForScene(page, 'Game')

  const report = await board(page)
  expect(report.stage).toBe(STAGES.length - 1)
  expect(report.moves).toBe(STAGES.at(-1)!.moves)
  expect(report.threshold).toBe(STAGES.at(-1)!.threshold)
  expect(report.outcome).toBe('playing')
})

/** One clearing swap on the live board, chosen by the engine's own rules. */
async function playClearingSwap(page: Page): Promise<void> {
  const report = await board(page)
  const { grid, cells } = toEngine(report)
  const move = moveOfKind(grid, cells, 'swap', rulesFor(STAGES[report.stage!]))
  expect(move).not.toBeNull()
  await dragWorld(
    page,
    'Game',
    report.cells.find((c) => c.index === move![0])!,
    report.cells.find((c) => c.index === move![1])!,
  )
}

test('wins clear stages and unlock the next stage across reloads', async ({
  page,
}) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.resetProgress()
    window.dyestopia!.setSettings({ unlockAllStages: false })
  })
  expect(await page.evaluate(() => window.dyestopia!.progress())).toBe(1)

  // One 3-clear pays 30 — any clearing swap crosses this line.
  await startStage(page, { stage: 0, override: { threshold: 30 } }, 4711)
  await playClearingSwap(page)

  await expect.poll(async () => (await board(page)).outcome, { timeout: 15000 }).toBe('won')
  expect(await page.evaluate(() => window.dyestopia!.progress())).toBe(2)
  expect(await page.evaluate(() => window.dyestopia!.progressState().clearedStages)).toEqual([0])
  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.texts('Game')))
    .toContain('Stage clear!')

  // The overlay's primary action still carries on to the next stage.
  const next = await hitTarget(page, 'Game', 'next')
  await clickWorld(page, 'Game', next.x, next.y)
  await expect.poll(async () => (await board(page)).stage).toBe(1)

  // Progress is storage, not scene state: a full reload still knows.
  await page.reload()
  await waitForScene(page, 'Menu')
  expect(await page.evaluate(() => window.dyestopia!.progress())).toBe(2)
  await page.evaluate(() => window.dyestopia!.goTo('StageSelect'))
  await waitForScene(page, 'StageSelect')
  const names = await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').map((t) => t.name),
  )
  expect(names.filter((name) => name.startsWith('stage-'))).toEqual(['stage-0', 'stage-1'])
})

test('stage 10 offers endless play at its target and keeps the settled board', async ({ page }) => {
  await open(page)
  await startStage(page, { stage: 9, override: { threshold: 30 } }, 4711)
  await playClearingSwap(page)

  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.texts('Game')))
    .toContain('KEEP PAINTING?')
  expect(await hitTarget(page, 'Game', 'continue-endless')).toBeTruthy()
  expect(await hitTarget(page, 'Game', 'finish-stage')).toBeTruthy()

  const atTarget = await board(page)
  expect(atTarget.outcome).toBe('playing')
  expect(atTarget.endless).toBe(false)

  const keepPainting = await hitTarget(page, 'Game', 'continue-endless')
  await clickWorld(page, 'Game', keepPainting.x, keepPainting.y)

  await expect.poll(async () => (await board(page)).endless).toBe(true)
  const continued = await board(page)
  expect(continued.outcome).toBe('playing')
  expect(continued.score).toBeGreaterThanOrEqual(30)
  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.texts('Game')))
    .toContain('∞')
  expect(
    await page.evaluate(() =>
      Boolean(window.dyestopia!.game.scene.getScene('Game')!.children.getByName('endless-dialog')),
    ),
  ).toBe(false)
})

test('stage 10 can finish normally from the endless choice', async ({ page }) => {
  await open(page)
  await startStage(page, { stage: 9, override: { threshold: 30 } }, 4711)
  await playClearingSwap(page)

  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.texts('Game')))
    .toContain('KEEP PAINTING?')
  const finish = await hitTarget(page, 'Game', 'finish-stage')
  await clickWorld(page, 'Game', finish.x, finish.y)

  await expect.poll(async () => (await board(page)).outcome, { timeout: 15000 }).toBe('won')
  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.texts('Game')))
    .toContain('Stage clear!')
})

test('running out of moves loses kindly, and retrying resets the round', async ({ page }) => {
  await open(page)

  // A one-move budget under an unreachable threshold: the only legal move
  // this round allows is also its last.
  await startStage(page, { stage: 0, override: { moves: 1, threshold: 999999 } }, 4711)
  expect((await board(page)).moves).toBe(1)

  await playClearingSwap(page)

  await expect.poll(async () => (await board(page)).outcome, { timeout: 15000 }).toBe('lost')
  const after = await board(page)
  expect(after.moves).toBe(0)
  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.texts('Game')))
    .toContain('Out of moves')

  // A loss does not change natural progression.
  expect(await page.evaluate(() => window.dyestopia!.progress())).toBe(1)

  // Retry deals a fresh round of the same stage, on its real rules — the
  // bridge override was a one-round bend, not a rewrite.
  const retry = await hitTarget(page, 'Game', 'retry')
  await clickWorld(page, 'Game', retry.x, retry.y)
  await expect.poll(async () => (await board(page)).outcome).toBe('playing')
  const fresh = await board(page)
  expect(fresh.stage).toBe(0)
  expect(fresh.moves).toBe(STAGES[0].moves)
  expect(fresh.score).toBe(0)
})

test('a legal move spends from the budget; a refused drop does not', async ({ page }) => {
  await open(page)
  const report = await startStage(page, { stage: 0 }, 4711)
  const budget = report.moves

  const { grid, cells } = toEngine(report)
  const refused = moveOfKind(grid, cells, 'illegal', rulesFor(STAGES[0]))
  expect(refused).not.toBeNull()
  await dragWorld(
    page,
    'Game',
    report.cells.find((c) => c.index === refused![0])!,
    report.cells.find((c) => c.index === refused![1])!,
  )
  await page.waitForTimeout(700)
  expect((await board(page)).moves).toBe(budget)

  await playClearingSwap(page)
  await expect.poll(async () => (await board(page)).moves).toBe(budget - 1)
})
