# 🎨 Dyestopia

A colour game built with [Phaser 4](https://phaser.io) and Vite.

**Live:** https://dyestopia.fschmidts.net

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | What |
|--------|------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only |

## Project structure

```
index.html            # mount point (#game) + entry script
public/
  CNAME               # custom domain for GitHub Pages — do not delete
  favicon.svg
src/
  main.ts             # new Phaser.Game(gameConfig)
  config.ts           # GameConfig: resolution, scaling, scene order
  palette.ts          # colour vocabulary (PALETTE + DYES) — single source of truth
  style.css           # page chrome around the canvas
  text.ts             # addText() — HiDPI-correct replacement for scene.add.text
  scenes/
    BaseScene.ts      # camera setup every scene must inherit
    BootScene.ts      # preload + loading bar → Menu
    MenuScene.ts      # title, swatch animation, start
    GameScene.ts      # placeholder round (find the target colour)
```

### Resolution and HiDPI

Scenes work in `960 × 720` (`GAME_WIDTH`/`GAME_HEIGHT` in
[`src/config.ts`](src/config.ts)) and may use fixed coordinates.
`Phaser.Scale.FIT` scales the canvas to any screen size (with letterboxing) and
`CENTER_BOTH` centres it.

Phaser ships **no** HiDPI support: `ScaleConfig` has no `resolution` field
(removed in 3.16, never restored in v4) and the runtime reads
`devicePixelRatio` only into an unused info field. The canvas would therefore be
exactly 960 × 720 physical pixels and get upscaled 2× on a Retina display.

So the backing store is `GAME_WIDTH * DPR`, and
[`BaseScene`](src/scenes/BaseScene.ts) zooms the camera by the same factor and
centres it on the logical midpoint. The two cancel out in world space — scenes
still see 960 × 720, but rendering happens at native resolution.

**Every scene must extend `BaseScene`**, otherwise it loses the camera zoom and
draws into a quarter of the canvas. Override `init()` only with a
`super.init()` call.

Text goes through [`addText`](src/text.ts) rather than `scene.add.text`:
`Text.setResolution()` has an effect only when the camera is zoomed, which
`BaseScene` guarantees.

`DPR` is read once at startup, so dragging the window between a Retina and a
non-Retina monitor won't re-tune the canvas until reload.

### Colours

Every colour comes from [`src/palette.ts`](src/palette.ts). Phaser wants numbers
(`0xrrggbb`), CSS and text styles want strings — that's what `toCss()` is for.

## Deployment

Push to `main` → GitHub Actions
([`.github/workflows/deploy.yaml`](.github/workflows/deploy.yaml)) builds and
deploys to GitHub Pages.

The custom domain depends on two things:

1. **`public/CNAME`** containing `dyestopia.fschmidts.net` — it is copied into
   `dist/` at build time. The domain is also set on the Pages config itself
   (`gh api repos/fschmidt/dyestopia/pages`), which is what actually takes
   effect for `build_type: workflow` deployments.
2. **Cloudflare DNS**: `CNAME dyestopia → fschmidt.github.io`, currently
   **proxied** (orange cloud).

Because the record is proxied, TLS is terminated at Cloudflare's edge with their
Universal SSL certificate — GitHub never issues one for this domain and
`https_enforced` stays `false` on the Pages config. That is expected, not a
misconfiguration. Two consequences:

- The Cloudflare SSL/TLS mode must be **Full**, not **Full (strict)**. GitHub
  presents a certificate that doesn't match `dyestopia.fschmidts.net`, which
  strict mode would reject with a 526.
- Enforce HTTPS at Cloudflare (*SSL/TLS → Edge Certificates → Always Use
  HTTPS*), since GitHub can't do it here.

Cloudflare caches responses for 600 s. Asset filenames are content-hashed so
that's safe for them, but `index.html` gets the same TTL — after a deploy expect
up to 10 minutes, or purge the cache, before changes are visible.

Unlike `uhrzeit-app` (served from `fschmidt.github.io/uhrzeit-app/`, hence
`base: '/uhrzeit-app/'`), Dyestopia sits at the root of its own domain — hence
`base: '/'`.

### npm registry

[`.npmrc`](.npmrc) pins the public registry. Without it the global `~/.npmrc`
points npm at an internal Nexus mirror, whose URLs end up in
`package-lock.json` and make `npm ci` fail with E401 on the runner.
