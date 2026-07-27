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
| `npm run dev:host` | Same, reachable from other devices on the LAN |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only |
| `npm test` | Playwright suite at 1x and 2x |
| `npm run test:headed` | Same, in a visible browser |
| `npm run test:ui` | Playwright's interactive runner |
| `npm run shots` | Screenshot scenes to `.screenshots/` |

## Project structure

```
index.html            # mount point (#game) + entry script
public/
  CNAME               # custom domain for GitHub Pages — do not delete
  favicon.svg
src/
  main.ts             # new Phaser.Game(gameConfig)
  config.ts           # GameConfig: resolution, scaling, scene order
  debug.ts            # window.dyestopia — test/console handle on the game
  palette.ts          # colour vocabulary (PALETTE + DYES) — single source of truth
  style.css           # page chrome around the canvas
  text.ts             # addText() — HiDPI-correct replacement for scene.add.text
  scenes/
    BaseScene.ts      # camera setup every scene must inherit
    BootScene.ts      # preload + loading bar → Menu
    MenuScene.ts      # title, swatch animation, start
    GameScene.ts      # placeholder round (find the target colour)
  tiles/
    bake.ts           # tile artwork → sprite sheets, at boot
    Tile.ts           # one playable tile
tests/                # Playwright specs
scripts/screenshot.mjs
```

### Tiles

Tile artwork is baked to sprite sheets at boot ([`src/tiles/bake.ts`](src/tiles/bake.ts))
rather than drawn live. Soft drop shadows, radial gloss and an organically
deforming outline are all native to the 2D canvas API and all absent from
Phaser's `Graphics`; baking each frame once turns them into a plain textured
quad, so runtime cost is a texture lookup however elaborate the artwork gets.
The whole bake is single-digit milliseconds.

Two sheets, not one, because **`setTint` multiplies**. Only darkening may be
baked into the tinted layer — a white highlight there would come back as the
tint colour. So the base sheet carries silhouette and shading, and the gloss
rides on a second, untinted sprite on top. The two must stay on the same frame
or the highlight drifts off the silhouette, so only the base plays the
animation and the gloss follows its `ANIMATION_UPDATE`.

The pay-off is that **colour is a runtime property**: one pair of white sheets
serves the whole palette, and memory stays flat as dyes are added. Baking per
colour instead would multiply the atlas by `DYES.length` and grow every time a
dye is added.

Work is split by what each technique is good at:

| | |
|---|---|
| Transform — hover lift, press squish, later merge/swap | **tweens** — interruptible, resolution-independent, free |
| Outline deformation, gloss travel | **baked frames** — no transform can express them |
| Colour | **tint** — one sheet, every dye |

Two things that will bite if changed carelessly:

- **Frames need padding.** Without the margin around the blob, its shadow
  bleeds into the neighbouring atlas cell and every tile renders with a sliver
  of its neighbour's shadow down one edge.
- **`bake.ts` must not read `DPR` at module scope.** `config.ts` imports the
  scenes, which reach back into `bake.ts`, so at import time `DPR` is still in
  its temporal dead zone. `BaseScene` gets away with importing it only because
  it reads it inside `init()`.

The idle runs at 12 fps, which sounds low but isn't: judder comes from the
per-frame delta, not the rate, and a breath this slow moves the outline well
under a pixel per frame. Each tile starts on a different frame, or the board
pulses in unison and reads as a flashing screen rather than living tiles.

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

## Testing

Everything the game draws lives inside a canvas, so there is no DOM to query —
no element for a swatch, no text node for the score. [`src/debug.ts`](src/debug.ts)
bridges that gap by putting the running game on `window.dyestopia`, with the
conversions a driver (or you, in the console) needs:

| | |
|---|---|
| `activeScenes()` / `isActive(key)` | which scenes are running |
| `texts(key)` | every Text object's content |
| `hitTargets(key)` | world positions of interactive objects |
| `worldToViewport(key, x, y)` | scene coordinates → viewport coordinates |
| `goTo(key)` | jump straight to a scene |
| `freeze(frame?)` | pause tweens, park every animated sprite on `frame` |

`worldToViewport` is the important one: it lets a test send a **real** mouse
event at a swatch, so the click travels through the camera transform and
Phaser's hit-testing the way a player's would, rather than being faked by
calling a handler directly. That's what makes the tests able to catch a broken
camera setup.

This ships in production deliberately — public game, no secrets, and a console
handle on the live site is worth more than hiding it.

### Automated

```bash
npm test
```

Builds, serves `dist/`, and runs [`tests/`](tests/) against it in Chromium at
`deviceScaleFactor` 1 and 2 — the DPR path above is the part most likely to
break silently, so it's covered at both. Point at something already running to
skip the build:

```bash
DYESTOPIA_URL=http://localhost:5173 npx playwright test
```

### Visual

Nothing in a canvas is inspectable as text, so anything visual gets reviewed by
looking at it:

```bash
npm run dev                      # in one terminal
npm run shots                    # Menu + Game at 2x → .screenshots/
npm run shots -- Boot Menu Game  # pick scenes
DPR=1 npm run shots              # non-retina
DYESTOPIA_URL=https://dyestopia.fschmidts.net npm run shots
```

Screenshots are the only way to catch layout bugs — the double-centring in
`autoCenter` (see [`src/config.ts`](src/config.ts)) passed every assertion while
putting the whole game 80 px off centre.

`freeze(frame)` parks every animated sprite on a chosen frame, so a scene
screenshotted twice is byte-identical and golden images are possible. Tweens
still can't be rewound, only paused — so take the shot before anything has been
clicked, or a half-finished squish will be baked into the baseline.

### Manual

`npm run dev` and open http://localhost:5173. `npm run dev:host` prints a LAN
address for testing touch input on a phone. In the console, `dyestopia.goTo('Game')`
skips the menu and `dyestopia.game` is the live game object.

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
