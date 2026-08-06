import { expect, test } from '@playwright/test'

import { isAdjacent, resolveMove } from '../src/board'
import { TOOL_STAGES } from '../src/tool-stages'
import {
  board,
  clickWorld,
  dragWorld,
  hitTarget,
  open,
  rulesFor,
  settle,
  startStage,
  toEngine,
  waitForScene,
} from './helpers'

test('Tools drills down from the stages hub to its own scalable stage grid', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ unlockAllStages: true })
    window.dyestopia!.goTo('StageSelect', { page: 'modes' })
  })
  await waitForScene(page, 'StageSelect')

  const texts = await page.evaluate(() => window.dyestopia!.texts('StageSelect'))
  expect(texts).toContain('STAGES')
  expect(texts).toContain('TOOLS')
  const tools = await hitTarget(page, 'StageSelect', 'mode-tools')
  await clickWorld(page, 'StageSelect', tools.x, tools.y)

  await expect.poll(() => page.evaluate(() => window.dyestopia!.texts('StageSelect')))
    .toContain('TOOLS')
  const first = await hitTarget(page, 'StageSelect', 'tool-stage-0')
  await clickWorld(page, 'StageSelect', first.x, first.y)
  expect(await page.evaluate(() => window.dyestopia!.isActive('Game'))).toBe(false)

  const cta = await hitTarget(page, 'StageSelect', 'stage-cta')
  await clickWorld(page, 'StageSelect', cta.x, cta.y)
  await waitForScene(page, 'Game')

  const report = await board(page)
  expect(report.stage).toBeNull()
  expect(report.toolStage).toBe(0)
  expect(report.tools).toEqual({ freeMove: TOOL_STAGES[0].tools!.freeMove })
})

test('free move tray uses the supplied SVG artwork with a live usage badge', async ({ page }) => {
  await open(page)
  await startStage(page, { toolStage: 0 }, 4711)

  const presentation = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    const tray = scene.children.getByName('tool-tray') as Phaser.GameObjects.Container
    const button = tray.getByName('tool-freeMove') as Phaser.GameObjects.Container
    const art = button.getByName('tool-art') as Phaser.GameObjects.Image | null
    const count = button.getByName('tool-count') as Phaser.GameObjects.Text | null
    return {
      artType: art?.type,
      texture: art?.texture.key,
      count: count?.text,
    }
  })

  expect(presentation).toEqual({
    artType: 'Image',
    texture: 'tool-freeMove',
    count: `${TOOL_STAGES[0].tools!.freeMove}`,
  })
  const asset = await page.request.get('/tools/free-move-paper-cream.svg')
  expect(asset.ok()).toBe(true)
  expect(asset.headers()['content-type']).toContain('image/svg+xml')
})

test('free move toggles and an illegal attempt consumes nothing', async ({ page }) => {
  await open(page)
  const initial = await startStage(page, { toolStage: 0 }, 4711)
  const count = initial.tools.freeMove
  const button = await hitTarget(page, 'Game', 'tool-freeMove')

  await clickWorld(page, 'Game', button.x, button.y)
  expect((await board(page)).activeTool).toBe('freeMove')

  const { grid, cells } = toEngine(initial)
  let refused: [number, number] | null = null
  for (let from = 0; from < cells.length && !refused; from++) {
    for (let to = 0; to < cells.length && !refused; to++) {
      if (from === to || !cells[from] || !cells[to]) continue
      if (resolveMove(grid, cells, rulesFor(TOOL_STAGES[0]), from, to, { allowDistant: true }).kind === 'illegal') {
        refused = [from, to]
      }
    }
  }
  expect(refused).not.toBeNull()
  await dragWorld(
    page,
    'Game',
    initial.cells.find(({ index }) => index === refused![0])!,
    initial.cells.find(({ index }) => index === refused![1])!,
  )
  const refusedState = await settle(page)
  expect(refusedState.tools.freeMove).toBe(count)
  expect(refusedState.activeTool).toBe('freeMove')

  await clickWorld(page, 'Game', button.x, button.y)
  expect((await board(page)).activeTool).toBeNull()
  expect((await board(page)).tools.freeMove).toBe(count)
})

test('free move performs one distant legal interaction and is consumed once', async ({ page }) => {
  await open(page)
  const initial = await startStage(page, { toolStage: 0 }, 4711)
  const { grid, cells } = toEngine(initial)
  let distant: [number, number] | null = null
  for (let from = 0; from < cells.length && !distant; from++) {
    for (let to = 0; to < cells.length && !distant; to++) {
      if (!cells[from] || !cells[to] || isAdjacent(grid, from, to)) continue
      if (resolveMove(grid, cells, rulesFor(TOOL_STAGES[0]), from, to, { allowDistant: true }).kind !== 'illegal') {
        distant = [from, to]
      }
    }
  }
  expect(distant).not.toBeNull()

  const button = await hitTarget(page, 'Game', 'tool-freeMove')
  await clickWorld(page, 'Game', button.x, button.y)
  await dragWorld(
    page,
    'Game',
    initial.cells.find(({ index }) => index === distant![0])!,
    initial.cells.find(({ index }) => index === distant![1])!,
  )

  await expect.poll(async () => (await board(page)).moves).toBe(initial.moves - 1)
  const settled = await board(page)
  expect(settled.tools.freeMove).toBe(initial.tools.freeMove - 1)
  expect(settled.activeTool).toBeNull()
})

test('an activated free move is consumed by an adjacent legal interaction', async ({ page }) => {
  await open(page)
  const initial = await startStage(page, { toolStage: 0 }, 4711)
  const { grid, cells } = toEngine(initial)
  let adjacent: [number, number] | null = null
  for (let from = 0; from < cells.length && !adjacent; from++) {
    for (let to = 0; to < cells.length && !adjacent; to++) {
      if (!cells[from] || !cells[to] || !isAdjacent(grid, from, to)) continue
      if (resolveMove(grid, cells, rulesFor(TOOL_STAGES[0]), from, to).kind !== 'illegal') {
        adjacent = [from, to]
      }
    }
  }
  expect(adjacent).not.toBeNull()

  const button = await hitTarget(page, 'Game', 'tool-freeMove')
  await clickWorld(page, 'Game', button.x, button.y)
  await dragWorld(
    page,
    'Game',
    initial.cells.find(({ index }) => index === adjacent![0])!,
    initial.cells.find(({ index }) => index === adjacent![1])!,
  )

  await expect.poll(async () => (await board(page)).tools.freeMove).toBe(initial.tools.freeMove - 1)
})

test('pause preserves activation and restarting restores the stage inventory', async ({ page }) => {
  await open(page)
  const initial = await startStage(page, { toolStage: 0 }, 4711)
  const button = await hitTarget(page, 'Game', 'tool-freeMove')
  await clickWorld(page, 'Game', button.x, button.y)

  await page.keyboard.press('Escape')
  await expect.poll(() => page.evaluate(() => window.dyestopia!.texts('Game'))).toContain('PAUSED')
  expect((await board(page)).activeTool).toBe('freeMove')
  await page.keyboard.press('Escape')
  expect((await board(page)).activeTool).toBe('freeMove')

  await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Game')!
    scene.scene.restart({ toolStage: 0 })
  })
  await expect.poll(async () => (await board(page)).activeTool).toBeNull()
  expect((await board(page)).tools).toEqual(initial.tools)
})
