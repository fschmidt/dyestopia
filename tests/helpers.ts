import type { Page } from '@playwright/test'

import { isAdjacent, resolveMove, type Cells, type Grid, type MixRule } from '../src/board'
// Pulls in the `window.dyestopia` global declaration.
import type {} from '../src/debug'
import type { BoardReport, GameStartData } from '../src/scenes/GameScene'
import { FIRST_STAGE, stageMix, type Stage } from '../src/stage'

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

/** The world position of a named interactive object in a scene. */
export async function hitTarget(page: Page, scene: string, name: string): Promise<WorldPoint> {
  const target = await page.evaluate(
    (arg) => window.dyestopia!.hitTargets(arg.scene).find((t) => t.name === arg.name) ?? null,
    { scene, name },
  )
  if (!target) throw new Error(`No hit target "${name}" in ${scene}`)
  return target
}

/** Menu → Core mode → stage 1 → Play, the way a player gets into a round. */
export async function startGame(page: Page): Promise<void> {
  const play = await hitTarget(page, 'Menu', 'button-play')
  await clickWorld(page, 'Menu', play.x, play.y)
  await waitForScene(page, 'StageSelect')
  const core = await hitTarget(page, 'StageSelect', 'mode-core')
  await clickWorld(page, 'StageSelect', core.x, core.y)
  const cell = await hitTarget(page, 'StageSelect', 'stage-0')
  await clickWorld(page, 'StageSelect', cell.x, cell.y)
  const cta = await hitTarget(page, 'StageSelect', 'stage-cta')
  await clickWorld(page, 'StageSelect', cta.x, cta.y)
  await waitForScene(page, 'Game')
}

/**
 * Straight into an authored stage through the bridge — with a seed when the
 * test needs to predict the deal, and overrides when it needs to bend the
 * win condition (a 1-move budget forces a loss no honest play could).
 */
export async function startStage(
  page: Page,
  data: GameStartData,
  seed?: number,
): Promise<BoardReport> {
  await page.evaluate(
    (arg) => {
      if (arg.seed !== undefined) window.dyestopia!.seedRng(arg.seed)
      window.dyestopia!.goTo('Game', arg.data)
    },
    { data, seed },
  )
  await waitForScene(page, 'Game')
  return board(page)
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

/** A stage's merge rules, mirrored so specs resolve drops the way the scene will. */
export function rulesFor(stage: Stage): MixRule {
  return (a, b) => stageMix(stage, a, b)
}

/** The dev board's rules — what `startSeededGame` rounds play under. */
export const stageRules: MixRule = rulesFor(FIRST_STAGE)

/**
 * The first drop that resolves to `kind`, as `[from, to]`, or null. Mixes
 * are directional (the dye pours onto the target), so each adjacent pair is
 * tried both ways.
 */
export function moveOfKind(
  grid: Grid,
  cells: Cells,
  kind: 'merge' | 'swap' | 'illegal',
  mix: MixRule = stageRules,
): [number, number] | null {
  for (let a = 0; a < grid.mask.length; a++) {
    if (!grid.mask[a]) continue
    for (const b of [a + 1, a + grid.cols]) {
      if (!isAdjacent(grid, a, b)) continue
      if (resolveMove(grid, cells, mix, a, b).kind === kind) return [a, b]
      if (resolveMove(grid, cells, mix, b, a).kind === kind) return [b, a]
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
