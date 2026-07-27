/**
 * Screenshot scenes from a running server.
 *
 * Nothing the game draws is inspectable as text, so this is how anything
 * visual gets reviewed — by a person, or by an agent that can read images.
 *
 *   npm run dev                      # in one terminal
 *   npm run shots                    # Menu + Game at 2x
 *   npm run shots -- Boot Menu Game  # pick scenes
 *   DPR=1 npm run shots              # non-retina
 *   DYESTOPIA_URL=https://dyestopia.fschmidts.net npm run shots
 */
import { mkdir } from 'node:fs/promises'

import { chromium } from '@playwright/test'

const url = process.env.DYESTOPIA_URL ?? 'http://localhost:5173'
const outDir = process.env.OUT_DIR ?? '.screenshots'
const dpr = Number(process.env.DPR ?? 2)
const scenes = process.argv.slice(2)
const targets = scenes.length > 0 ? scenes : ['Menu', 'Game']

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: dpr,
})

try {
  await page.goto(url)
  await page.waitForFunction(() => window.dyestopia?.isActive('Menu') === true)

  for (const scene of targets) {
    await page.evaluate((key) => window.dyestopia.goTo(key), scene)
    await page.waitForFunction((key) => window.dyestopia?.isActive(key) === true, scene)

    // Let tweens reach a recognisable pose, then hold them there so repeated
    // runs are comparable.
    await page.waitForTimeout(400)
    await page.evaluate(() => window.dyestopia.freeze())

    const path = `${outDir}/${scene.toLowerCase()}@${dpr}x.png`
    await page.screenshot({ path })
    console.log(path)
  }
} finally {
  await browser.close()
}
