import type { Page } from '@playwright/test'

import { isAdjacent, resolveMove, type Cells, type Grid, type MixRule } from '../src/board'
// Pulls in the `window.dyestopia` global declaration.
import type {} from '../src/debug'
import type { BoardReport } from '../src/scenes/GameScene'
import { FIRST_STAGE, stageMix } from '../src/stage'

/** Coordinate space scenes are written in — mirrors src/config.ts. */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 720

export async function open(page: Page): Promise<void> {
  await page.goto('/')
  await waitForScene(page, 'Menu')
}

export async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => window.dyestopia?.isActive(k) === true, key)
}

/**
 * Click a world position with a real mouse event, so the click travels through
 * the camera transform and Phaser's hit-testing exactly as a player's would.
 */
export async function clickWorld(
  page: Page,
  scene: string,
  x: number,
  y: number,
): Promise<void> {
  const point = await page.evaluate(
    (arg) => window.dyestopia!.worldToViewport(arg.scene, arg.x, arg.y),
    { scene, x, y },
  )
  await page.mouse.click(point.x, point.y)
}

/** Menu → Game, the way a player gets there. */
export async function startGame(page: Page): Promise<void> {
  await clickWorld(page, 'Menu', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90)
  await waitForScene(page, 'Game')
}

/**
 * Start a round on a known board: the seed goes through the debug bridge into
 * the next build's RNG, so the same seed always deals the same cells.
 */
export async function startSeededGame(page: Page, seed: number): Promise<BoardReport> {
  await page.evaluate((s) => {
    window.dyestopia!.seedRng(s)
    window.dyestopia!.goTo('Game')
  }, seed)
  await waitForScene(page, 'Game')
  return board(page)
}

/** The Game scene's board — cells, colours, score — as the debug bridge reports it. */
export function board(page: Page): Promise<BoardReport> {
  return page.evaluate(() => window.dyestopia!.board())
}

/**
 * A board report rebuilt as engine inputs, so tests can run the real rules
 * (`findLegalMove`, `resolveMove`, …) against the live board instead of
 * hard-coding cell positions.
 */
export function toEngine(report: BoardReport): { grid: Grid; cells: Cells } {
  const mask = new Array<boolean>(report.cols * report.rows).fill(false)
  const cells: Cells = new Array(report.cols * report.rows).fill(null)
  for (const cell of report.cells) {
    mask[cell.index] = true
    cells[cell.index] = cell.color as Cells[number]
  }
  return { grid: { cols: report.cols, rows: report.rows, mask }, cells }
}

/** The scene's stage rules, mirrored so specs resolve drops the way it will. */
export const stageRules: MixRule = (a, b) => stageMix(FIRST_STAGE, a, b)

/** The first adjacent pair whose drop resolves to `kind`, or null. */
export function moveOfKind(
  grid: Grid,
  cells: Cells,
  kind: 'merge' | 'swap' | 'illegal',
  combo = false,
): [number, number] | null {
  for (let a = 0; a < grid.mask.length; a++) {
    if (!grid.mask[a]) continue
    for (const b of [a + 1, a + grid.cols]) {
      if (!isAdjacent(grid, a, b)) continue
      if (resolveMove(grid, cells, stageRules, a, b, combo).kind === kind) return [a, b]
    }
  }
  return null
}

export interface WorldPoint {
  x: number
  y: number
}

/**
 * Drag between two world positions with real mouse events, so the gesture
 * travels through Phaser's drag threshold and hit-testing as a player's would.
 */
export async function dragWorld(
  page: Page,
  scene: string,
  from: WorldPoint,
  to: WorldPoint,
): Promise<void> {
  const [a, b] = await page.evaluate(
    (arg) => [
      window.dyestopia!.worldToViewport(arg.scene, arg.from.x, arg.from.y),
      window.dyestopia!.worldToViewport(arg.scene, arg.to.x, arg.to.y),
    ],
    { scene, from, to },
  )
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 15 })
  await page.mouse.up()
}
