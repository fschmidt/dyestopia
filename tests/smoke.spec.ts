import { expect, test, type Page } from '@playwright/test'

// Pulls in the `window.dyestopia` global declaration.
import type {} from '../src/debug'

/** Coordinate space scenes are written in — mirrors src/config.ts. */
const GAME_WIDTH = 960
const GAME_HEIGHT = 720

async function open(page: Page): Promise<void> {
  await page.goto('/')
  await waitForScene(page, 'Menu')
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => window.dyestopia?.isActive(k) === true, key)
}

/**
 * Click a world position with a real mouse event, so the click travels through
 * the camera transform and Phaser's hit-testing exactly as a player's would.
 */
async function clickWorld(page: Page, scene: string, x: number, y: number): Promise<void> {
  const point = await page.evaluate(
    (arg) => window.dyestopia!.worldToViewport(arg.scene, arg.x, arg.y),
    { scene, x, y },
  )
  await page.mouse.click(point.x, point.y)
}

test('boots through to the menu', async ({ page }) => {
  await open(page)
  expect(await page.evaluate(() => window.dyestopia!.texts('Menu'))).toContain('DYESTOPIA')
})

test('canvas is sized in device pixels', async ({ page }) => {
  await open(page)

  const { canvasWidth, canvasHeight, cssWidth, dpr, zoom } = await page.evaluate(() => {
    const { game } = window.dyestopia!
    return {
      canvasWidth: game.canvas.width,
      canvasHeight: game.canvas.height,
      cssWidth: game.canvas.getBoundingClientRect().width,
      dpr: window.devicePixelRatio,
      zoom: game.scene.getScene('Menu')!.cameras.main.zoom,
    }
  })

  // The backing store carries the ratio; the camera zoom cancels it so scenes
  // still see GAME_WIDTH x GAME_HEIGHT.
  expect(canvasWidth).toBe(GAME_WIDTH * dpr)
  expect(canvasHeight).toBe(GAME_HEIGHT * dpr)
  expect(zoom).toBe(dpr)

  // The 1280x720 viewport is height-limited at 4:3, so FIT lands on exactly
  // GAME_WIDTH CSS pixels — meaning one world unit is one CSS pixel and any
  // extra sharpness comes purely from the ratio.
  expect(cssWidth).toBe(GAME_WIDTH)
})

test('canvas is centred in the viewport', async ({ page }) => {
  await open(page)

  // Regression: Phaser's autoCenter used to add a centring margin on top of the
  // flexbox centring in style.css, leaving everything half a margin off centre.
  const { left, right, viewport } = await page.evaluate(() => {
    const rect = window.dyestopia!.game.canvas.getBoundingClientRect()
    return { left: rect.left, right: rect.right, viewport: window.innerWidth }
  })
  expect(left).toBeCloseTo(viewport - right, 1)
})

test('clicking start enters the game', async ({ page }) => {
  await open(page)
  await clickWorld(page, 'Menu', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90)
  await waitForScene(page, 'Game')
})

test('clicking a swatch scores', async ({ page }) => {
  await open(page)
  await clickWorld(page, 'Menu', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90)
  await waitForScene(page, 'Game')

  const swatches = await page.evaluate(() =>
    window.dyestopia!.hitTargets('Game').filter((target) => target.type === 'Rectangle'),
  )
  expect(swatches).toHaveLength(12)

  await clickWorld(page, 'Game', swatches[0].x, swatches[0].y)

  // Right or wrong both move the score; either proves the hit test landed.
  await expect
    .poll(async () => await page.evaluate(() => window.dyestopia!.texts('Game')))
    .not.toContain('Score: 0')
})

test('escape returns to the menu', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game'))
  await waitForScene(page, 'Game')

  await page.keyboard.press('Escape')
  await waitForScene(page, 'Menu')
})
