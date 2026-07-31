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
    const object = (name: string) => {
      const direct = scene.children.getByName(name)
      if (direct) return direct
      for (const child of scene.children.list) {
        const container = child as Phaser.GameObjects.Container
        if (Array.isArray(container.list)) {
          const nested = container.getByName(name)
          if (nested) return nested
        }
      }
      return undefined
    }
    const titled = (object('title-card') as Phaser.GameObjects.Container).list
    const dyes = object('title-dyes') as Phaser.GameObjects.Text
    const topia = object('title-topia') as Phaser.GameObjects.Text
    const play = object('button-play') as Phaser.GameObjects.Container
    const settings = object('button-settings') as Phaser.GameObjects.Container
    return {
      atmosphere: Boolean(object('skin-atmosphere')),
      titleCard: Boolean(object('title-card')),
      tagline: (object('title-tagline') as Phaser.GameObjects.Text)?.text,
      dyes: { x: dyes.x, y: dyes.y },
      topia: { x: topia.x, y: topia.y },
      play: { y: play.y, width: play.width },
      settings: {
        y: settings.y,
        width: settings.width,
      },
      titleRule: Boolean(object('title-rule')),
      colorSheets: scene.children.list.filter((child) => child.name === 'menu-color-sheet').length,
      swatches: titled.filter((child) => child.name === 'title-swatch').length,
    }
  })

  expect(composition.atmosphere).toBe(true)
  expect(composition.titleCard).toBe(true)
  expect(composition.tagline).toBe('SWAP · MIX · CHAIN')
  expect(composition.dyes.x).toBe(composition.topia.x)
  expect(composition.dyes.y).toBeLessThan(composition.topia.y)
  expect(composition.swatches).toBe(6)
  expect(composition.titleRule).toBe(true)
  expect(composition.colorSheets).toBe(4)
  expect(composition.play.y).toBeLessThan(composition.settings.y)
  expect(composition.play.width).toBeGreaterThan(composition.settings.width)
})

test('shared primary buttons use the brighter reference highlight on hover', async ({ page }) => {
  await open(page)
  const colors = async () => page.evaluate(() => {
    const button = window.dyestopia!.game.scene
      .getScene('Menu')!
      .children.getByName('button-play') as Phaser.GameObjects.Container
    return {
      kind: button.getData('buttonKind') as string,
      resting: button.getData('buttonFill') as number,
      highlighted: button.getData('buttonHighlight') as number,
    }
  })

  const resting = await colors()
  expect(resting.kind).toBe('primary')
  expect(resting.highlighted).not.toBe(resting.resting)

  const play = await hitTarget(page, 'Menu', 'button-play')
  const viewport = await page.evaluate(
    (point) => window.dyestopia!.worldToViewport('Menu', point.x, point.y),
    play,
  )
  await page.mouse.move(viewport.x, viewport.y)
  await expect.poll(async () => (await colors()).resting).toBe(resting.highlighted)
})

test('portrait menu follows the supplied poster proportions', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await open(page)

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Menu')!
    const bounds = (name: string) =>
      (scene.children.getByName(name) as Phaser.GameObjects.Container).getBounds()
    const button = (name: string) => {
      const object = scene.children.getByName(name) as Phaser.GameObjects.Container
      return { width: object.width, centerY: object.y }
    }
    return {
      card: bounds('title-card'),
      play: button('button-play'),
      settings: button('button-settings'),
    }
  })

  expect(layout.card.x / 393).toBeGreaterThan(0.07)
  expect(layout.card.x / 393).toBeLessThan(0.1)
  expect(layout.card.y / 852).toBeGreaterThan(0.21)
  expect(layout.card.y / 852).toBeLessThan(0.26)
  expect(layout.card.width / 393).toBeGreaterThan(0.81)
  expect(layout.card.width / 393).toBeLessThan(0.86)
  expect(layout.card.height / 852).toBeGreaterThan(0.33)
  expect(layout.card.height / 852).toBeLessThan(0.37)
  expect(layout.play.width / 393).toBeGreaterThan(0.45)
  expect(layout.play.width / 393).toBeLessThan(0.52)
  expect(layout.play.centerY / 852).toBeGreaterThan(0.64)
  expect(layout.play.centerY / 852).toBeLessThan(0.7)
  expect(layout.settings.centerY / 852).toBeGreaterThan(0.71)
  expect(layout.settings.centerY / 852).toBeLessThan(0.76)
})

