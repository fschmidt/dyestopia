# Conventions

Rules that bite if broken. Everything here is an invariant, not a preference —
if you find code violating one of these, it is a bug, not a style choice.

## Rendering

**Every scene extends `BaseScene`.** Phaser 4 ships no HiDPI support, so the
backing store is sized `GAME_WIDTH × DPR` and `BaseScene` zooms the camera to
cancel it out. A scene extending `Phaser.Scene` directly renders at the wrong
scale on every retina device.

**All text goes through `addText`.** Same reason — direct `this.add.text` skips
the density correction and comes out blurry or mis-sized.

**Tiles are baked at boot**, into two sprite sheets: a base sheet that gets
tinted and a gloss sheet that does not. `setTint` multiplies, so glossy
highlights must live on an untinted layer or they go muddy. Colour is a runtime
property, which is why themes cost no extra memory.

## Content

**The content modules must stay Phaser-free.** `src/colors.ts`, `src/stages.ts`,
`src/tool-stages.ts`, `src/tutorials.ts` and `src/stage-catalog.ts` are imported
directly by `scripts/wiki.ts` under Node. A Phaser import in any of them breaks
the wiki generator, and with it `npm run build`.

**Colours are ideas, not pixel values.** A colour id says *what* a tile is; the
theme says what it looks like. Never hardcode a hex value against a colour id
outside `src/themes.ts` / `src/palette.ts`.

**Refills only ever drop `seed` colours.** Any secondary or tertiary on a board
beyond its authored opening letters is player-made. Changing this changes the
whole game, not just a stage.

## Code

**Imports are extensionless** (`from './stage'`, not `'./stage.ts'`). This is why
the wiki generator runs under `tsx` rather than Node's native type stripping.

**No enums, no namespaces.** The source stays fully erasable.

## Docs

**Generated blocks are not editable.** Anything between
`<!-- generated:name -->` and `<!-- /generated:name -->` is overwritten by
`npm run wiki`. Change the source data or the generator, never the block.

**Task files follow one checked protocol.** Cards live in
`docs/planning/tasks/`; their ids, filenames, types, statuses and ordinals are
validated by `npm run wiki:check`, along with the 15-task Todo limit and links
between cards, concepts and decisions.

**The wiki never speculates.** It describes what is true *now* — that is why it
is pinned to source hashes and why its paths are checked. A proposal belongs in
[docs/concepts/](../../concepts/index.md), a settled choice in
[docs/decisions/](../../decisions/index.md), and neither is documentation. When a
concept lands, what the game *does* moves here; the concept stays as the record
of why. See `D-001`.

**An accepted decision is immutable.** Supersede it with a later one rather than
editing it. The point of an ADR is what was believed at the time.

**Do not write file-by-file descriptions by hand.** The module map generates
itself from header comments — if a module's one-liner is wrong, fix the comment
at the top of that module.

**Paths in prose are checked.** Any backticked or linked `src/…`, `tests/…`,
`scripts/…`, `docs/…` or `public/…` path must exist on disk, or `npm run
wiki:check` fails. This is the check that catches an invented filename.
