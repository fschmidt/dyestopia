---
id: T-033
type: task
title: Run the Playwright suite in Actions
status: Deferred
ordinal: 1400
labels: [testing, ci]
---

## Description

Put `npm test` behind the same gate as the build, so a pull request cannot merge
with a broken game — only a broken *compile* is caught today, by the `verify`
job in `.github/workflows/ci.yaml`.

**It is two gates, not one, and only the second has to be earned.** The suite
splits along the seam between the engine and the scene, and the two halves have
nothing in common:

| | What runs | Cost | Flake surface |
| --- | --- | --- | --- |
| **Engine specs** | `tests/board.spec.ts`, and the offline half of `tests/match.spec.ts` — pure data in, data out | 68 tests in under two seconds, measured | none: no page, no Phaser, no timing |
| **Browser specs** | `tests/tutorial.spec.ts`, `tests/visual-system.spec.ts`, `tests/iphone-layout.spec.ts` and the live half of `tests/match.spec.ts` | most of a two-minute run | tweens, polling, layout |

### Gate one — the engine specs, which need nothing earned

The argument below about trustworthiness applies to the browser half only.
Engine specs have nothing to be flaky about, so they can become a required check
immediately: no stability campaign, no browser cache, no trace artefacts.

One detail decides whether this is cheap. `playwright.config.ts` starts a
`webServer` that runs `npm run build` before *any* test, so a naive run pays the
full build even for tests that never open a page. Setting `DYESTOPIA_URL` skips
the web server entirely, and the engine specs never navigate — that is what
makes the measured runtime above real rather than theoretical.

This is also the half that guards the `C-001` spine. `T-036`, `T-037` and
`T-038` change the engine and are measured by engine code; a rule that quietly
stops holding is exactly what `tests/board.spec.ts` would catch and a compile
would not.

### Gate two — the browser specs, which do

The work is not the workflow step. It is making the suite trustworthy enough to
block a merge:

- **Flakes cost more than the check is worth.** A required check that fails at
  random trains you to merge past red, and then neither check means anything.
  The suite has to be shown stable over repeated runs before it becomes
  required, not after. `playwright.config.ts` already retries twice under CI,
  which hides intermittency rather than reporting it — a run that only passes on
  the retry should be visible.
- **Which projects run.** The config carries three, and the mobile one is the
  one that matters for a game that ships to phones. Running all three on every
  pull request may or may not be worth the minutes; that is a call to make with
  a measured runtime in hand.
- **A failure has to be diagnosable from the run alone.** Traces, screenshots
  and the HTML report uploaded as artefacts, or every CI failure becomes a local
  reproduction attempt.
- **Browsers have to be installed and cached**, or the install dominates the
  run.

Only once it is quiet does the browser check join `verify` in the required list
on `main`. Adding it before then is the failure mode this card exists to avoid.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 The engine specs run on every pull request, without a build and
      without a browser
- [ ] #2 The engine check is in the required list on `main`, and the split
      between the two halves is expressed in the config rather than in a
      hand-maintained list of files
- [ ] #3 The browser specs run on every pull request, with browser binaries
      cached so the install is not the bulk of the run
- [ ] #4 Traces and the report are uploaded on failure
- [ ] #5 A pass that needed a retry is reported rather than hidden
- [ ] #6 Stability is demonstrated over repeated runs before the browser check
      is required
- [ ] #7 The browser check is added to the required list on `main`
<!-- AC:END -->
