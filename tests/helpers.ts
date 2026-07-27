import type { Page } from '@playwright/test'

// Pulls in the `window.dyestopia` global declaration.
import type {} from '../src/debug'

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
