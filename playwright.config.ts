import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

// The suite splits along the seam between the engine and the scene, and the two
// halves have nothing in common. Engine specs are pure data in, data out — no
// page, no Phaser, no timing — so they live in `tests/engine` and the directory
// is the whole rule. Everything above it drives the real game in a browser.
const ENGINE_DIR = './tests/engine'
const ENGINE_SPECS = /[\\/]tests[\\/]engine[\\/]/

// A second seam, and again the directory is the whole rule. `tests/play/` holds
// the specs that play a round: many drags, each waiting on the animation to
// settle. They are the slow ones, and their subject — what the round does — has
// no device pixel ratio in it, so running them at 2x re-proves 1x at four times
// the pixels. On a runner with no GPU that is twelve minutes and sixteen
// timeouts; measured, in T-033.
const PLAY_SPECS = /[\\/]tests[\\/]play[\\/]/

// A run restricted to the engine project must not pay for the production build
// the browser projects need, so the web server has to know what was selected.
const selectedProjects = process.argv.flatMap((arg, index) =>
  arg === '--project' ? [process.argv[index + 1] ?? ''] :
  arg.startsWith('--project=') ? [arg.slice('--project='.length)] :
  [],
)
const engineOnly = selectedProjects.length > 0 && selectedProjects.every((name) => name === 'engine')

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Under CI the HTML report and the traces beside it are the whole diagnosis —
  // without them every red run becomes a local reproduction attempt. The flaky
  // reporter is there because `retries` above would otherwise hide a pass that
  // needed two goes behind a green tick.
  // `list` is in there for the worker count and the per-test timings it prints:
  // on a two-core runner with no GPU those numbers are the whole diagnosis.
  reporter: process.env.CI
    ? [['github'], ['list'], ['./scripts/flaky-reporter.ts'], ['html', { open: 'never' }]]
    : 'list',

  use: {
    baseURL: process.env.DYESTOPIA_URL ?? BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    // Nothing here opens a page, so this project names no device and needs no
    // browser binary installed.
    {
      name: 'engine',
      testDir: ENGINE_DIR,
    },

    // Everything the browser can check, at the ratio most desktops report.
    {
      name: '1x',
      testIgnore: [ENGINE_SPECS, /iphone-layout\.spec\.ts/],
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
    },

    // The DPR handling in config.ts / BaseScene.ts is the part most likely to
    // break silently, so the specs that inspect a rendered screen run at both
    // ratios. The ones that play a round do not — see PLAY_SPECS above.
    {
      name: '2x',
      testIgnore: [ENGINE_SPECS, PLAY_SPECS, /iphone-layout\.spec\.ts/],
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 },
    },
    {
      name: 'iphone-15-pro-max',
      testMatch: /iphone-layout\.spec\.ts/,
      use: {
        ...devices['iPhone 15 Pro Max'],
        browserName: 'chromium',
        viewport: { width: 430, height: 730 },
      },
    },
  ],

  // Browser tests run against the production build, not the dev server — that's
  // what actually deploys. Set DYESTOPIA_URL to point at something already
  // running (a dev server, or the live site) and skip the build.
  webServer:
    engineOnly || process.env.DYESTOPIA_URL
      ? undefined
      : {
          command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
})
