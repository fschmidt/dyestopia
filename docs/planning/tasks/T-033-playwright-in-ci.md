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

This card originally split `tests/play/match.spec.ts` down the middle. That was
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
`.github/workflows/ci.yaml` runs the first on every pull request. It is in the
required list on `main` alongside `verify`, which completes AC #2.

The browser job is built too, but only as far as *running* — Chromium restored
from cache, the report and traces uploaded on failure, and
`scripts/flaky-reporter.ts` writing every pass-on-retry into the job summary as
a warning. It is deliberately not required yet. That is the campaign, and the
first CI run made the reason concrete.

### What the first browser run measured

One runner, all three projects: **14 failed, 1 flaky, 188 passed, 15.7 minutes.**
Locally the same tree is 242 passed, 1 failed, 2.5 minutes.

The distribution is the finding. Every one of the fourteen failures was in the
`2x` project. `1x` passed 100 out of 100, one of them on a retry. Same code,
same tests, same machine — so this is not a flaky suite in the usual sense, it
is a starved one. A hosted runner has two cores and no GPU, so Phaser's WebGL
falls to a software rasteriser, and `deviceScaleFactor: 2` asks it for four
times the pixels of `1x` for identical work. The failures read the way starving
reads: `Test timeout of 30000ms exceeded`, `mouse.move: Test timeout`, polls
expiring on animations that never finish.

That also answers, with a measured runtime in hand, the question this card
raised about which projects run: the cost is not spread evenly across the three,
so the decision is per project rather than all-or-nothing. Hence the matrix —
one runner each, so a project cannot starve its neighbour, each is named
separately in the checks list, and each can be required as it settles.

Roughly half of the 15.7 minutes was failure, not work: fourteen tests × three
attempts × timeouts that mostly ran to the full thirty seconds.

### The matrix run, which ruled out contention

Giving each project its own runner fixed two of the three and did not touch the
third. `iphone-15-pro-max` passed in 57s, `1x` passed 100 out of 100 in 3.1
minutes, and `2x` failed 16 of 100 in 15.2 minutes. Both browser legs reported
four cores and two workers, so the two runs differ in exactly one variable:
`deviceScaleFactor`. Cross-project starvation was not the cause, and isolating
`2x` made it slightly worse rather than better — it now shares a machine only
with itself.

### Where the cost actually sits

Sorting the `2x` run by spec file separates it cleanly, and the split is not the
one the project's own comment assumes:

| | Specs | Tests | Passing time | Failures |
| --- | --- | --- | --- | --- |
| Plays a round | `stages`, `tutorial`, `sfx`, `match`, `motion` | 44 | 272s over 28 | 16 |
| Inspects a screen | `visual-system`, `tools`, `settings`, `smoke`, `tiles`, `stage-select-redesign`, `layout`, `site` | 56 | 320s over 56 | 0 |

(Cumulative across two workers, so wall-clock is about half. The failing 16 cost
a further ~1150s in timed-out attempts, which is where the fifteen minutes went.)

Every failure is in a spec that plays a round — many drags, each waiting on the
animation to settle, while a software rasteriser redraws four times the pixels.
Not one is in a spec that inspects a screen. Which is to say: the specs that
exist to catch a DPR regression all pass at 2x and cost 2.7 minutes between
them, and everything that fails is re-verifying round logic that has no DPR in
it and is already green at `1x`.

The `2x` project's premise — *every* test runs at both ratios — was a cheap
belt-and-braces choice on a fast machine. It is not cheap on a runner, and the
measurement says the belt is doing all the work.

### What was done about it

`tests/play/` now holds the five specs that play a round, and `2x` ignores that
directory. Same shape as the engine seam: the directory is the whole rule, so a
new spec's cost is decided by where it is put rather than by remembering to
amend a list. `1x` still runs everything the browser can check.

The run after that change was green on all five checks:

| Check | Result | Time |
| --- | --- | --- |
| `verify` | pass | 13s |
| `engine` | 40 passed | 15s |
| `browser (1x)` | 100 passed, no retries | 3m41s |
| `browser (2x)` | 55 passed, 1 flaky | 3m51s |
| `browser (iphone-15-pro-max)` | 3 passed | 47s |

