/** Capture the M6 five-background × three-scene portrait review matrix. */
import { mkdir } from 'node:fs/promises'

import { chromium } from '@playwright/test'

const backgrounds = [
  'canvas-fluid',
  'fluid-ink',
  'mosaic-grid',
  'industrial-grunge',
  'frosted-glass',
]
const scenes = ['Menu', 'Settings', 'Game']
const out = '.screenshots/m6-matrix'
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
})

try {
  await page.goto('http://127.0.0.1:5173')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => window.dyestopia?.isActive('Menu') === true)

  for (const background of backgrounds) {
    await page.evaluate((id) => window.dyestopia.setSettings({ background: id }), background)
    for (const scene of scenes) {
      await page.evaluate(
        ({ key, data }) => window.dyestopia.goTo(key, data),
        { key: scene, data: scene === 'Game' ? { stage: 0 } : undefined },
      )
      await page.waitForFunction((key) => window.dyestopia?.isActive(key) === true, scene)
      await page.waitForTimeout(250)
      await page.evaluate(() => window.dyestopia.freeze(0))
      await page.screenshot({ path: `${out}/${background}-${scene.toLowerCase()}@2x.png` })
    }
  }
} finally {
  await browser.close()
}

console.log(`Captured ${backgrounds.length * scenes.length} views in ${out}`)
