import { expect, test, type Page } from '@playwright/test'

import {
  LAB_PROFILE,
  PAPER_PROFILE,
  SPRAY_CAN_PROFILE,
  getVisualProfile,
  resolveVisualProfile,
  selectVisualProfile,
  setVisualProfile,
} from '../src/ui/visual-system'
import { clickWorld, hitTarget, open, waitForScene } from './helpers'

interface VisualObject {
  name: string
  type: string
  width: number
  height: number
  depth: number
}

async function visualObjects(page: Page, sceneKey: string): Promise<VisualObject[]> {
  return page.evaluate((key) => {
    const scene = window.dyestopia!.game.scene.getScene(key)!
    const flatten = (items: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] =>
      items.flatMap((item) => {
        const children = (item as Phaser.GameObjects.Container).list
        return Array.isArray(children) ? [item, ...flatten(children)] : [item]
      })

    return flatten(scene.children.list).map((item) => {
      const sized = item as Phaser.GameObjects.GameObject & {
        width?: number
        height?: number
        displayWidth?: number
        displayHeight?: number
        depth: number
      }
      return {
        name: item.name,
        type: item.type,
        width: sized.displayWidth ?? sized.width ?? 0,
        height: sized.displayHeight ?? sized.height ?? 0,
        depth: sized.depth,
      }
    })
  }, sceneKey)
}

test('the resolver can swap every semantic colour without scene or background input', () => {
  expect(resolveVisualProfile()).toBe(SPRAY_CAN_PROFILE)
  try {
    setVisualProfile(PAPER_PROFILE)
    expect(resolveVisualProfile()).toBe(PAPER_PROFILE)
    expect(resolveVisualProfile().colors.surface).not.toBe(LAB_PROFILE.colors.surface)
  } finally {
    setVisualProfile()
  }
})

test('visual profiles are selected by persisted ids with a safe fallback', () => {
  try {
    selectVisualProfile('spray-can')
    expect(resolveVisualProfile()).toBe(SPRAY_CAN_PROFILE)
    expect(getVisualProfile('missing')).toBe(LAB_PROFILE)
  } finally {
    selectVisualProfile(LAB_PROFILE.id)
  }
})

test('menu actions live on one labelled control surface', async ({ page }) => {
  await open(page)
  const objects = await visualObjects(page, 'Menu')

  expect(objects.some((item) => item.name === 'menu-controls')).toBe(true)
  expect(objects.some((item) => item.name === 'button-play')).toBe(true)
  expect(objects.some((item) => item.name === 'button-settings')).toBe(true)
})

test('Spray Can menu uses the reference composition rather than the lab layout', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Menu')
  })
  await waitForScene(page, 'Menu')

  const composition = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Menu')!
    const object = (name: string) => scene.children.getByName(name) as
      | Phaser.GameObjects.Text
      | Phaser.GameObjects.Container
      | Phaser.GameObjects.Graphics
    const dyes = object('title-dyes')
    const topia = object('title-topia')
    const play = object('button-play')
    const settings = object('button-settings')
    return {
      atmosphere: Boolean(object('skin-atmosphere')),
      labMark: Boolean(object('lab-mark')),
      dyes: { x: (dyes as Phaser.GameObjects.Text).x, y: (dyes as Phaser.GameObjects.Text).y },
      topia: { x: (topia as Phaser.GameObjects.Text).x, y: (topia as Phaser.GameObjects.Text).y },
      play: { y: (play as Phaser.GameObjects.Container).y, width: (play as Phaser.GameObjects.Container).width },
      settings: {
        y: (settings as Phaser.GameObjects.Container).y,
        width: (settings as Phaser.GameObjects.Container).width,
      },
      titleRule: Boolean(object('title-rule')),
      startLabelType: object('start-label')?.type,
      swatches: scene.children.list.filter((child) => child.name === 'title-swatch').length,
    }
  })

  expect(composition.atmosphere).toBe(true)
  expect(composition.labMark).toBe(true)
  expect(composition.dyes.x).toBe(composition.topia.x)
  expect(composition.dyes.y).toBeLessThan(composition.topia.y)
  expect(composition.swatches).toBe(5)
  expect(composition.titleRule).toBe(false)
  expect(composition.startLabelType).toBe('Container')
  expect(composition.play.y).toBeLessThan(composition.settings.y)
  expect(composition.play.width).toBe(composition.settings.width)
})

test('settings controls use touch-sized segmented choices and a sound switch', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Settings'))
  await waitForScene(page, 'Settings')
  const objects = await visualObjects(page, 'Settings')

  const options = objects.filter((item) => item.name.startsWith('option-'))
  expect(options.length).toBeGreaterThan(4)
  expect(options.every((item) => item.width >= 44 && item.height >= 44)).toBe(true)
  expect(objects.some((item) => item.name === 'sound-switch')).toBe(true)
  expect(objects.some((item) => item.name === 'preview-shelf')).toBe(true)
  expect(objects.some((item) => item.name === 'option-spray-can')).toBe(true)
  expect(objects.some((item) => item.name === 'option-lab-dark')).toBe(true)
})

test('game presents one HUD label and one separate hint strip', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 0 }))
  await waitForScene(page, 'Game')
  const objects = await visualObjects(page, 'Game')

  expect(objects.filter((item) => item.name === 'game-hud')).toHaveLength(1)
  expect(objects.filter((item) => item.name === 'hint-strip')).toHaveLength(1)
  expect(objects.some((item) => item.name === 'progress-meter')).toBe(true)
})

