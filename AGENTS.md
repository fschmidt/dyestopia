# Dyestopia

A mobile-web match-3 where tiles are pigments: mix colours to build a
multiplier, then cash it in with a swap. Phaser 4 · TypeScript · Vite ·
Playwright. Deployed to GitHub Pages on push to `main`.

## Commands

- `npm run dev` — dev server. `npm run dev:host` to reach it from a phone.
- `npm run build` — runs `wiki:check`, then `tsc --noEmit`, then the Vite build.
- `npm run typecheck` — types only.
- `npm test` — Playwright. There is no unit-test runner.
- `npm run wiki` — regenerate the wiki. `npm run wiki:check` to verify it.
- `npm run board` — drag-and-drop board on :5174. Click a card to read it in a
  side panel; the side menu holds a read-only wiki viewer. `board:host` to reach
  it from a phone.

## Invariants

These are not style preferences. Breaking one is a bug.

- **Every scene extends `BaseScene`, and all text goes through `addText`.**
  Phaser 4 has no HiDPI support; `BaseScene` cancels the density scaling by hand.
  Bypassing it renders at the wrong size on every retina device.
- **The content modules must stay Phaser-free** — `src/colors.ts`,
  `src/stages.ts`, `src/tool-stages.ts`, `src/tutorials.ts`,
  `src/stage-catalog.ts`. `scripts/wiki.ts` imports them under Node. A Phaser
  import in any of them breaks `npm run build`.
- **Colours are ideas, not pixel values.** Never hardcode a hex against a colour
  id outside `src/themes.ts` / `src/palette.ts`.
- **Refills only ever drop `seed` colours.** Every deeper colour on a board is
  either authored into the opening deal or player-made.
- **Imports are extensionless**; no enums, no namespaces.

## Editing the wiki

Full rules in `docs/wiki/tech/conventions.md` — read it before changing docs.

- **Never edit between `<!-- generated:name -->` and `<!-- /generated:name -->`.**
  Those blocks come from source data via `scripts/wiki.ts`. Change the data or
  the generator.
- **Never edit `docs/planning/BOARD.md`.** It is generated in full.
- **A `<!-- pin:path sha=… -->` marker** means the prose below it describes that
  file. If the check reports the pin is stale, re-read the section against the
  file, correct it if it is now wrong, then run `npm run wiki` to re-pin.
- **Paths in prose are checked for existence.** Do not write a `src/…` path you
  have not confirmed.
- Run `npm run wiki` after changing game data, adding a module, or touching a
  task, and commit the result.

## Concepts and decisions

Prose that is not a description of the code has two homes, neither of them the
wiki and neither of them a lane. Full reasoning in `D-001`.

- **`docs/concepts/`** (`C-0xx`) — a design worked out before it is built. Living
  until the code lands, then marked Implemented. The wiki takes over describing
  what the game does; the concept remains the record of why.
- **`docs/decisions/`** (`D-0xx`) — one choice each, ADR-style. **Immutable once
  accepted**: supersede, never edit.
- The order is research card → concept → decisions and implementation cards →
  wiki. Small designs stay in the card that implements them; this is for the
  ones that do not fit.
- Both are validated like cards — id shape, filename agreement, real status — and
  their indexes are generated. A `C-` or `D-` id cited anywhere must resolve, and
  a record's `tasks:` must name cards that exist.
- Nothing here is ever deleted. A rejected record stops the idea coming back.

## Editing the board

Cards live in `docs/planning/tasks/`, one file each. `docs/planning/BOARD.md` is
a generated view of them.

- **Move a card by editing its `status` field**, or by dragging it in
  `npm run board`. Never by editing `BOARD.md`.
- `status` is one of `Todo`, `In Progress`, `In Review`, `Done`, `Deferred`.
- `ordinal` sets priority within a lane — lower first, spaced by 100 so a card
  can be inserted between two others without renumbering. A drag respaces the
  whole lane back to 100, 200, 300…, so one drop rewrites every card below it.
- **Only the four pipeline lanes are draggable.** Deferred and Ideas are holding
  areas: `npm run board` lists them in its side menu but will not move a card in
  or out of either, because both directions are a rewrite rather than a field
  change. Do those by editing the card.
- **Todo holds at most 15 cards.** If it is full, something must be deferred
  before anything new is queued. The check enforces this.
- Ideas are `type: idea` with an `I-` id and no lane. Promoting an idea means
  rewriting it as a task: `T-` id, `type: task`, a real `status`.
- The id prefix and the type must agree, and the filename must start with the id.

## Conventions

- Two-space indent, single quotes, no semicolons — match the file you are in.
- British spelling in docs and prose; the code uses `color` for identifiers
  because that is what the source already does.
