import { expect, test } from '@playwright/test'

import { GAME_WIDTH, open, startGame, waitForScene } from './helpers'

test('boots through to the menu', async ({ page }) => {
  await open(page)
  const texts = await page.evaluate(() => window.dyestopia!.texts('Menu'))
  expect(texts).toContain('DYES')
  expect(texts).toContain('TOPIA')
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
  expect(canvasHeight).toBe(720 * dpr)
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
  await startGame(page)
})

test('the round deals a full board and a zeroed score', async ({ page }) => {
  await open(page)
  await startGame(page)

  // One draggable tile per masked cell — startGame lands on stage 1.
  const report = await page.evaluate(() => window.dyestopia!.board())
  const swatches = await page.evaluate(() =>
    window.dyestopia!.hitTargets('Game').filter((target) => target.name === 'tile'),
  )
  expect(report.cells.length).toBeGreaterThan(0)
  expect(swatches).toHaveLength(report.cells.length)
  expect(report.cells.every((cell) => cell.color !== null)).toBe(true)

  const texts = await page.evaluate(() => window.dyestopia!.texts('Game'))
  expect(texts).toContain('SCORE')
  expect(texts).toContain('0')
})

test('escape toggles pause without abandoning the round', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game'))
  await waitForScene(page, 'Game')

  await page.keyboard.press('Escape')
  await expect.poll(() =>
    page.evaluate(() =>
      Boolean(window.dyestopia!.game.scene.getScene('Game')!.children.getByName('pause-dialog')),
    ),
  ).toBe(true)

  await page.keyboard.press('Escape')
  await expect.poll(() =>
    page.evaluate(() =>
      Boolean(window.dyestopia!.game.scene.getScene('Game')!.children.getByName('pause-dialog')),
    ),
  ).toBe(false)
  expect(await page.evaluate(() => window.dyestopia!.isActive('Game'))).toBe(true)
})
