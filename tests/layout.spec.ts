import { expect, test, type Page } from '@playwright/test'

import { clickWorld, hitTarget, open, waitForScene } from './helpers'

/**
 * Portrait-only layout: every viewport uses one 393×852 iPhone 15 Pro canvas. Phaser
 * scales it uniformly, so browser aspect changes cannot alter the composition.
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

test('a portrait viewport uses the canonical design canvas', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await open(page)

  const { width, height, dpr } = await worldSize(page)
  expect(width).toBe(393 * dpr)
  expect(height).toBe(852 * dpr)
})

test('rotation keeps the same portrait world', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await open(page)

  await page.setViewportSize({ width: 852, height: 393 })

  // The physical viewport is landscape, but the logical game stays portrait.
  const dpr = (await worldSize(page)).dpr
  await expect.poll(async () => (await worldSize(page)).width).toBe(393 * dpr)
  expect((await worldSize(page)).height).toBe(852 * dpr)

  // The menu rebuilt against the new world: its Play button hit-tests where
  // the *new* coordinate space says it is.
  await waitForScene(page, 'Menu')
  const play = await hitTarget(page, 'Menu', 'button-play')
  await clickWorld(page, 'Menu', play.x, play.y)
  await waitForScene(page, 'StageSelect')
})

test('different desktop sizes keep exactly the same portrait world', async ({ page }) => {
  await open(page)
  const before = await worldSize(page)
  expect(before).toEqual({ width: 393 * before.dpr, height: 852 * before.dpr, dpr: before.dpr })

  await page.setViewportSize({ width: 1100, height: 700 })
  await page.waitForTimeout(400)
  expect(await worldSize(page)).toEqual(before)
  expect(await page.evaluate(() => window.dyestopia!.isActive('Menu'))).toBe(true)
})
