import { expect, test } from '@playwright/test'

import { colorTier } from '../src/colors'
import { DEFAULT_SHAPE, SHAPES } from '../src/tiles/shapes'
import { getTheme } from '../src/themes'
import { open, startGame, waitForScene } from './helpers'

test('every splash treatment keeps the same behaviour', () => {
  expect(SHAPES.map(({ id, label }) => ({ id, label }))).toEqual([
    { id: 'splash', label: 'Splash' },
    { id: 'rim-splash', label: 'Rim Splash' },
    { id: 'soft-splash', label: 'Soft Splash' },
    { id: 'blob', label: 'Deep Splash' },
    { id: 'mosaic', label: 'Mosaic' },
  ])
  expect(DEFAULT_SHAPE).toBe('splash')
  for (const shape of SHAPES.slice(1, 4)) expect(shape.motion).toBe(SHAPES[0].motion)
})

test('the Dyestopia recipe uses the system-dye reference colours', () => {
  expect(getTheme('dyestopia').values).toMatchObject({
    red: 0xc05040,
    yellow: 0xeccc63,
    blue: 0x5473b3,
    green: 0x558f58,
    purple: 0x8058ae,
  })
})

test('colour tiers follow mixing depth', () => {
  expect(colorTier('red')).toBe(0)
  expect(colorTier('orange')).toBe(1)
  expect(colorTier('amber')).toBe(2)
  expect(colorTier('unknown')).toBe(0)
})

test('mixed tiles render without emissive glow layers', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 9 }))
  await waitForScene(page, 'Game')

  const effects = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    return scene.children.list
      .filter((child) => child.name === 'tile')
      .map((child) => {
        const tile = child as Phaser.GameObjects.Container & {
          dye: { name: string }
        }
        return {
          color: tile.dye.name,
          tier: tile.getData('colorTier'),
          childCount: tile.list.length,
          halos: tile.list.filter((part) => part.name === 'tier-glow').length,
          cores: tile.list.filter((part) => part.name === 'tier-core').length,
        }
      })
  })

  const red = effects.find(({ color }) => color === 'red')!
  const orange = effects.find(({ color }) => color === 'orange')!
  const amber = effects.find(({ color }) => color === 'amber')!
  expect(red).toMatchObject({ tier: 0, childCount: 2, halos: 0, cores: 0 })
  expect(orange).toMatchObject({ tier: 1, childCount: 2, halos: 0, cores: 0 })
  expect(amber).toMatchObject({ tier: 2, childCount: 2, halos: 0, cores: 0 })
})

test('every shape bakes its sheets at boot', async ({ page }) => {
  await open(page)

  const sheets = await page.evaluate(() => {
    const { textures } = window.dyestopia!.game
    return ['splash', 'rim-splash', 'soft-splash', 'blob', 'mosaic'].flatMap((shape) =>
      ['base', 'gloss'].map((layer) => {
        const key = `tile-${shape}-${layer}`
        return {
          key,
          exists: textures.exists(key),
          frames: textures.exists(key) ? textures.get(key).getFrameNames().length : 0,
        }
      }),
    )
  })

  // All shapes are baked up front, not on demand — that's what lets the
  // settings screen switch without a stall.
  expect(sheets).toHaveLength(10)
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
  const cellCount = await page.evaluate(() => window.dyestopia!.board().cells.length)
  expect(first).toHaveLength(cellCount)

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

  // Two sprites per tile — base and gloss — all parked on the same frame.
  const cellCount = await page.evaluate(() => window.dyestopia!.board().cells.length)
  expect(parked).toHaveLength(cellCount * 2)
  expect(new Set(parked)).toEqual(new Set([5]))
})
