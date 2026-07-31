import { expect, test } from '@playwright/test'

import { clickWorld, GAME_HEIGHT, GAME_WIDTH, hitTarget, open, startGame, waitForScene } from './helpers'

test('boots through to the menu', async ({ page }) => {
  await open(page)
  const texts = await page.evaluate(() => window.dyestopia!.texts('Menu'))
  expect(texts).toContain('DYES')
  expect(texts).toContain('TOPIA')
})

test('canvas is sized in device pixels', async ({ page }) => {
  await open(page)

  const { canvasWidth, canvasHeight, cssWidth, cssHeight, dpr, zoom } = await page.evaluate(() => {
    const { game } = window.dyestopia!
    return {
      canvasWidth: game.canvas.width,
      canvasHeight: game.canvas.height,
      cssWidth: game.canvas.getBoundingClientRect().width,
      cssHeight: game.canvas.getBoundingClientRect().height,
      dpr: window.devicePixelRatio,
      zoom: game.scene.getScene('Menu')!.cameras.main.zoom,
    }
  })

  // The backing store carries the ratio; the camera zoom cancels it so scenes
  // still see GAME_WIDTH x GAME_HEIGHT.
  expect(canvasWidth).toBe(GAME_WIDTH * dpr)
  expect(canvasHeight).toBe(GAME_HEIGHT * dpr)
  expect(zoom).toBe(dpr)

  // A landscape browser contains the supported portrait canvas, centred and
  // fitted to its height.
  expect(cssHeight).toBe(720)
  expect(cssWidth).toBeCloseTo((GAME_WIDTH / GAME_HEIGHT) * 720, 1)
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

test('pause menu can return to stage selection', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 0 }))
  await waitForScene(page, 'Game')

  await page.keyboard.press('Escape')
  const selectStage = await hitTarget(page, 'Game', 'pause-stage-select')
  await clickWorld(page, 'Game', selectStage.x, selectStage.y)

  await waitForScene(page, 'StageSelect')
  expect(await page.evaluate(() => window.dyestopia!.texts('StageSelect'))).toContain('STAGES')
  expect(await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').some(({ name }) => name === 'mode-core'),
  )).toBe(true)
})
