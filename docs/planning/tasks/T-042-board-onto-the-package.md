---
id: T-042
type: task
title: Move the board onto the extracted package
status: Done
ordinal: 800
labels: [tooling]
---

## Description

**Blocked on nothing. The package exists, is tested, and is installed.**

The board mechanism now lives in `planning-board`, extracted and covered by 33
tests it never had here. This card is the other half: this repo stops carrying a
copy and starts depending on it.

**One card, because the repo does not build in between.** The wiki generator
imports the card model from the module next to it, so deleting that module and
reducing the generator are the same change. Splitting them leaves a commit that
does not compile.

What lands:

- The dependency, plus a `board.config.json` naming this repo's paths, its
  `postWrite`, and the Todo cap.
- Four files deleted:

  ```
  scripts/board.ts
  scripts/board.html
  scripts/tasks.ts
  scripts/wiki-view.ts
  ```

- The wiki generator keeps only what is about *this game* — the colour, stage,
  tutorial, tool, mix, file-map and script tables — and calls the package for the
  board, the record indexes and their two reference checks. One shared exit code.
- `npm run board` and `board:host` point at the package binary. `npm run wiki`
  keeps its name; nothing else in the repo has to learn a new command.

**The blurbs are not the tool's to write.** The paragraphs above the concept and
decision indexes are this repo's prose, and they move into the config verbatim.
Get them wrong and both indexes regenerate with different wording, which buries
the real diff under a page of noise.

**Expect three generated files to change by one line.** `BOARD.md` and the two
`index.md` headers name the command that wrote them, and that command is now
`board generate`. The script table in the architecture page regenerates itself
from `package.json`. Nothing else should move — if it does, read why before
committing.

`applyPins` and `checkPaths` stay here. They are wiki integrity rather than board
integrity, and a repo without a generated wiki has no use for either.

Nothing in the docs cites the four deleted files by path, so the check should
stay green. If it does not, fix the citation — do not keep a file to satisfy a
sentence.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 The wiki generator contains no board rendering and no card schema, and
      gets both from the package
- [x] #2 The four files are gone, and `npm run board` still serves the board
- [x] #3 A drag on the board still regenerates the wiki, via `postWrite`
- [x] #4 `npm run build` passes, and the only generated diff is the line naming
      the generator
- [x] #5 The concept and decision index prose is byte-identical to what it says
      today
<!-- AC:END -->
