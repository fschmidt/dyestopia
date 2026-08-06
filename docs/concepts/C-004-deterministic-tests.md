---
id: C-004
type: concept
title: Deterministic tests
status: Review
tasks: [T-039, T-040, T-041]
---

# Deterministic tests

**For review.** The analysis is done and the load-bearing claim is spiked rather
than argued: a faked clock drives Phaser's loop, and two runs under it produced
byte-identical boards. What wants a decision is whether to spend the migration —
46 poll sites across eleven of the fourteen browser spec files — to reach a
suite where a retry is never needed, and therefore never allowed.

`T-033` did the cheap half of this and stopped where the cheap half ends. This
picks up there.

## The goal, stated as a rule

**A test must fail only when the code is wrong.**

That is stronger than "the suite is usually green", and it is the difference
that matters. Today a test can fail because a machine was busy, and the response
to that is a retry — which works, and is exactly the problem. A retry converts a
timing failure into a green tick, so the suite never has to get better. Retries
are what make flakiness survivable and therefore permanent.

The rule has a corollary the rest of this document is in service of: **once it
holds, `retries` goes to zero.** Not as a cleanup, as the enforcement. A suite
that cannot be retried is a suite whose flakes must be fixed.

## What is already deterministic

Worth stating plainly, because it narrows the problem to one axis and most of
the work is already done.

**The data.** `seedRng` plants one `mulberry32` stream that a whole round draws
from — the opening deal, every refill, and reshuffles. Same seed, same round,
tile for tile. The engine never touches `Math.random`; `src/rng.ts` exists to
make exactly this true.

**The model.** `resolveCascade` plays a move's cascade to a standstill in one
synchronous call and returns the waves as a value. The board is settled before
anything is drawn — `GameScene` replays the waves to catch the tiles up. This is
`T-022`'s work, and it means the *outcome* of a move is never in question; only
the animation of it takes time.

**The engine tier.** `tests/engine/` is pure data in, data out. It has no page,
no Phaser and no timing, and it is already the model of what the rest should be:
40 tests, 0.7 seconds, nothing to be flaky about.

## What is not

**Time, and nothing else.**

The browser specs wait on wall-clock for animations to finish, and a wait on
wall-clock is a bet that the machine is fast enough. `T-033` measured what
happens when it is not: on a runner with two workers and no GPU, sixteen tests
failed at `deviceScaleFactor: 2` that passed at 1. The code was identical. The
deadline simply arrived first.

Three shapes of wait exist in the suite today, and they are not equally bad:

| Shape | Count | Why it fails |
| --- | --- | --- |
| Fixed sleep | 0 | An unconditional bet on timing — removed in `T-033` |
| Poll for a terminal state | most of 46 | Only ever *late*, never wrong — safe, but bounded by a timeout |
| Poll for a transient state | the rest | Can be missed entirely, not merely late — wrong under load |

The middle row is why the suite mostly works. The bottom row is a real bug that
no amount of timeout is a fix for, and it is `T-039`.

## The lever: time as an input

Playwright's `page.clock` installs fake implementations of `Date`,
`setTimeout`, `setInterval`, **`requestAnimationFrame`** and `performance`.
Those last two are what Phaser's `TimeStep` runs on, which means the game's
clock can be driven from the test without the game knowing.

### The spike

Run against the real build, twice:

- `page.clock.install()`, then a seeded round, then a clearing swap.
- **1.5 seconds of real time passed with no clock advance: the game did not
  move.** The cascade was gated on the faked clock, as intended.
- `page.clock.runFor(5000)`: the board settled, full and match-free.
- **Both runs produced byte-identical settled boards** — all 64 cells in the
  same order, same score.

So the mechanism works, on this game, unmodified. That was the risk worth
retiring before proposing the migration, and it is retired.

### What it buys

- **CPU speed stops affecting correctness.** A slow machine makes a run slower,
  never redder. The whole class of failure `T-033` spent a day diagnosing
  disappears rather than being tuned around.
- **Transient states become observable.** Advancing in small steps can land on a
  mid-cascade state deliberately, instead of hoping to sample it.
- **Timeouts stop being load-bearing.** A test says "five seconds pass", not
  "wait up to five seconds and hope".

### What it does not buy

**Speed.** `runFor(5000)` still renders every frame in between, and at 2x on a
software rasteriser that is still real work. Determinism restores *correctness*,
not *wall-clock*. In particular it does not by itself undo `T-033`'s split of
`tests/play/` out of the 2x project — it turns that from a reliability question
into a pure cost one, which is a better question to be left with but is not the
same as answering it.

## Where it gets awkward

Honesty about the parts that are not mechanical, because they are what the
estimate hangs on.

**Boot.** The spike showed the game boots without needing the clock advanced,
which is the happy case. Anything that turns out to depend on a real timer
during load has to be found by conversion, not by reading.

**Input.** Mouse events are still dispatched in real time. A drag that crosses a
timer-based threshold may need the clock advanced mid-gesture, which makes
`dragWorld` clock-aware and is the one helper most tests go through.

**Tests that are genuinely about time.** `motion.spec.ts` asserts that a dragged
splash *flows toward the pointer* — that is about feel, and feel is a real-time
property. Converting it mechanically would keep it green while quietly changing
what it means. These need judgement, and there may be a small set that should
stay on the real clock and out of the required checks.

**The idle signal already exists but is not enough.** `BoardReport.settled`
(`T-033`) reports that nothing is in flight, which answers *whether* to keep
waiting. Under a fake clock the question becomes *how far to advance*, and the
natural answer — advance in steps until settled — needs writing once, in
`tests/helpers.ts`, rather than in sixty places.

## The order

1. **`T-039` — audit the polls that can miss what they wait for.** Independent
   of everything else, findable by reading, and a real bug where it exists.
2. **`T-040` — make time an input.** The migration. Gated on nothing, but worth
   doing after `T-039` so the conversion is not also a rewrite.
3. **`T-041` — `retries: 0`.** The enforcement, and the point of the exercise.
   Gated on `T-040` and on `T-033` #6, because turning off retries before the
   suite is quiet just moves the pain.

## What this concept owes

No decision record yet. If the awkward cases above turn out to need a standing
rule — *which tests are allowed to stay on the real clock, and what that costs
them* — that is a `D-` record and this concept owes it. It is not ripe until
`T-040` has met a few of them.
