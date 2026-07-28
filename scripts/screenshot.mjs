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
 *   SHAPE=mosaic THEME=neon npm run shots
 *   FRAME=12 npm run shots           # park the idle on a chosen frame
 *   DYESTOPIA_URL=https://dyestopia.fschmidts.net npm run shots
 */
import { mkdir } from 'node:fs/promises'

import { chromium } from '@playwright/test'

const url = process.env.DYESTOPIA_URL ?? 'http://localhost:5173'
const outDir = process.env.OUT_DIR ?? '.screenshots'
const dpr = Number(process.env.DPR ?? 2)
const frame = Number(process.env.FRAME ?? 0)
const viewportWidth = Number(process.env.VIEWPORT_WIDTH ?? 1280)
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT ?? 720)
const shape = process.env.SHAPE
const theme = process.env.THEME
const scenes = process.argv.slice(2)
const targets = scenes.length > 0 ? scenes : ['Menu', 'Game']

/** Filenames carry the combination, so shots of different settings don't collide. */
const suffix = [shape, theme].filter(Boolean).join('-')

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: viewportWidth, height: viewportHeight },
  deviceScaleFactor: dpr,
})

try {
  await page.goto(url)
  await page.waitForFunction(() => window.dyestopia?.isActive('Menu') === true)

  // Applied before any scene is entered, since scenes read settings as they build.
  if (shape || theme) {
    await page.evaluate((patch) => window.dyestopia.setSettings(patch), {
      ...(shape ? { shape } : {}),
      ...(theme ? { theme } : {}),
    })
  }

  for (const scene of targets) {
    await page.evaluate((key) => window.dyestopia.goTo(key), scene)
    await page.waitForFunction((key) => window.dyestopia?.isActive(key) === true, scene)

    // Let tweens reach a recognisable pose, then hold them there — and park the
    // idle on a fixed frame, so repeated runs are byte-identical.
    await page.waitForTimeout(400)
    await page.evaluate((f) => window.dyestopia.freeze(f), frame)

    const name = [scene.toLowerCase(), suffix].filter(Boolean).join('-')
    const path = `${outDir}/${name}@${dpr}x.png`
    await page.screenshot({ path })
    console.log(path)
  }
} finally {
  await browser.close()
}