test('the complete title artwork shares the placard tilt', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await open(page)

  const placard = await page.evaluate(() => {
    const card = window.dyestopia!.game.scene
      .getScene('Menu')!
      .children.getByName('title-card') as Phaser.GameObjects.Container
    return {
      angle: card.angle,
      children: card.list.map((child) => child.name).filter(Boolean),
    }
  })

  expect(placard.angle).not.toBe(0)
  expect(placard.children).toEqual(expect.arrayContaining([
    'title-paper',
    'title-dyes',
    'title-topia',
    'title-rule',
    'title-tagline',
  ]))
  expect(placard.children.filter((name) => name === 'title-swatch')).toHaveLength(6)
})

test('settings controls use touch-sized choices and a framed ON/OFF sound row', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Settings'))
  await waitForScene(page, 'Settings')
  const objects = await visualObjects(page, 'Settings')

  const options = objects.filter((item) => item.name.startsWith('option-'))
  expect(options.length).toBeGreaterThan(4)
  expect(options.every((item) => item.width >= 44 && item.height >= 44)).toBe(true)
  expect(objects.some((item) => item.name === 'sound-switch')).toBe(true)
  expect(objects.some((item) => item.name === 'sound-on')).toBe(true)
  expect(objects.some((item) => item.name === 'sound-off')).toBe(true)
  expect(objects.some((item) => item.name === 'preview-shelf')).toBe(true)
  expect(objects.some((item) => item.name === 'option-spray-can')).toBe(true)
  expect(objects.some((item) => item.name === 'option-lab-dark')).toBe(true)
  expect(objects.some((item) => item.name.startsWith('background-'))).toBe(false)

  const rows = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Settings')!
    const text = (value: string) =>
      (scene.children.list.find(
        (item) => item.type === 'Text' && (item as Phaser.GameObjects.Text).text === value,
      ) as Phaser.GameObjects.Text).getBounds()
    const style = (scene.children.getByName('option-spray-can') as Phaser.GameObjects.Container).getBounds()
    const sound = (scene.children.getByName('sound-switch') as Phaser.GameObjects.Container).getBounds()
    return {
      hasBackgroundLabel: scene.children.list.some(
        (item) => item.type === 'Text' && (item as Phaser.GameObjects.Text).text === 'BACKGROUND',
      ),
      styleBottom: style.bottom,
      soundLabelTop: text('SOUND').top,
      soundTop: sound.top,
    }
  })
  expect(rows.hasBackgroundLabel).toBe(false)
  expect(rows.soundLabelTop).toBeGreaterThan(rows.styleBottom)
  expect(rows.soundTop).toBeGreaterThan(rows.styleBottom)
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
  expect(objects.some((item) => item.name === 'multiplier-block')).toBe(true)
  expect(objects.some((item) => item.name === 'chain-ring')).toBe(true)
  expect(objects.some((item) => item.name === 'target-block')).toBe(true)
  expect(objects.some((item) => item.name === 'moves-block')).toBe(true)
  expect(objects.filter((item) => item.name === 'tool-slot')).toHaveLength(0)
  expect(objects.some((item) => item.name === 'skin-atmosphere')).toBe(true)
})

test('chain indicator aligns with the metric values without a redundant label', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Game', { stage: 8 })
  })
  await waitForScene(page, 'Game')

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    const block = scene.children.getByName('multiplier-block') as Phaser.GameObjects.Container
    const ring = block.getByName('chain-ring') as Phaser.GameObjects.Container
    const target = scene.children.getByName('target-block') as Phaser.GameObjects.Container
    const targetValue = target.list.find(
      (child) => child.type === 'Text' && /^\d+$/.test((child as Phaser.GameObjects.Text).text),
    ) as Phaser.GameObjects.Text
    return {
      labels: block.list
        .filter((child) => child.type === 'Text')
        .map((child) => (child as Phaser.GameObjects.Text).text),
      radius: ring.getData('radius') as number,
      centerY: block.y + ring.y,
      targetCenterY: targetValue.getBounds().centerY,
    }
  })

  expect(layout.labels).not.toContain('CHAIN')
  expect(layout.radius).toBeLessThanOrEqual(16)
  expect(Math.abs(layout.centerY - layout.targetCenterY)).toBeLessThanOrEqual(6)
})

