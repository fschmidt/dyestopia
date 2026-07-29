import { expect, test } from '@playwright/test'

import { open, waitForScene } from './helpers'

interface Bounds {
  left: number
  right: number
  top: number
  bottom: number
}

test('iPhone 15 Pro Max stage header clears the metric row', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Game', { stage: 9 })
  })
  await waitForScene(page, 'Game')

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    const multiplierBlock = scene.children.getByName(
      'multiplier-block',
    ) as Phaser.GameObjects.Container
    const multiplierValue = multiplierBlock.list.find(
      (child) =>
        child.type === 'Text' && (child as Phaser.GameObjects.Text).text.startsWith('×'),
    ) as Phaser.GameObjects.Text
    const bounds = (name: string): Bounds => {
      const value = (scene.children.getByName(name) as Phaser.GameObjects.Container).getBounds()
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom }
    }
    const flatten = (items: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] =>
      items.flatMap((item) => {
        const children = (item as Phaser.GameObjects.Container).list
        return Array.isArray(children) ? [item, ...flatten(children)] : [item]
      })
    const textBounds = (content: string): Bounds => {
      const text = flatten(scene.children.list).find(
        (item) => item.type === 'Text' && (item as Phaser.GameObjects.Text).text === content,
      ) as Phaser.GameObjects.Text
      const value = text.getBounds()
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom }
    }
    return {
      placard: bounds('stage-label'),
      pause: bounds('pause'),
      metricLabels: [textBounds('SCORE'), textBounds('TARGET'), textBounds('MOVES')],
      metricValues: [textBounds('0'), textBounds('5700'), textBounds('18')],
      chainRadius: (
        multiplierBlock.getByName('chain-ring') as Phaser.GameObjects.Container
      ).getData('radius') as number,
      multiplierFontSize: Number.parseFloat(String(multiplierValue.style.fontSize)),
    }
  })

  const metricTop = Math.min(...layout.metricLabels.map(({ top }) => top))
  expect(layout.placard.bottom + 24).toBeLessThanOrEqual(metricTop)
  expect(layout.pause.bottom + 24).toBeLessThanOrEqual(metricTop)
  expect(layout.metricValues[0].right).toBeLessThan(layout.metricValues[1].left)
  expect(layout.metricValues[1].right).toBeLessThan(layout.metricValues[2].left)
  expect(layout.chainRadius).toBeLessThanOrEqual(16)
  expect(layout.multiplierFontSize).toBeLessThanOrEqual(20)
})

test('iPhone 15 Pro Max settings labels clear their controls', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ visualStyle: 'spray-can' })
    window.dyestopia!.goTo('Settings')
  })
  await waitForScene(page, 'Settings')

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Settings')!
    const textBounds = (content: string): Bounds => {
      const text = (scene.children.list as Phaser.GameObjects.GameObject[]).find(
        (item) => item.type === 'Text' && (item as Phaser.GameObjects.Text).text === content,
      ) as Phaser.GameObjects.Text
      const value = text.getBounds()
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom }
    }
    const objectBounds = (name: string): Bounds => {
      const value = (scene.children.getByName(name) as Phaser.GameObjects.Container).getBounds()
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom }
    }
    return {
      visualStyleLabel: textBounds('VISUAL STYLE'),
      soundLabel: textBounds('SOUND'),
      visualStyleControls: [objectBounds('option-spray-can'), objectBounds('option-lab-dark')],
      soundControl: objectBounds('sound-switch'),
      preview: (scene.children.getByName('preview-shelf') as Phaser.GameObjects.Graphics)
        .getData('surfaceSize') as { width: number; height: number },
      previewY: (scene.children.getByName('preview-shelf') as Phaser.GameObjects.Graphics).y,
      back: objectBounds('button-back'),
      worldHeight: window.dyestopia!.game.scale.height / Math.min(window.devicePixelRatio || 1, 3),
    }
  })

  const styleTop = Math.min(...layout.visualStyleControls.map(({ top }) => top))
  expect(layout.visualStyleLabel.bottom + 8).toBeLessThanOrEqual(styleTop)
  expect(layout.soundLabel.bottom + 8).toBeLessThanOrEqual(layout.soundControl.top)
  expect(layout.previewY + layout.preview.height / 2 + 16).toBeLessThanOrEqual(layout.back.top)
  expect(layout.back.bottom).toBeLessThanOrEqual(layout.worldHeight)
})
