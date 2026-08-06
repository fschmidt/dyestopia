---
id: T-033
type: task
title: Run the Playwright suite in Actions
status: In Progress
ordinal: 150
labels: [testing, ci]
---

## Description

**Nothing blocks this. It guards the spine.** Queued second, behind `T-022`,
because `T-036`, `T-037` and `T-038` all change engine rules that
`tests/engine/board.spec.ts` verifies and `tsc` cannot see — a gate arriving
after those cards protects nothing they did.

Put `npm test` behind the same gate as the build, so a pull request cannot merge
with a broken game — only a broken *compile* is caught today, by the `verify`
job in `.github/workflows/ci.yaml`.

**It is two gates, not one, and only the second has to be earned.** The suite
splits along the seam between the engine and the scene, and the two halves have
nothing in common:

| | What runs | Cost | Flake surface |
| --- | --- | --- | --- |
| **Engine specs** | everything under `tests/engine/` — pure data in, data out | 40 tests in 0.7s, measured | none: no page, no Phaser, no timing |
| **Browser specs** | everything else in `tests/` | most of a two-minute run | tweens, polling, layout |

This card originally split `tests/match.spec.ts` down the middle. That was
wrong: every test in it drives the live scene, and the offline work inside them
is a *prediction* the same test then checks the game against — the two cannot be
separated without losing the check. The seam is whole files, and the two
genuinely pure ones are `board.spec.ts` and `stage-catalog.spec.ts`.

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
stops holding is exactly what `tests/engine/board.spec.ts` would catch and a
compile would not.

**Where it stands.** Gate one is built. The split is a directory —
`tests/engine/` — which `playwright.config.ts` turns into a project of its own
that names no device, so it needs no browser binary; the browser projects ignore
that directory, and a run restricted to `--project=engine` skips the web server
rather than paying for the build. `npm run test:engine` and `npm run
test:browser` are the two halves, and the `engine` job in
`.github/workflows/ci.yaml` runs the first on every pull request. What remains
of AC #2 is the repository setting: adding `engine` to the required list on
`main`.

The browser job is built too, but only as far as *running* — Chromium restored
from cache, the report and traces uploaded on failure, and
`scripts/flaky-reporter.ts` writing every pass-on-retry into the job summary as
a warning. It is deliberately not required yet. That is the campaign, and it has
already turned up its first datum: `tests/stages.spec.ts:155` failed once in a
full local run and then passed three times out of three in isolation, so the
flake is in the suite's parallelism rather than in the test.

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

Note that this is one card in Todo rather than two, because nothing external
blocks the second gate. The stability campaign is work done inside this card —
run the browser suite over the pull requests the spine produces, watch what the
retries say, then require it. Gate one ships first and does not wait for it.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 The engine specs run on every pull request, without a build and
      without a browser
- [ ] #2 The engine check is in the required list on `main`, and the split
      between the two halves is expressed in the config rather than in a
      hand-maintained list of files
- [x] #3 The browser specs run on every pull request, with browser binaries
      cached so the install is not the bulk of the run
- [x] #4 Traces and the report are uploaded on failure
- [x] #5 A pass that needed a retry is reported rather than hidden
- [ ] #6 Stability is demonstrated over repeated runs before the browser check
      is required
- [ ] #7 The browser check is added to the required list on `main`
<!-- AC:END -->
