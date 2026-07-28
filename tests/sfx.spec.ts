import { expect, test, type Page } from '@playwright/test'

import { STAGES } from '../src/stages'
import {
  board,
  clickWorld,
  dragWorld,
  moveOfKind,
  open,
  rulesFor,
  startStage,
  toEngine,
  waitForScene,
} from './helpers'

/**
 * The M5 sound layer, tested without a speaker: `playSfx` records every play
 * in a log *before* touching the audio stack (see src/sfx.ts), and the debug
 * bridge exposes it. So these tests assert intent — the game decided to make
 * this sound at this beat — which holds in headless browsers that will never
 * emit a sample.
 */

const sfxLog = (page: Page): Promise<string[]> =>
  page.evaluate(() => window.dyestopia!.sfxLog())

/** One move of `kind` on the live board, picked by the engine's own rules. */
async function playMove(page: Page, kind: 'swap' | 'illegal'): Promise<void> {
  const report = await board(page)
  const { grid, cells } = toEngine(report)
  const move = moveOfKind(grid, cells, kind, rulesFor(STAGES[report.stage!]))
  expect(move, `a ${kind} move exists`).not.toBeNull()
  await dragWorld(
    page,
    'Game',
    report.cells.find((c) => c.index === move![0])!,
    report.cells.find((c) => c.index === move![1])!,
  )
}

test('a round speaks: pick and match on a clear, illegal on a refusal', async ({ page }) => {
  await open(page)

  await startStage(page, { stage: 0 }, 4711)
  await playMove(page, 'swap')
  // The pick fires on lifting the tile, the plop when the line clears.
  await expect.poll(() => sfxLog(page)).toContain('pick')
  await expect.poll(() => sfxLog(page)).toContain('match')

  // A fresh round of the same deal, whose known illegal pair gets refused.
  await startStage(page, { stage: 0 }, 4711)
  await playMove(page, 'illegal')
  await expect.poll(() => sfxLog(page)).toContain('illegal')
})

test('win and lose each get a phrase', async ({ page }) => {
  await open(page)

  // One 3-clear pays 30 — any clearing swap crosses this line.
  await startStage(page, { stage: 0, override: { threshold: 30 } }, 4711)
  await playMove(page, 'swap')
  await expect.poll(async () => (await board(page)).outcome, { timeout: 15000 }).toBe('won')
  expect(await sfxLog(page)).toContain('win')
  // Crossing the target also chimed, before the fanfare.
  expect(await sfxLog(page)).toContain('threshold')

  await startStage(page, { stage: 0, override: { moves: 1, threshold: 999999 } }, 4711)
  await playMove(page, 'swap')
  await expect.poll(async () => (await board(page)).outcome, { timeout: 15000 }).toBe('lost')
  expect(await sfxLog(page)).toContain('lose')
})

test('mute silences the game and survives a reload', async ({ page }) => {
  await open(page)

  // Flip the toggle the way a player would: on the settings screen.
  await page.evaluate(() => window.dyestopia!.goTo('Settings'))
  await waitForScene(page, 'Settings')
  const off = await page.evaluate(() => {
    const scene = window.dyestopia!.game.scene.getScene('Settings')!
    const target = scene.children.list.find((child) => child.name === 'option-off') as
      | Phaser.GameObjects.Text
      | undefined
    if (!target) throw new Error('No sound-off option')
    return { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  })
  await clickWorld(page, 'Settings', off.x, off.y)
  expect(await page.evaluate(() => window.dyestopia!.settings().sound)).toBe(false)

  // A full played-out clear, and the log never hears a thing.
  await startStage(page, { stage: 0 }, 4711)
  await playMove(page, 'swap')
  await expect.poll(async () => (await board(page)).score).toBeGreaterThan(0)
  expect(await sfxLog(page)).toEqual([])

  // Mute is a setting, not scene state: a reload still knows.
  await page.reload()
  await waitForScene(page, 'Menu')
  expect(await page.evaluate(() => window.dyestopia!.settings().sound)).toBe(false)
})
