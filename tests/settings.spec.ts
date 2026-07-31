import { expect, test, type Page } from '@playwright/test'

import { clickWorld, hitTarget, open, waitForScene } from './helpers'

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

  for (const shape of ['splash', 'blob', 'mosaic']) {
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
    background: 'fluid-ink',
    visualStyle: 'spray-can',
    sound: true,
    unlockAllStages: false,
  })

  await page.evaluate(() => window.dyestopia!.goTo('Game'))
  await waitForScene(page, 'Game')
  const tiles = await boardLook(page)
  expect(tiles.every((t) => t.texture === 'tile-mosaic-base')).toBe(true)
})

test('settings survive a reload', async ({ page }) => {
  await open(page)
  await page.evaluate(() =>
    window.dyestopia!.setSettings({
      shape: 'mosaic',
      theme: 'dusk',
      background: 'frosted-glass',
      visualStyle: 'spray-can',
    } as never),
  )

  await page.reload()
  await waitForScene(page, 'Menu')

  expect(await page.evaluate(() => window.dyestopia!.settings())).toEqual({
    shape: 'mosaic',
    theme: 'dusk',
    background: 'fluid-ink',
    visualStyle: 'spray-can',
    sound: true,
    unlockAllStages: false,
  })
})

test('the selected visual style survives reload and drives scene components', async ({ page }) => {
  await open(page)
  await page.evaluate(() =>
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' } as never),
  )

  await page.reload()
  await waitForScene(page, 'Menu')

  const result = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Menu')!
    const play = scene.children.getByName('button-play') as Phaser.GameObjects.Container
    return {
      setting: window.dyestopia!.settings().visualStyle,
      treatment: play.getData('visualTreatment'),
    }
  })
  expect(result).toEqual({ setting: 'spray-can', treatment: 'spray-can' })
})

test('the settings style control applies another treatment without moving scenes', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Settings'))
  await waitForScene(page, 'Settings')

  const lab = await hitTarget(page, 'Settings', 'option-lab-dark')
  await clickWorld(page, 'Settings', lab.x, lab.y)
  await waitForScene(page, 'Settings')

  const result = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Settings')!
    const back = scene.children.getByName('button-back') as Phaser.GameObjects.Container
    return {
      setting: window.dyestopia!.settings().visualStyle,
      treatment: back.getData('visualTreatment'),
    }
  })
  expect(result).toEqual({ setting: 'lab-dark', treatment: 'lab' })
})

test('the selected background renders behind every scene', async ({ page }) => {
  await open(page)
  await page.evaluate(() =>
    window.dyestopia!.setSettings({ background: 'fluid-ink' } as never),
  )

  for (const sceneKey of ['Menu', 'Settings', 'StageSelect', 'Game']) {
    await page.evaluate((key) => window.dyestopia!.goTo(key), sceneKey)
    await waitForScene(page, sceneKey)

    const background = await page.evaluate((key) => {
      const scene = window.dyestopia!.game.scene.getScene(key)!
      const child = scene.children.list.find(
        (candidate) => candidate.name === 'background',
      ) as Phaser.GameObjects.Image | undefined
      return child
        ? { texture: child.texture.key, depth: child.depth }
        : undefined
    }, sceneKey)

    expect(background).toEqual({ texture: 'background-fluid-ink', depth: -1000 })
  }
})
