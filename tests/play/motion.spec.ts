import { expect, test, type Page } from '@playwright/test'

import { board, dragWorld, moveOfKind, open, startGame, startSeededGame, toEngine } from '../helpers'

/**
 * The feel layer: poses and travel, on top of the match loop that
 * match.spec.ts proves. These reach into tile transforms, so they read the
 * scene's display list rather than the debug bridge's board report.
 */

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

/** Every settled tile is round, upright and at rest. */
function allSettled(page: Page): Promise<boolean> {
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
  })
}

test('the dragged splash flows toward the pointer', async ({ page }) => {
  await open(page)
  await startGame(page)

  const report = await board(page)
  // An inner tile, so the pull toward the board centre stays over the board.
  const centre = report.cells[Math.floor(report.cells.length / 2)]
  const [a, b] = await page.evaluate(
    (tile) => [
      window.dyestopia!.worldToViewport('Game', tile.x, tile.y),
      window.dyestopia!.worldToViewport('Game', tile.x + 150, tile.y + 100),
    ],
    centre,
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
  // Release back over its own cell: no move, and the blob unwinds completely.
  await page.mouse.move(a.x, a.y, { steps: 10 })
  await page.mouse.up()

  expect(elongation).toBeGreaterThan(0.05)
  expect(alignment).toBeGreaterThan(0.2)

  const before = report.cells.map((c) => c.color)
  await expect
    .poll(async () => {
      const settled = await allSettled(page)
      const now = await board(page)
      return settled && now.cells.map((c) => c.color).join() === before.join()
    })
    .toBe(true)
})

test('a refused drop returns home and shakes it off', async ({ page }) => {
  await open(page)
  const report = await startSeededGame(page, 4711)

  // Any adjacent pair whose drop resolves to nothing — neither the merge nor
  // the swap would clear, so the rules refuse it.
  const { grid, cells } = toEngine(report)
  const pair = moveOfKind(grid, cells, 'illegal')!
  const from = report.cells.find((c) => c.index === pair[0])!
  const to = report.cells.find((c) => c.index === pair[1])!

  await dragWorld(page, 'Game', from, to)

  // Home again, upright, board untouched.
  await expect
    .poll(async () => {
      const settled = await allSettled(page)
      const now = await board(page)
      return settled && now.score === 0
    })
    .toBe(true)
})

test('the match loop holds up in the mosaic shape too', async ({ page }) => {
  await open(page)
  // The mosaic exercises the paths the blob doesn't: straighten, jitter
  // re-read on the destination cell, the glint jump, straight travel, and the
  // crack-style clear.
  await page.evaluate(() => window.dyestopia!.setSettings({ shape: 'mosaic' }))
  const report = await startSeededGame(page, 4711)
  const { grid, cells } = toEngine(report)

  const move = moveOfKind(grid, cells, 'swap')
  expect(move).not.toBeNull()
  const [a, b] = move!
  await dragWorld(
    page,
    'Game',
    report.cells.find((c) => c.index === a)!,
    report.cells.find((c) => c.index === b)!,
  )

  await expect
    .poll(async () => {
      const now = await board(page)
      return now.score > 0 && now.cells.every((c) => c.color !== null)
    })
    .toBe(true)
})
