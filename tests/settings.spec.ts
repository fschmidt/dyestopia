import { expect, test, type Page } from '@playwright/test'

import { clickWorld, open, waitForScene } from './helpers'

/** Texture key and tint of every tile on the board. */
async function boardLook(page: Page): Promise<{ texture: string; tint: number }[]> {
  return page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    return scene.children.list
      .filter((child) => child.name === 'tile')
      .map((tile) => {
        const base = (tile as Phaser.GameObjects.Container).list[0] as Phaser.GameObjects.Sprite
        return { texture: base.texture.key, tint: base.tintTopLeft }
      })
  })
}

async function openBoardWith(page: Page, patch: Record<string, string>): Promise<void> {
  await page.evaluate((p) => window.dyestopia!.setSettings(p), patch)
  // Same seed, same deal: the cross-build comparisons below (same tints in a
  // different skin) only mean something when every build deals the same board.
  await page.evaluate(() => {
    window.dyestopia!.seedRng(999)
    window.dyestopia!.goTo('Game')
  })
  await waitForScene(page, 'Game')
}

test('shape and theme are independent axes', async ({ page }) => {
  await open(page)

  // Same shape, different theme: identical artwork, different tint. This is the
  // whole reason the two are separate settings — colour is a runtime property
  // of white sheets, so no combination needs its own bake.
  await openBoardWith(page, { shape: 'blob', theme: 'dyestopia' })
  const blobDyestopia = await boardLook(page)

  await openBoardWith(page, { shape: 'blob', theme: 'neon' })
  const blobNeon = await boardLook(page)

  expect(blobNeon.map((t) => t.texture)).toEqual(blobDyestopia.map((t) => t.texture))
  expect(blobNeon.map((t) => t.tint)).not.toEqual(blobDyestopia.map((t) => t.tint))

  // Different shape, same theme: different artwork, identical tint.
  await openBoardWith(page, { shape: 'mosaic', theme: 'neon' })
  const mosaicNeon = await boardLook(page)

  expect(mosaicNeon.map((t) => t.texture)).not.toEqual(blobNeon.map((t) => t.texture))
  expect(mosaicNeon.map((t) => t.tint)).toEqual(blobNeon.map((t) => t.tint))
})

test('every combination builds a full board', async ({ page }) => {
  await open(page)

  for (const shape of ['blob', 'mosaic']) {
    for (const theme of ['dyestopia', 'neon', 'dusk']) {
      await openBoardWith(page, { shape, theme })
      const tiles = await boardLook(page)
      const cellCount = await page.evaluate(() => window.dyestopia!.board().cells.length)
      expect(tiles, `${shape} + ${theme}`).toHaveLength(cellCount)
      expect(cellCount).toBeGreaterThan(0)
      expect(tiles.every((t) => t.texture === `tile-${shape}-base`)).toBe(true)
    }
  }
})

test('only shapes that ask for grout get it', async ({ page }) => {
  await open(page)

  const hasBoard = async (): Promise<boolean> =>
    page.evaluate(() => {
      const scene = window.dyestopia!.game.scene.getScene('Game')!
      return scene.children.list.some((child) => child.name === 'board')
    })

  await openBoardWith(page, { shape: 'mosaic' })
  expect(await hasBoard(), 'mosaic sits in grout').toBe(true)

  await openBoardWith(page, { shape: 'blob' })
  expect(await hasBoard(), 'blob floats above the board').toBe(false)
})

test('the settings screen changes the board', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.setSettings({ shape: 'blob', theme: 'dyestopia' }))

  await page.evaluate(() => window.dyestopia!.goTo('Settings'))
  await waitForScene(page, 'Settings')

  // Click the labels the way a player would, through real hit-testing.
  const positionOf = (name: string) =>
    page.evaluate((n) => {
      const scene = window.dyestopia!.game.scene.getScene('Settings')!
      const target = scene.children.list.find((child) => child.name === n) as
        | Phaser.GameObjects.Text
        | undefined
      if (!target) throw new Error(`No option "${n}"`)
      return { x: target.x + target.width / 2, y: target.y + target.height / 2 }
    }, name)

  const mosaic = await positionOf('option-mosaic')
  await clickWorld(page, 'Settings', mosaic.x, mosaic.y)

  const neon = await positionOf('option-neon')
  await clickWorld(page, 'Settings', neon.x, neon.y)

  expect(await page.evaluate(() => window.dyestopia!.settings())).toEqual({
    shape: 'mosaic',
    theme: 'neon',
    sound: true,
  })

  await page.evaluate(() => window.dyestopia!.goTo('Game'))
  await waitForScene(page, 'Game')
  const tiles = await boardLook(page)
  expect(tiles.every((t) => t.texture === 'tile-mosaic-base')).toBe(true)
})

test('settings survive a reload', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.setSettings({ shape: 'mosaic', theme: 'dusk' }))

  await page.reload()
  await waitForScene(page, 'Menu')

  expect(await page.evaluate(() => window.dyestopia!.settings())).toEqual({
    shape: 'mosaic',
    theme: 'dusk',
    sound: true,
  })
})
