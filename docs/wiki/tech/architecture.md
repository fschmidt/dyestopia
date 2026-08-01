# Architecture

Deliberately thin. This page answers *where does X live* and nothing else —
the file map below is generated from `src/`, and each module's one-liner comes
from its own header comment, so both move when the code moves.

For *why* things are built the way they are, see [README.md](../../../README.md)
(tile baking, HiDPI, the debug bridge, deployment). For rules you must not break,
see [conventions.md](conventions.md).

## Stack

Phaser 4 · TypeScript · Vite · Playwright. No framework, no state library, no CSS
framework. A 393×852 logical canvas — an iPhone 15 Pro portrait viewport —
FIT-scaled to whatever screen it lands on. Deployed to GitHub Pages on every push
to `main`.

## Module map

<!-- generated:filemap -->
| Module | Owns |
| --- | --- |
| [`src/backgrounds.ts`](../../../src/backgrounds.ts) | — |
| [`src/board.ts`](../../../src/board.ts) | — |
| [`src/colors.ts`](../../../src/colors.ts) | Colour identity and mixing rules — the game-logic half of a colour. |
| [`src/config.ts`](../../../src/config.ts) | — |
| [`src/debug.ts`](../../../src/debug.ts) | — |
| [`src/flags.ts`](../../../src/flags.ts) | Prototype toggles — switches for mechanics on trial, reachable from the console (`dyestopia.combo(true)`) or the URL (`?combo`, for phones without a console). |
| [`src/main.ts`](../../../src/main.ts) | — |
| [`src/palette.ts`](../../../src/palette.ts) | Chrome colours — the page around the game, and text. |
| [`src/progress.ts`](../../../src/progress.ts) | — |
| [`src/rng.ts`](../../../src/rng.ts) | Seedable randomness for everything gameplay-visible. |
| [`src/scenes/BaseScene.ts`](../../../src/scenes/BaseScene.ts) | — |
| [`src/scenes/BootScene.ts`](../../../src/scenes/BootScene.ts) | — |
| [`src/scenes/GameScene.ts`](../../../src/scenes/GameScene.ts) | — |
| [`src/scenes/MenuScene.ts`](../../../src/scenes/MenuScene.ts) | — |
| [`src/scenes/SettingsScene.ts`](../../../src/scenes/SettingsScene.ts) | — |
| [`src/scenes/StageSelectScene.ts`](../../../src/scenes/StageSelectScene.ts) | — |
| [`src/settings.ts`](../../../src/settings.ts) | — |
| [`src/sfx.ts`](../../../src/sfx.ts) | — |
| [`src/stage-catalog.ts`](../../../src/stage-catalog.ts) | — |
| [`src/stage.ts`](../../../src/stage.ts) | — |
| [`src/stages.ts`](../../../src/stages.ts) | — |
| [`src/text.ts`](../../../src/text.ts) | — |
| [`src/themes.ts`](../../../src/themes.ts) | — |
| [`src/tiles/Tile.ts`](../../../src/tiles/Tile.ts) | — |
| [`src/tiles/bake.ts`](../../../src/tiles/bake.ts) | — |
| [`src/tiles/shapes/blob.ts`](../../../src/tiles/shapes/blob.ts) | — |
| [`src/tiles/shapes/index.ts`](../../../src/tiles/shapes/index.ts) | — |
| [`src/tiles/shapes/mosaic.ts`](../../../src/tiles/shapes/mosaic.ts) | — |
| [`src/tiles/shapes/splash-variants.ts`](../../../src/tiles/shapes/splash-variants.ts) | — |
| [`src/tiles/shapes/splash.ts`](../../../src/tiles/shapes/splash.ts) | — |
| [`src/tiles/shapes/types.ts`](../../../src/tiles/shapes/types.ts) | A tile shape: everything about how a tile looks, minus its colour. |
| [`src/tool-stages.ts`](../../../src/tool-stages.ts) | — |
| [`src/tutorials.ts`](../../../src/tutorials.ts) | — |
| [`src/ui/components.ts`](../../../src/ui/components.ts) | — |
| [`src/ui/visual-system.ts`](../../../src/ui/visual-system.ts) | — |
| [`src/vite-env.d.ts`](../../../src/vite-env.d.ts) | — |
<!-- /generated:filemap -->

## The shape of it

<!-- pin:src/board.ts sha=3456f0fb4948 -->

**The engine** is `src/board.ts`. It is pure: grids, masks, matches, gravity,
refills, cascades, reshuffles and chain bookkeeping, with no Phaser import and no
rendering. `resolveMove` is the entry point and it tries *mix before swap*.
Everything about how the game plays is decided here.

<!-- pin:src/colors.ts sha=8b0cfc592ac7 -->

**Content is data, not code.** `src/colors.ts`, `src/stages.ts`,
`src/tool-stages.ts` and `src/tutorials.ts` are plain exported arrays with no
Phaser dependency — which is what lets `scripts/wiki.ts` import them directly and
generate the game wiki from the real definitions.

<!-- pin:src/stage-catalog.ts sha=5d5c8582d674 -->

**`src/stage-catalog.ts` is the seam** between those three content sections and
the UI. It assigns the globally unique stage ids, computes the `lockedBy` chain
across sections, and is what stage-select and progress actually read.

**Scenes** live in `src/scenes/`, run Boot → Menu → StageSelect → Game/Settings,
and all extend `BaseScene`. `GameScene` is by far the largest module in the
project and owns input, animation, HUD and the tool tray.

**Presentation is orthogonal to gameplay.** Tile shape, colour theme, background
and visual profile are independent settings; none of them touch the engine.

## Commands

<!-- generated:scripts -->
| Script | Runs |
| --- | --- |
| `npm run dev` | `vite` |
| `npm run dev:host` | `vite --host` |
| `npm run build` | `npm run wiki:check && tsc --noEmit && vite build` |
| `npm run preview` | `vite preview` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run wiki` | `tsx scripts/wiki.ts` |
| `npm run wiki:check` | `tsx scripts/wiki.ts --check` |
| `npm run board` | `tsx scripts/board.ts` |
| `npm run board:host` | `tsx scripts/board.ts --host` |
| `npm run test` | `playwright test` |
| `npm run test:headed` | `playwright test --headed` |
| `npm run test:ui` | `playwright test --ui` |
| `npm run shots` | `node scripts/screenshot.mjs` |
| `npm run shots:matrix` | `node scripts/visual-matrix.mjs` |
<!-- /generated:scripts -->

## Testing

Playwright only — there is no unit-test runner. Tests drive the real game through
the `window.dyestopia` debug bridge, which ships in production deliberately.
`tests/helpers.ts` holds the shared harness.
