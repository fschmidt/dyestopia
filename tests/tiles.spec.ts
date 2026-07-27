import { expect, test } from '@playwright/test'

import { open, startGame } from './helpers'

test('tiles bake to sprite sheets at boot', async ({ page }) => {
  await open(page)

  const sheets = await page.evaluate(() => {
    const { textures } = window.dyestopia!.game
    return ['tile-base', 'tile-gloss'].map((key) => ({
      key,
      exists: textures.exists(key),
      // frame names are '__BASE' plus one per animation frame
      frames: textures.exists(key) ? textures.get(key).getFrameNames().length : 0,
    }))
  })

  for (const sheet of sheets) {
    expect(sheet.exists, `${sheet.key} was baked`).toBe(true)
    expect(sheet.frames, `${sheet.key} frame count`).toBe(24)
  }
})

test('the board animates, out of phase', async ({ page }) => {
  await open(page)
  await startGame(page)

  const framesOf = () =>
    page.evaluate(() => {
      const scene = window.dyestopia!.game.scene.getScene('Game')!
      return scene.children.list
        .filter((child) => child.name === 'tile')
        .map((tile) => {
          const base = (tile as Phaser.GameObjects.Container)
            .list[0] as Phaser.GameObjects.Sprite
          return Number(base.frame.name)
        })
    })

  const first = await framesOf()
  expect(first).toHaveLength(12)

  // Neighbours sharing a frame would make the whole board pulse in unison.
  expect(new Set(first).size).toBeGreaterThan(1)

  // And the idle is actually running, not parked on frame 0.
  await expect.poll(async () => (await framesOf())[0]).not.toBe(first[0])
})

test('freeze parks every tile on the same frame', async ({ page }) => {
  await open(page)
  await startGame(page)

  // The determinism that makes golden-image screenshots possible: without it,
  // two runs catch the idle at whatever frame the clock happened to land on.
  const parked = await page.evaluate(() => {
    window.dyestopia!.freeze(5)
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    return scene.children.list
      .filter((child) => child.name === 'tile')
      .flatMap((tile) =>
        (tile as Phaser.GameObjects.Container).list.map((child) =>
          Number((child as Phaser.GameObjects.Sprite).frame.name),
        ),
      )
  })

  expect(parked).toHaveLength(24)
  expect(new Set(parked)).toEqual(new Set([5]))
})
