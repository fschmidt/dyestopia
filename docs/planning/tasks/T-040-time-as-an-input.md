---
id: T-040
type: task
title: Make time an input to the browser specs
status: Todo
ordinal: 1200
labels: [testing]
---

## Description

**Blocked on nothing, but worth running behind `T-039` so the conversion is not
also a rewrite. Gates `T-041`.**

The body of `C-004`. The browser specs wait on wall-clock for animations to
finish, which makes every one of them a bet that the machine is fast enough —
and `T-033` measured the machine losing that bet sixteen times in one run.
`page.clock` fakes the `requestAnimationFrame` and `performance` that Phaser's
`TimeStep` runs on, so the game's clock becomes something the test states rather
than waits for.

The mechanism is spiked, not assumed: with the clock installed and 1.5 seconds
of real time passing, the game did not move; after `runFor(5000)` it settled;
and two runs produced byte-identical boards, all 64 cells in the same order. See
`C-004` for the full spike.

**The helper is the card, not the 46 call sites.** Under a fake clock the
question changes from *whether* to keep waiting to *how far to advance*, and the
answer — step the clock until `BoardReport.settled` reports nothing in flight —
wants writing once in `tests/helpers.ts`. Most specs should then convert by
swapping a poll for that call. If they do not, the helper is wrong.

Three things are known to be awkward, and none should be discovered late:

- **`dragWorld` is the chokepoint.** Mouse events are dispatched in real time, so
  a drag crossing a timer-based threshold may need the clock advanced
  mid-gesture. Nearly every test goes through this helper.
- **Boot may hold a real timer.** The spike booted fine with the clock installed,
  which is evidence and not proof. Anything that turns out to need real time
  during load will surface as a hang, not a failure.
- **Some tests are about time.** `tests/play/motion.spec.ts` asserts a dragged
  splash *flows toward the pointer*. That is feel, and feel is a real-time
  property; converting it mechanically would keep it green while changing what it
  claims. Decide these one at a time, and if a set of them should stay on the
  real clock, that is a `D-` record `C-004` owes.

Do not set `retries` here. Proving the suite no longer needs them is `T-041`.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A helper advances the faked clock until the board reports settled, and
      the specs go through it rather than through their own timeouts
- [ ] #2 The browser specs run with `page.clock` installed
- [ ] #3 `dragWorld` works under the faked clock, drag threshold included
- [ ] #4 Any spec deliberately left on the real clock says why, in the spec
- [ ] #5 The same spec run twice produces the same result, demonstrated rather
      than asserted
- [ ] #6 The suite passes on a deliberately starved machine — the 2x project
      under contention is the cheap way to arrange one
<!-- AC:END -->
