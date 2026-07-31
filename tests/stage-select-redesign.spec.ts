import { expect, test } from '@playwright/test'

import { stageSection } from '../src/stage-catalog'
import { clickWorld, hitTarget, open, waitForScene } from './helpers'

test('play opens the stages hub and core stages launch through the detail CTA', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    window.dyestopia!.resetProgress()
    window.dyestopia!.setSettings({ unlockAllStages: false })
  })

  const play = await hitTarget(page, 'Menu', 'button-play')
  await clickWorld(page, 'Menu', play.x, play.y)
  await waitForScene(page, 'StageSelect')

  const hubTexts = await page.evaluate(() => window.dyestopia!.texts('StageSelect'))
  expect(hubTexts).toContain('STAGES')
  expect(hubTexts).toContain('TOOLS')
  expect(hubTexts).not.toContain('LOCKED')
  expect(await page.evaluate(() =>
    Boolean(window.dyestopia!.game.scene.getScene('StageSelect')!.children.getByName('section-lock-tools')),
  )).toBe(true)
  expect(await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').some(({ name }) => name === 'mode-tools'),
  )).toBe(false)
  const core = await hitTarget(page, 'StageSelect', 'mode-core')
  await clickWorld(page, 'StageSelect', core.x, core.y)

  await expect.poll(() => page.evaluate(() => window.dyestopia!.texts('StageSelect')))
    .toContain('CORE')
  const coreTexts = await page.evaluate(() => window.dyestopia!.texts('StageSelect'))
  expect(coreTexts).toContain('FIRST SPLASH')
  expect(coreTexts).not.toContain('TOOLS')

  const stage = await hitTarget(page, 'StageSelect', 'stage-0')
  await clickWorld(page, 'StageSelect', stage.x, stage.y)
  expect(await page.evaluate(() => window.dyestopia!.isActive('Game'))).toBe(false)

  const cta = await hitTarget(page, 'StageSelect', 'stage-cta')
  await clickWorld(page, 'StageSelect', cta.x, cta.y)
  await waitForScene(page, 'Game')
})

test('tutorial mode has its own progress and stage grid', async ({ page }) => {
  await open(page)
  const play = await hitTarget(page, 'Menu', 'button-play')
  await clickWorld(page, 'Menu', play.x, play.y)
  await waitForScene(page, 'StageSelect')

  const tutorial = await hitTarget(page, 'StageSelect', 'mode-tutorial')
  await clickWorld(page, 'StageSelect', tutorial.x, tutorial.y)

  await expect.poll(() => page.evaluate(() => window.dyestopia!.texts('StageSelect')))
    .toContain('TUTORIAL')
  expect(await page.evaluate(() => window.dyestopia!.texts('StageSelect'))).toContain('MAKE A MATCH')
  expect(await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').map(({ name }) => name),
  )).toContain('tutorial-0')
})

test('completing a required section unlocks its dependent section', async ({ page }) => {
  const clearedStageIds = stageSection('core').stages.map(({ id }) => id)
  await page.addInitScript((ids) => {
    localStorage.setItem('dyestopia:progress', JSON.stringify({ clearedStageIds: ids }))
  }, clearedStageIds)
  await open(page)

  const play = await hitTarget(page, 'Menu', 'button-play')
  await clickWorld(page, 'Menu', play.x, play.y)
  await waitForScene(page, 'StageSelect')

  expect(await page.evaluate(() =>
    window.dyestopia!.hitTargets('StageSelect').some(({ name }) => name === 'mode-tools'),
  )).toBe(true)
})