test('Spray Can game HUD separates the paper stage label from score and moves', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Game', { stage: 0 })
  })
  await waitForScene(page, 'Game')
  const objects = await visualObjects(page, 'Game')

  expect(objects.some((item) => item.name === 'stage-label')).toBe(true)
  expect(objects.some((item) => item.name === 'score-block')).toBe(true)
  expect(objects.some((item) => item.name === 'moves-block')).toBe(true)
  expect(objects.some((item) => item.name === 'skin-atmosphere')).toBe(true)
})

test('settings content remains inside its surfaces after a live selection', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Settings'))
  await waitForScene(page, 'Settings')

  const neon = await hitTarget(page, 'Settings', 'option-neon')
  await clickWorld(page, 'Settings', neon.x, neon.y)

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Settings')!
    const surfaceBounds = (name: string) => {
      const surface = scene.children.getByName(name) as Phaser.GameObjects.Graphics
      const size = surface.getData('surfaceSize') as { width: number; height: number }
      return {
        top: surface.y - size.height / 2,
        bottom: surface.y + size.height / 2,
      }
    }
    const panel = surfaceBounds('settings-panel')
    const shelf = surfaceBounds('preview-shelf')
    const texts = scene.children.list.filter((item) => item.type === 'Text') as Phaser.GameObjects.Text[]
    const labels = texts.filter((text) =>
      ['TILE SHAPE', 'COLOUR RECIPE', 'BACKGROUND', 'SOUND', 'Lab sounds'].includes(text.text),
    )
    const tiles = scene.children.list.filter((item) => item.name === 'tile') as Phaser.GameObjects.Container[]
    return {
      panel: { top: panel.top, bottom: panel.bottom },
      shelf: { top: shelf.top, bottom: shelf.bottom },
      labels: labels.map((label) => ({ text: label.text, top: label.getBounds().top, bottom: label.getBounds().bottom })),
      tiles: tiles.map((tile) => ({ top: tile.getBounds().top, bottom: tile.getBounds().bottom })),
    }
  })

  expect(layout.labels.every(({ top, bottom }) => top >= layout.panel.top && bottom <= layout.panel.bottom)).toBe(true)
  expect(layout.tiles.every(({ top, bottom }) => top >= layout.shelf.top && bottom <= layout.shelf.bottom)).toBe(true)
})

test('stage frontier stays inside its ledger surface', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('StageSelect'))
  await waitForScene(page, 'StageSelect')

  const bounds = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('StageSelect')!
    const surface = scene.children.getByName('stage-ledger') as Phaser.GameObjects.Graphics
    const size = surface.getData('surfaceSize') as { height: number }
    const ledger = { bottom: surface.y + size.height / 2 }
    const frontier = (scene.children.getByName('frontier') as Phaser.GameObjects.Text).getBounds()
    return { ledgerBottom: ledger.bottom, frontierBottom: frontier.bottom }
  })
  expect(bounds.frontierBottom).toBeLessThanOrEqual(bounds.ledgerBottom)
})

test('Spray Can stage select uses ledger labels and a clipped industrial panel', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('StageSelect')
  })
  await waitForScene(page, 'StageSelect')

  const treatment = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('StageSelect')!
    const ledger = scene.children.getByName('stage-ledger')!
    return {
      titleLabel: Boolean(scene.children.getByName('stage-title-label')),
      frontierLabel: Boolean(scene.children.getByName('frontier-label')),
      panelTreatment: ledger.getData('visualTreatment'),
    }
  })
  expect(treatment).toEqual({
    titleLabel: true,
    frontierLabel: true,
    panelTreatment: 'spray-can',
  })
})

test('stage navigation does not overlap moves or target text', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 0 }))
  await waitForScene(page, 'Game')

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    const hud = scene.children.getByName('game-hud') as Phaser.GameObjects.Graphics
    const hudSize = hud.getData('surfaceSize') as { width: number; height: number }
    const back = scene.children.getByName('back') as Phaser.GameObjects.Container
    const backBounds = {
      left: back.x - (back.width * back.scaleX) / 2,
      right: back.x + (back.width * back.scaleX) / 2,
      top: back.y - (back.height * back.scaleY) / 2,
      bottom: back.y + (back.height * back.scaleY) / 2,
    }
    const movesBlock = scene.children.getByName('moves-block') as
      | Phaser.GameObjects.Container
      | null
    const texts = scene.children.list.filter((item) => item.type === 'Text') as Phaser.GameObjects.Text[]
    const moves = texts.find((text) => text.text.startsWith('Moves:'))
    const other = movesBlock?.getBounds() ?? moves!.getBounds()
    const overlaps = !(
      backBounds.right + 4 <= other.left ||
      backBounds.left >= other.right + 4 ||
      backBounds.bottom + 4 <= other.top ||
      backBounds.top >= other.bottom + 4
    )
    return {
      overlaps,
      contained:
        backBounds.left >= hud.x - hudSize.width / 2 + 8 &&
        backBounds.right <= hud.x + hudSize.width / 2 - 8 &&
        backBounds.top >= hud.y - hudSize.height / 2 + 8 &&
        backBounds.bottom <= hud.y + hudSize.height / 2 - 8,
    }
  })
  expect(layout.overlaps).toBe(false)
  expect(layout.contained).toBe(true)
})
