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
