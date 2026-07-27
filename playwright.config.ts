import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  // The DPR handling in config.ts / BaseScene.ts is the part most likely to
  // break silently, so every test runs at both ratios.
  projects: [
    {
      name: '1x',
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
    },
    {
      name: '2x',
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 },
    },
  ],

  // Tests run against the production build, not the dev server — that's what
  // actually deploys. Set DYESTOPIA_URL to point at something already running
  // (a dev server, or the live site) and skip the build.
  webServer: process.env.DYESTOPIA_URL
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
