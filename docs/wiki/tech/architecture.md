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
| [`src/main.ts`](../../../src/main.ts) | — |
| [`src/palette.ts`](../../../src/palette.ts) | Chrome colours — the page around the game, and text. |
| [`src/playout.ts`](../../../src/playout.ts) | Playing a stage with no screen attached. |
| [`src/progress.ts`](../../../src/progress.ts) | — |
| [`src/rng.ts`](../../../src/rng.ts) | Seedable randomness for everything gameplay-visible, as a value. |
| [`src/round.ts`](../../../src/round.ts) | A round as a value. |
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
| [`src/variants.ts`](../../../src/variants.ts) | Rule variants the harness can select. |
| [`src/vite-env.d.ts`](../../../src/vite-env.d.ts) | — |
<!-- /generated:filemap -->

## The shape of it

<!-- pin:src/board.ts sha=67b90af6a856 -->

**The engine** is `src/board.ts`. It is pure: grids, masks, matches, gravity,
refills, cascades, reshuffles and chain bookkeeping, with no Phaser import and no
rendering. Everything about how the game plays is decided here.

**A position is a value.** `Cells` is readonly, and every rule takes a board and
returns the next one rather than editing the one it was handed — `applyGravity`,
`refill`, `generateBoard`, `reshuffle` and `resolveCascade` all hand back a fresh
board, and the ones that draw randomness hand back the stream they left off at
as well. So a caller can keep the position it started from, compare two, store
one, or fork a round to evaluate a move against and then throw the fork away.

It has two entry points. `resolveMove` decides what a move *is*, and it tries
*mix before swap*. `resolveCascade` then plays that move's cascade to a
standstill and returns the settled board with the list of waves — what matched,
what it paid, what fell and what spawned. The board settles before anything is
drawn, and nothing in the loop waits on a tween.

Two more answer questions *about* a board rather than changing one:
`findLegalMove` stops at the first move it finds, which is all dead-board
detection needs after every move, and `legalMoves` does the same walk without
the early return, for a bot choosing between them.

<!-- pin:src/colors.ts sha=8b0cfc592ac7 -->

**Content is data, not code.** `src/colors.ts`, `src/stages.ts`,
`src/tool-stages.ts` and `src/tutorials.ts` are plain exported arrays with no
Phaser dependency — which is what lets `scripts/wiki.ts` import them directly and
generate the game wiki from the real definitions.

<!-- pin:src/stage-catalog.ts sha=5d5c8582d674 -->

**`src/stage-catalog.ts` is the seam** between those three content sections and
the UI. It assigns the globally unique stage ids, computes the `lockedBy` chain
across sections, and is what stage-select and progress actually read.

**The stage frame** is `src/round.ts`, one layer above the engine and equally
free of Phaser. `startRound` deals a stage from a seed; `playMove` plays one
drop — dye or swap, cascade, score, chain, and the move budget — and hands back
the round that follows it beside a recording of what happened; `settleRound`
decides what the settled board means, reviving a dead board or ending the round.
`RoundState` is readonly throughout, its random stream included, so a round is
one value a caller advances rather than an object that changes under them. A whole round can therefore be played with nothing
drawn, which is what the headless harness calls and what `GameScene` animates
rather than decides.

**The harness** is `src/playout.ts`, driven by `npm run playout`
(`scripts/playout.ts`). A policy picks among the legal moves, a playout runs one
seeded round to its end, and many of them fold into a distribution: win rate,
score spread, moves used, and the standing count of non-seed tiles. Every move
goes through `playMove`, so the simulator cannot drift from the game. Its
numbers compare configurations under a fixed policy; they are not predictions of
human difficulty, and the report says so on every run.

**Rule variants** are `src/variants.ts`. Some of the levers worth weighing are
branches rather than values — mix legality is the largest — so no parameter
reaches them and the only way to measure one is to build a second form of the
rule and play both. A `RuleSet` says which form a round uses; it rides on
`RoundState` and reaches the engine through `resolveMove` and `resolveCascade`,
and is read directly by `playMove` where the branch is an order of operations
rather than a rule the engine sees. Nothing a player can reach selects one: `GameScene` asks for no rule set, so the game is the baseline
by construction, and a variant that turns out to be worth shipping stops being a
variant.

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
| `npm run test` | `playwright test` |
| `npm run test:engine` | `playwright test --project=engine` |
| `npm run test:browser` | `playwright test --project=1x --project=2x --project=iphone-15-pro-max` |
| `npm run test:headed` | `playwright test --headed` |
| `npm run test:ui` | `playwright test --ui` |
| `npm run shots` | `node scripts/screenshot.mjs` |
| `npm run shots:matrix` | `node scripts/visual-matrix.mjs` |
| `npm run playout` | `tsx scripts/playout.ts` |
<!-- /generated:scripts -->

## Testing

Playwright only — there is no unit-test runner. Where a spec lives decides what
runs it, so the directory is the whole rule.

`tests/engine/` is pure data in, data out. It calls the engine modules directly,
opens no page, and so needs neither a browser binary nor the production build —
which is what lets it run as its own CI job in about a second.

`tests/play/` plays a round: many drags, each waiting on the animation to
settle. These are the slow ones, and what they check has no device pixel ratio
in it, so they run at 1x only.

Everything else in `tests/` inspects a rendered screen, and runs at both device
pixel ratios — that path is the one most likely to break silently.

The last two drive the real game through the `window.dyestopia` debug bridge,
which ships in production deliberately. `tests/helpers.ts` holds the shared
harness.