test('chain ring contains exactly the result colours mixable in the current stage', async ({
  page,
}) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Game', { stage: 1 })
  })
  await waitForScene(page, 'Game')

  const ringColors = () =>
    page.evaluate(() => {
      const scene = window.dyestopia!.game.scene.getScene('Game')!
      const block = scene.children.getByName(
        'multiplier-block',
      ) as Phaser.GameObjects.Container | null
      const ring = block?.getByName('chain-ring') as Phaser.GameObjects.Container | null
      return ring?.list
        .filter((child) => child.name === 'chain-segment')
        .map((child) => child.getData('color')) ?? null
    })

  expect(await ringColors()).toEqual(['orange'])

  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 8 }))
  await waitForScene(page, 'Game')
  expect(await ringColors()).toEqual(['orange', 'green', 'purple', 'magenta'])
})

test('a completed chain keeps the one-shot payoff without glow or an outer ring', async ({
  page,
}) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Game', { stage: 1 })
  })
  await waitForScene(page, 'Game')

  const payoff = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')! as Phaser.Scene & {
      colorChain: { results: ['orange']; multiplier: number }
      updateHud(): void
    }
    scene.colorChain = { results: ['orange'], multiplier: 2 }
    scene.updateHud()
    const block = scene.children.getByName('multiplier-block') as Phaser.GameObjects.Container
    const ring = block.getByName('chain-ring') as Phaser.GameObjects.Container
    const multiplier = block.list.find(
      (child) => child.type === 'Text' && (child as Phaser.GameObjects.Text).text === '×2',
    ) as Phaser.GameObjects.Text
    return {
      outline: ring.list.some((child) => child.name === 'chain-complete-outline'),
      glow: ring.list.some((child) => child.name === 'chain-glow'),
      animated: scene.tweens.getTweensOf(ring).length > 0,
      multiplierColor: multiplier.style.color,
    }
  })

  expect(payoff).toMatchObject({
    outline: false,
    glow: false,
    animated: true,
    multiplierColor: '#f4f0e6',
  })
})

test('Spray Can stage placard toggles its objective panel', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Game', { stage: 1 })
  })
  await waitForScene(page, 'Game')

  expect(await hitTarget(page, 'Game', 'stage-label')).toBeTruthy()
  const placard = await hitTarget(page, 'Game', 'stage-label')
  await clickWorld(page, 'Game', placard.x, placard.y)
  expect(
    await page.evaluate(() =>
      Boolean(window.dyestopia!.game.scene.getScene('Game')!.children.getByName('objective-panel')),
    ),
  ).toBe(true)

  await clickWorld(page, 'Game', placard.x, placard.y)
  expect(
    await page.evaluate(() =>
      Boolean(window.dyestopia!.game.scene.getScene('Game')!.children.getByName('objective-panel')),
    ),
  ).toBe(false)
})

test('Spray Can pause dialog resumes or routes to settings', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Game', { stage: 1 })
  })
  await waitForScene(page, 'Game')

  const pause = await hitTarget(page, 'Game', 'pause')
  await clickWorld(page, 'Game', pause.x, pause.y)
  expect(await hitTarget(page, 'Game', 'resume')).toBeTruthy()
  expect(await hitTarget(page, 'Game', 'pause-settings')).toBeTruthy()

  const resume = await hitTarget(page, 'Game', 'resume')
  await clickWorld(page, 'Game', resume.x, resume.y)
  expect(
    await page.evaluate(() =>
      Boolean(window.dyestopia!.game.scene.getScene('Game')!.children.getByName('pause-dialog')),
    ),
  ).toBe(false)

  await clickWorld(page, 'Game', pause.x, pause.y)
  const settings = await hitTarget(page, 'Game', 'pause-settings')
  await clickWorld(page, 'Game', settings.x, settings.y)
  await waitForScene(page, 'Settings')
})

