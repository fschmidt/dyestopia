import { expect, test, type Page } from '@playwright/test'

import { clickWorld, open, waitForScene } from './helpers'

/**
 * The M5 mobile layout: on portrait screens the world adopts the viewport's
 * CSS-pixel size (config.ts), and a rotation re-measures it live — the resize
 * pass that boot-time sizing used to defer to a reload.
 */

/** The canvas backing store and the DPR the game settled on. */
const worldSize = (
  page: Page,
): Promise<{ width: number; height: number; dpr: number }> =>
  page.evaluate(() => ({
    width: window.dyestopia!.game.scale.width,
    height: window.dyestopia!.game.scale.height,
    dpr: Math.min(window.devicePixelRatio || 1, 3),
  }))

test('a portrait viewport gets a full-bleed world of its own size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)

  const { width, height, dpr } = await worldSize(page)
  expect(width).toBe(390 * dpr)
  expect(height).toBe(844 * dpr)
})

test('rotation re-measures the world and rebuilds the scene', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)

  await page.setViewportSize({ width: 844, height: 390 })

  // Landscape means the classic fixed world; the poll rides out the debounce.
  const dpr = (await worldSize(page)).dpr
  await expect.poll(async () => (await worldSize(page)).width).toBe(960 * dpr)
  expect((await worldSize(page)).height).toBe(720 * dpr)

  // The menu rebuilt against the new world: its Play button hit-tests where
  // the *new* coordinate space says it is.
  await waitForScene(page, 'Menu')
  await clickWorld(page, 'Menu', 960 / 2, 720 / 2 + 90)
  await waitForScene(page, 'StageSelect')
})

test('desktop window resizing never restarts a scene', async ({ page }) => {
  await open(page)
  const before = await worldSize(page)
  expect(before.width).toBe(960 * before.dpr)

  // Any landscape size measures out to the same fixed world — no restart, no
  // canvas resize, nothing for a dragged window edge to disturb.
  await page.setViewportSize({ width: 1100, height: 700 })
  await page.waitForTimeout(400)
  expect(await worldSize(page)).toEqual(before)
  expect(await page.evaluate(() => window.dyestopia!.isActive('Menu'))).toBe(true)
})
