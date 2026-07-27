import { expect, test, type Page } from '@playwright/test'

import { dragWorld, open, startGame, waitForScene } from './helpers'

interface TileState {
  x: number
  y: number
  dye: string
}

/**
 * Position and dye of every tile on the board, in creation order.
 *
 * The demo stage seeds red/yellow/blue cycling over twelve cells, so in cell
 * order: 0 = red, 1 = yellow, 2 = blue, 3 = red, … Horizontal neighbours are
 * always different colours, which is what these tests lean on.
 */
function board(page: Page): Promise<TileState[]> {
  return page.evaluate(() =>
    window
      .dyestopia!.game.scene.getScene('Game')!
      .children.list.filter((child) => child.name === 'tile')
      .map((child) => {
        const tile = child as unknown as { x: number; y: number; dye: { name: string } }
        return { x: tile.x, y: tile.y, dye: tile.dye.name }
      }),
  )
}

/** The tile settled on a cell centre, if any. */
function at(tiles: TileState[], cell: TileState): TileState | undefined {
  return tiles.find((tile) => Math.hypot(tile.x - cell.x, tile.y - cell.y) < 1)
}

test('mixable neighbours merge in place', async ({ page }) => {
  await open(page)
  await startGame(page)

  const before = await board(page)
  const [red, yellow] = before
  expect(red.dye).toBe('red')
  expect(yellow.dye).toBe('yellow')

  await dragWorld(page, 'Game', red, yellow)

  // Red + yellow = orange, which the stage allows: both tiles keep their
  // cells, both come out dyed the result, and the board stays full.
  await expect
    .poll(async () => {
      const now = await board(page)
      return (
        now.length === 12 && at(now, red)?.dye === 'orange' && at(now, yellow)?.dye === 'orange'
      )
    })
    .toBe(true)
})

test('a mix the stage does not allow swaps instead', async ({ page }) => {
  await open(page)
  await startGame(page)

  const before = await board(page)
  const blue = before[2]
  const red = before[3]
  expect(blue.dye).toBe('blue')
  expect(red.dye).toBe('red')

  await dragWorld(page, 'Game', blue, red)

  // Red + blue would be purple, but the demo stage doesn't activate purple —
  // so the pair swaps cells and keeps its colours.
  await expect
    .poll(async () => {
      const now = await board(page)
      return at(now, red)?.dye === 'blue' && at(now, blue)?.dye === 'red'
    })
    .toBe(true)
})

test('a non-adjacent drop returns home', async ({ page }) => {
  await open(page)
  await startGame(page)

  const before = await board(page)
  const red = before[0]
  const blue = before[2]

  // Cells 0 and 2 share a row but aren't neighbours; red + blue would also be
  // an inactive mix, so nothing may happen either way.
  await dragWorld(page, 'Game', red, blue)

  await expect
    .poll(async () => {
      const now = await board(page)
      return at(now, red)?.dye === 'red' && at(now, blue)?.dye === 'blue'
    })
    .toBe(true)
})

test('creating the named mix scores', async ({ page }) => {
  await open(page)
  await startGame(page)

  const texts = await page.evaluate(() => window.dyestopia!.texts('Game'))
  const target = texts.find((text) => text.startsWith('Mix: '))?.slice(5)
  expect(['orange', 'green']).toContain(target)

  // Orange = red + yellow (cells 0, 1); green = yellow + blue (cells 1, 2).
  const before = await board(page)
  const pair = target === 'orange' ? [before[0], before[1]] : [before[1], before[2]]
  await dragWorld(page, 'Game', pair[0], pair[1])

  await expect
    .poll(() => page.evaluate(() => window.dyestopia!.texts('Game')))
    .toContain('Score: 1')
})

/** Pose of the tile currently being dragged (it sits at the active depth). */
function draggedPose(page: Page): Promise<{ rotation: number; sx: number; sy: number } | null> {
  return page.evaluate(() => {
    const dragged = window
      .dyestopia!.game.scene.getScene('Game')!
      .children.list.find((child) => child.name === 'tile' && (child as { depth?: number }).depth === 10)
    if (!dragged) return null
    const pose = dragged as unknown as { rotation: number; scaleX: number; scaleY: number }
    return { rotation: pose.rotation, sx: pose.scaleX, sy: pose.scaleY }
  })
}

test('the dragged splash flows toward the pointer', async ({ page }) => {
  await open(page)
  await startGame(page)

  const [red] = await board(page)
  const [a, b] = await page.evaluate(
    (tile) => [
      window.dyestopia!.worldToViewport('Game', tile.x, tile.y),
      window.dyestopia!.worldToViewport('Game', tile.x + 150, tile.y + 100),
    ],
    red,
  )

  // Pull diagonally and keep holding: while the tile lags the pointer it must
  // be rotated to the pull direction and elongated along it (scaleX above
  // scaleY — those axes are the container's own, post-rotation).
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  let elongation = 0
  let alignment = 0
  for (const point of [b, a, b]) {
    await page.mouse.move(point.x, point.y, { steps: 10 })
    const pose = await draggedPose(page)
    if (pose) {
      elongation = Math.max(elongation, pose.sx - pose.sy)
      alignment = Math.max(alignment, Math.abs(pose.rotation))
    }
  }
  await page.mouse.up()
  expect(elongation).toBeGreaterThan(0.05)
  expect(alignment).toBeGreaterThan(0.2)

  // Released over its own cell, the blob unwinds completely: round, upright,
  // and the board untouched.
  await expect
    .poll(async () => {
      const now = await board(page)
      return page.evaluate(() => {
        const tiles = window
          .dyestopia!.game.scene.getScene('Game')!
          .children.list.filter((child) => child.name === 'tile')
        return tiles.every((tile) => {
          const pose = tile as unknown as { rotation: number; scaleX: number; scaleY: number }
          return (
            Math.abs(pose.rotation) < 0.01 &&
            Math.abs(pose.scaleX - 1) < 0.01 &&
            Math.abs(pose.scaleY - 1) < 0.01
          )
        })
      }).then((settled) => settled && now.length === 12)
    })
    .toBe(true)
})

test('the moves hold up in the mosaic shape too', async ({ page }) => {
  await open(page)
  // The mosaic exercises the paths the blob doesn't: straighten, jitter
  // re-read on the destination cell, the glint jump, and straight travel.
  await page.evaluate(() => {
    window.dyestopia!.setSettings({ shape: 'mosaic' })
    window.dyestopia!.goTo('Game')
  })
  await waitForScene(page, 'Game')

  const before = await board(page)
  const blue = before[2]
  const red = before[3]

  await dragWorld(page, 'Game', blue, red)

  await expect
    .poll(async () => {
      const now = await board(page)
      return at(now, red)?.dye === 'blue' && at(now, blue)?.dye === 'red'
    })
    .toBe(true)
})