test('Pause Help shows each recipe with the original stage tiles and no colour labels', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 8 }))
  await waitForScene(page, 'Game')

  const pause = await hitTarget(page, 'Game', 'pause')
  await clickWorld(page, 'Game', pause.x, pause.y)
  const help = await hitTarget(page, 'Game', 'pause-help')
  await clickWorld(page, 'Game', help.x, help.y)

  const reference = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    const panel = scene.children.getByName('mix-help')
    const rows = panel?.getData('mixes') as
      | { result: string; ingredients: string[] }[]
      | undefined
    const tiles = panel && 'list' in panel
      ? (panel as Phaser.GameObjects.Container).list
          .filter((child) => child.name === 'help-mix-tile')
          .map((child) => ({
            recipe: child.getData('recipe'),
            role: child.getData('role'),
            color: child.getData('color'),
            childTypes: (child as Phaser.GameObjects.Container).list.map((part) => part.type),
          }))
      : []
    return {
      exists: Boolean(panel),
      rows,
      tiles,
      texts: window.dyestopia!.texts('Game'),
      hasBack: window.dyestopia!.hitTargets('Game').some((target) => target.name === 'help-back'),
    }
  })

  expect(reference.exists).toBe(true)
  expect(reference.rows).toEqual([
    { result: 'orange', ingredients: ['red', 'yellow'] },
    { result: 'green', ingredients: ['yellow', 'blue'] },
    { result: 'purple', ingredients: ['red', 'blue'] },
    { result: 'magenta', ingredients: ['red', 'purple'] },
  ])
  expect(reference.texts).toContain('MIX HELP')
  expect(reference.texts).not.toContain('RED + YELLOW')
  expect(reference.texts).not.toContain('ORANGE')
  expect(reference.tiles).toHaveLength(12)
  expect(reference.tiles.filter(({ recipe }) => recipe === 0).map(({ role, color }) => ({
    role,
    color,
  }))).toEqual([
    { role: 'ingredient', color: 'red' },
    { role: 'ingredient', color: 'yellow' },
    { role: 'result', color: 'orange' },
  ])
  for (const tile of reference.tiles) expect(tile.childTypes).toContain('Sprite')
  expect(reference.hasBack).toBe(true)
})

test('mixed tiles use only their original artwork without ingredient indicators', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 1 }))
  await waitForScene(page, 'Game')

  const signatures = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    return scene.children.list
      .filter((child) => child.name === 'tile')
      .flatMap((tile) => {
        const signature = (tile as Phaser.GameObjects.Container).getByName('mix-signature')
        if (!signature) return []
        return [signature.getData('ingredients')]
      })
  })

  expect(signatures).toEqual([])
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
      ['TILE SHAPE', 'COLOUR RECIPE', 'VISUAL STYLE', 'SOUND', 'Lab sounds'].includes(text.text),
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

test('stage pause control does not overlap moves', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { stage: 0 }))
  await waitForScene(page, 'Game')

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    const hud = scene.children.getByName('game-hud') as Phaser.GameObjects.Graphics
    const hudSize = hud.getData('surfaceSize') as { width: number; height: number }
    const pause = scene.children.getByName('pause') as Phaser.GameObjects.Container
    const pauseBounds = {
      left: pause.x - (pause.width * pause.scaleX) / 2,
      right: pause.x + (pause.width * pause.scaleX) / 2,
      top: pause.y - (pause.height * pause.scaleY) / 2,
      bottom: pause.y + (pause.height * pause.scaleY) / 2,
    }
    const movesBlock = scene.children.getByName('moves-block') as
      | Phaser.GameObjects.Container
      | null
    const texts = scene.children.list.filter((item) => item.type === 'Text') as Phaser.GameObjects.Text[]
    const moves = texts.find((text) => text.text.startsWith('Moves:'))
    const other = movesBlock?.getBounds() ?? moves!.getBounds()
    const overlaps = !(
      pauseBounds.right + 4 <= other.left ||
      pauseBounds.left >= other.right + 4 ||
      pauseBounds.bottom + 4 <= other.top ||
      pauseBounds.top >= other.bottom + 4
    )
    return {
      overlaps,
      contained:
        pauseBounds.left >= hud.x - hudSize.width / 2 + 8 &&
        pauseBounds.right <= hud.x + hudSize.width / 2 - 8 &&
        pauseBounds.top >= hud.y - hudSize.height / 2 + 8 &&
        pauseBounds.bottom <= hud.y + hudSize.height / 2 - 8,
    }
  })
  expect(layout.overlaps).toBe(false)
  expect(layout.contained).toBe(true)
})
