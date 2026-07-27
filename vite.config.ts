import { defineConfig } from 'vite'

export default defineConfig({
  // Custom domain (dyestopia.fschmidts.net) serves from the root, so no
  // repo-name base path is needed — unlike uhrzeit-app on github.io.
  base: '/',
  build: {
    // Phaser is one big chunk; don't warn about it on every build.
    chunkSizeWarningLimit: 1500,
  },
})
