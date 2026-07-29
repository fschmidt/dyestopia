import { expect, test } from '@playwright/test'

import { resolveMove } from '../src/board'
import { STAGES } from '../src/stages'
import { stageMixes } from '../src/stage'
import { TUTORIALS } from '../src/tutorials'
import {
  board,
  clickWorld,
  dragWorld,
  hitTarget,
  moveOfKind,
  open,
  rulesFor,
  toEngine,
  waitForScene,
} from './helpers'

async function dismissTutorialExplanation(page: Parameters<typeof hitTarget>[0]): Promise<void> {
  const button = await hitTarget(page, 'Game', 'tutorial-explanation-continue')
  await clickWorld(page, 'Game', button.x, button.y)
}

test('tutorials and regular stages have independent natural progression', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.resetProgress()
    window.dyestopia!.setSettings({ unlockAllStages: false })
    window.dyestopia!.goTo('StageSelect')
  })
  await waitForScene(page, 'StageSelect')

  const names = await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').map((target) => target.name),
  )
  expect(names.filter((name) => name.startsWith('tutorial-'))).toEqual(['tutorial-0'])
  expect(names.filter((name) => name.startsWith('stage-'))).toEqual(['stage-0'])
  expect(await page.evaluate(() => window.dyestopia!.progressState())).toEqual({
    clearedStages: [],
    clearedTutorials: [],
  })
})

test('unlock-all exposes every lesson and stage without marking them cleared', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.resetProgress()
    window.dyestopia!.setSettings({ unlockAllStages: true })
    window.dyestopia!.goTo('StageSelect')
  })
  await waitForScene(page, 'StageSelect')

  const names = await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').map((target) => target.name),
  )
  expect(names.filter((name) => name.startsWith('tutorial-'))).toHaveLength(TUTORIALS.length)
  expect(names.filter((name) => name.startsWith('stage-'))).toHaveLength(STAGES.length)
  expect(await page.evaluate(() => window.dyestopia!.progressState())).toEqual({
    clearedStages: [],
    clearedTutorials: [],
  })
})

test('settings exposes the persisted unlock-all switch below Sound', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Settings'))
  await waitForScene(page, 'Settings')

  const labels = await page.evaluate(() => window.dyestopia!.texts('Settings'))
  expect(labels).toContain('SOUND')
  expect(labels).toContain('UNLOCK ALL STAGES')

  const toggle = await hitTarget(page, 'Settings', 'unlock-all-switch')
  await clickWorld(page, 'Settings', toggle.x, toggle.y)
  expect(await page.evaluate(() => window.dyestopia!.settings().unlockAllStages)).toBe(true)

  await page.reload()
  await waitForScene(page, 'Menu')
  expect(await page.evaluate(() => window.dyestopia!.settings().unlockAllStages)).toBe(true)
})

test('the tutorial section launches a normal game stage with progressive disclosure', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.resetProgress()
    window.dyestopia!.setSettings({ unlockAllStages: false })
    window.dyestopia!.goTo('StageSelect')
  })
  await waitForScene(page, 'StageSelect')

  const first = await hitTarget(page, 'StageSelect', 'tutorial-0')
  await clickWorld(page, 'StageSelect', first.x, first.y)
  await waitForScene(page, 'Game')

  const report = await board(page)
  expect((report as typeof report & { tutorial: number | null }).tutorial).toBe(0)
  expect(report.cells.length).toBeGreaterThan(0)
  const presentation = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    return {
      tiles: scene.children.list.filter((child) => child.name === 'tile').length,
      instruction: (scene.children.getByName('tutorial-instruction') as Phaser.GameObjects.Text | null)?.visible,
      score: (scene.children.getByName('score-block') as Phaser.GameObjects.Container | null)?.visible,
      moves: (scene.children.getByName('moves-block') as Phaser.GameObjects.Container | null)?.visible,
    }
  })
  expect(presentation.tiles).toBe(report.cells.length)
  expect(presentation).toMatchObject({
    instruction: true,
    score: false,
    moves: false,
  })
  const copy = await page.evaluate(() => window.dyestopia!.texts('Game'))
  expect(copy.some((line) => line.includes('MAKE A MATCH'))).toBe(true)
  expect(copy.some((line) => line.includes('Swap'))).toBe(true)
})

const TUTORIAL_INTRODUCTIONS = [
  'A Match is three tiles of the same colour in a row.',
  'A Mix combines neighbouring primary colours into a new colour.',
  'The Chain indicator fills when you create different Mix results.',
  'A Rainbow Chain contains every colour shown in the Chain indicator.',
  'A Chain Breaker is a Swap made after filling two Chain colours.',
  'A Rainbow Chain Breaker is a Swap made with a complete Rainbow Chain.',
]

test('chain lessons distinguish a two-of-three Chain from a three-of-three Rainbow Chain', () => {
  for (const tutorialIndex of [2, 3, 4, 5]) {
    expect(stageMixes(TUTORIALS[tutorialIndex].stage)).toHaveLength(3)
  }
})