Longest leg 3m51s, against 16m20s for the single job it replaced, and the three
browser legs run at once.

### Where the campaign stands

With the three causes gone, the next run was green on all five checks and — for
the first time — needed **no retries at all**: no flaky line, no warning
annotation, nothing for the reporter to say.

| Check | Result | Time |
| --- | --- | --- |
| `verify` | pass | 19s |
| `engine` | 40 passed | 18s |
| `browser (1x)` | 104 passed, no retries | 4m0s |
| `browser (2x)` | 60 passed, no retries | 3m23s |
| `browser (iphone-15-pro-max)` | 3 passed, no retries | 47s |

One clean run is still not a quiet suite, and AC #6 asks for repeated ones. But
it is the first run where the suite had nothing to hide, which is the point the
campaign was trying to reach before it could start counting.

### What the campaign was watching

The first green run named its own next problem, which is what the reporter is
for:

> `2x › settings.spec.ts › every combination builds a full board (passed on
> retry 2)`

Two failed attempts behind a green tick — exactly what `retries: 2` would have
hidden and what the reporter exists to surface.

### Two causes found, both removed

Chasing that warning turned up two things, and neither was slowness.

**A sleep cannot prove a negative.** Four tests waited a fixed 400–700ms and
then asserted that nothing had changed — that a refused drop cost no move, no
tool, no score. Polling for that state proves nothing, because it was already
true before the drag; the sleep was standing in for "long enough that a change
would have shown up by now", which is a guess, and the guess is what fails on a
slow machine. `BoardReport.settled` now reports the honest condition — no
cascade resolving, no tile mid-tween — after which the board cannot change
without new input. All four sleeps are gone, and `tests/` no longer contains a
`waitForTimeout`.

**A scene restart is not a true edge.** `goTo` stops every scene and starts one,
and Phaser processes both in the same pass, so waiting for `isActive('Game')`
straight after `goTo('Game')` can be satisfied by the scene that was already
running. The driver then reads the previous round under the same key — which is
exactly how a settings test that rebuilds the board fifteen times in a loop came
to fail on two attempts out of three.

The first fix for this was to bounce off Menu, so that Game was genuinely
inactive before being started again. It was correct and it was too expensive:
rebuilding Menu fifteen times inside that loop pushed the test past the 30s
budget at 2x, and a green leg went red. The counter is the cheaper statement of
the same idea — `BaseScene` ticks `generation` on every scene start, so *active
under this key **and** a generation that has moved* is a real transition, with
no extra scene to build. Worth recording as the lesson: a correct wait that
costs a scene rebuild per iteration is its own kind of flake.

**And the test was simply too big.** With both races gone it still failed at 2x,
on the same 30s budget. That test walked all fifteen shape × theme
combinations in one body, and every pass rebuilds the board and bakes a fresh
set of tile artwork — real work at double density on a machine with no GPU. It
is now one test per shape: five bodies of three themes each, which fit
comfortably, run in parallel, and name the shape that broke without reading a
label. Raising the timeout would have hidden the same fact.

That the original was the first flake the reporter caught is not a coincidence.
It was the longest test in the suite, so it was the one closest to the edge —
which is what a budget measured in wall-clock does to a test that grew.

Neither fix makes the suite deterministic. The remaining nondeterminism is time
and nothing else: the RNG is already one seeded stream per round, and
`resolveCascade` settles the model synchronously, so only the animation is
clock-bound. A spike confirmed that `page.clock` fakes the
`requestAnimationFrame` and `performance` that Phaser's loop runs on — with real
time passing and no clock advance the game did not move, and two runs produced
byte-identical boards. Making time an input across ~60 poll sites is its own
piece of work, not a cheap win, and wants a concept before it wants a card.

What was cheap was removing two ways of being wrong, and that is what this did.

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
- [x] #2 The engine check is in the required list on `main`, and the split
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