test('tutorial 4 can complete all three Rainbow Chain colours', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.resetProgress()
    window.dyestopia!.goTo('Game', { tutorial: 3 })
  })
  await waitForScene(page, 'Game')
  await dismissTutorialExplanation(page)

  const report = await board(page)
  expect(report.chainResults).toHaveLength(2)
  const { grid, cells } = toEngine(report)
  let move: [number, number] | null = null
  for (let from = 0; from < cells.length && !move; from++) {
    for (let to = 0; to < cells.length && !move; to++) {
      if (!cells[from] || !cells[to]) continue
      const resolved = resolveMove(grid, cells, rulesFor(TUTORIALS[3].stage), from, to)
      if (
        resolved.kind === 'merge'
        && !report.chainResults.includes(resolved.result)
      ) move = [from, to]
    }
  }
  expect(move, 'the final distinct Mix should be available').not.toBeNull()
  await dragWorld(
    page,
    'Game',
    report.cells.find((cell) => cell.index === move![0])!,
    report.cells.find((cell) => cell.index === move![1])!,
  )

  await expect.poll(() => page.evaluate(() => window.dyestopia!.progressState().clearedTutorials), {
    timeout: 15_000,
  }).toContain(3)
})

for (const tutorialIndex of TUTORIALS.keys()) {
  test(`tutorial ${tutorialIndex + 1} introduces its concept in a visual dialog`, async ({ page }) => {
    await open(page)
    await page.evaluate((tutorial) => window.dyestopia!.goTo('Game', { tutorial }), tutorialIndex)
    await waitForScene(page, 'Game')

    const introduction = await page.evaluate(() => {
      const scene = window.dyestopia!.game.scene.getScene('Game')!
      const dialog = scene.children.getByName('tutorial-explanation-dialog') as Phaser.GameObjects.Container | null
      const text = dialog?.getByName('tutorial-introduction') as Phaser.GameObjects.Text | null
      const chain = dialog?.getByName('tutorial-introduction-chain') as Phaser.GameObjects.Container | null
      const screenshot = dialog?.getByName('tutorial-explanation-screenshot') as Phaser.GameObjects.Container | null
      return {
        text: text?.text,
        visible: text?.visible,
        inlineIntroduction: Boolean(scene.children.getByName('tutorial-introduction-inline')),
        dialogVisible: dialog?.visible ?? false,
        screenshotVisible: screenshot?.visible ?? false,
        chainVisible: chain?.visible ?? false,
        chainSegments: chain?.list.filter((child) => child.name === 'chain-segment').length ?? 0,
      }
    })

    expect(introduction.text).toBe(TUTORIAL_INTRODUCTIONS[tutorialIndex])
    expect(introduction.visible).toBe(true)
    expect(introduction.inlineIntroduction).toBe(false)
    expect(introduction.dialogVisible).toBe(true)
    expect(introduction.screenshotVisible).toBe(true)
    expect(introduction.chainVisible).toBe(TUTORIALS[tutorialIndex].showChain)
    expect(introduction.chainSegments).toBe(
      TUTORIALS[tutorialIndex].showChain ? stageMixes(TUTORIALS[tutorialIndex].stage).length : 0,
    )

    const continueButton = await hitTarget(page, 'Game', 'tutorial-explanation-continue')
    await clickWorld(page, 'Game', continueButton.x, continueButton.y)
    expect(await page.evaluate(() => Boolean(
      window.dyestopia!.game.scene.getScene('Game')!.children.getByName('tutorial-explanation-dialog'),
    ))).toBe(false)
  })
}

test('the swap lesson demonstrates the exact move with the real tile animation', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { tutorial: 0 }))
  await waitForScene(page, 'Game')
  await dismissTutorialExplanation(page)

  const report = await board(page)
  const { grid, cells } = toEngine(report)
  const move = moveOfKind(grid, cells, 'swap', rulesFor(TUTORIALS[0].stage))
  expect(move).not.toBeNull()
  const from = report.cells.find((cell) => cell.index === move![0])!
  const to = report.cells.find((cell) => cell.index === move![1])!

  expect(await page.evaluate(() => Boolean(
    window.dyestopia!.game.scene.getScene('Game')!.children.getByName('tutorial-gesture'),
  ))).toBe(false)
  await expect.poll(
    () => page.evaluate(
      ({ fromX, fromY, toX, toY }) => {
        const scene = window.dyestopia!.game.scene.getScene('Game')!
        const tile = scene.children.list
          .filter((child): child is Phaser.GameObjects.Container => child.name === 'tile')
          .find((child) => child.getData('tutorialDemo') === 'from')
        if (!tile) return false
        const travelled = Math.hypot(tile.x - fromX, tile.y - fromY)
        const distance = Math.hypot(toX - fromX, toY - fromY)
        return travelled > distance * 0.35
      },
      { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y },
    ),
    { timeout: 5_000, intervals: [50] },
  ).toBe(true)
})

for (const tutorialIndex of [1, 2, 3, 4, 5]) {
  test(`tutorial ${tutorialIndex + 1} animates its opening move without an arrow`, async ({ page }) => {
    await open(page)
    await page.evaluate((tutorial) => window.dyestopia!.goTo('Game', { tutorial }), tutorialIndex)
    await waitForScene(page, 'Game')
    await dismissTutorialExplanation(page)

    const report = await board(page)
    const { grid, cells } = toEngine(report)
    const move = moveOfKind(grid, cells, 'merge', rulesFor(TUTORIALS[tutorialIndex].stage))
    expect(move).not.toBeNull()
    const from = report.cells.find((cell) => cell.index === move![0])!
    const to = report.cells.find((cell) => cell.index === move![1])!

    expect(await page.evaluate(() => Boolean(
      window.dyestopia!.game.scene.getScene('Game')!.children.getByName('tutorial-gesture'),
    ))).toBe(false)
    await expect.poll(
      () => page.evaluate(
        ({ fromX, fromY, toX, toY }) => {
          const scene = window.dyestopia!.game.scene.getScene('Game')!
          const tile = scene.children.list
            .filter((child): child is Phaser.GameObjects.Container => child.name === 'tile')
            .find((child) => child.getData('tutorialDemo') === 'from')
          if (!tile) return false
          const travelled = Math.hypot(tile.x - fromX, tile.y - fromY)
          const distance = Math.hypot(toX - fromX, toY - fromY)
          return travelled > distance * 0.35
        },
        { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y },
      ),
      { timeout: 5_000, intervals: [50] },
    ).toBe(true)
  })
}

test('performing the real lesson move clears and persists the tutorial', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.resetProgress()
    window.dyestopia!.seedRng(4711)
    window.dyestopia!.goTo('Game', { tutorial: 0 })
  })
  await waitForScene(page, 'Game')
  await dismissTutorialExplanation(page)

  const report = await board(page)
  const { grid, cells } = toEngine(report)
  const move = moveOfKind(grid, cells, 'swap', rulesFor(TUTORIALS[0].stage))
  expect(move).not.toBeNull()
  await dragWorld(
    page,
    'Game',
    report.cells.find((cell) => cell.index === move![0])!,
    report.cells.find((cell) => cell.index === move![1])!,
  )

  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.progressState().clearedTutorials), {
      timeout: 15_000,
    })
    .toEqual([0])
  expect(await page.evaluate(() => window.dyestopia!.texts('Game'))).toContain('Next tutorial')
})

test('tutorial completion content stays within the result panel', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { tutorial: 0 }))
  await waitForScene(page, 'Game')
  await dismissTutorialExplanation(page)

  const report = await board(page)
  const { grid, cells } = toEngine(report)
  const move = moveOfKind(grid, cells, 'swap', rulesFor(TUTORIALS[0].stage))!
  await dragWorld(
    page,
    'Game',
    report.cells.find((cell) => cell.index === move[0])!,
    report.cells.find((cell) => cell.index === move[1])!,
  )
  await expect.poll(() => page.evaluate(() => window.dyestopia!.texts('Game'))).toContain('Next tutorial')

  const layout = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    const panel = scene.children.getByName('round-overlay-panel') as Phaser.GameObjects.Container
    const size = panel.getData('surfaceSize') as { width: number; height: number }
    const panelBounds = {
      left: panel.x - size.width * panel.scaleX / 2,
      right: panel.x + size.width * panel.scaleX / 2,
      top: panel.y - size.height * panel.scaleY / 2,
      bottom: panel.y + size.height * panel.scaleY / 2,
    }
    return {
      panel: { left: panelBounds.left, right: panelBounds.right, top: panelBounds.top, bottom: panelBounds.bottom },
      content: panel.list
        .filter((child) =>
          child.name.startsWith('round-overlay-content')
          || child.name === 'next-tutorial'
          || child.name === 'back-to-stages',
        )
        .map((child) => {
          const bounds = (child as Phaser.GameObjects.Container | Phaser.GameObjects.Text).getBounds()
          return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }
        }),
    }
  })
  expect(layout.content.length).toBeGreaterThan(0)
  for (const bounds of layout.content) {
    expect(bounds.left).toBeGreaterThanOrEqual(layout.panel.left)
    expect(bounds.right).toBeLessThanOrEqual(layout.panel.right)
    expect(bounds.top).toBeGreaterThanOrEqual(layout.panel.top)
    expect(bounds.bottom).toBeLessThanOrEqual(layout.panel.bottom)
  }
})

test('a tutorial always restarts from its prepared opening board', async ({ page }) => {
  await open(page)
  await page.evaluate(() => window.dyestopia!.goTo('Game', { tutorial: 1 }))
  await waitForScene(page, 'Game')
  const first = (await board(page)).cells.map(({ color }) => color)

  await page.evaluate(() => window.dyestopia!.goTo('Game', { tutorial: 1 }))
  await waitForScene(page, 'Game')
  const second = (await board(page)).cells.map(({ color }) => color)

  expect(second).toEqual(first)
})
