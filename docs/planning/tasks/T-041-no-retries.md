---
id: T-041
type: task
title: Turn the retries off
status: Todo
ordinal: 900
labels: [testing, ci]
---

## Description

**Blocked on `T-040` and on `T-033` #6. The point of `C-004`, and three lines of
config.**

`playwright.config.ts` retries twice under CI. That is the right setting for a
suite that can fail for reasons other than the code being wrong, and the wrong
setting for the suite `T-040` is meant to leave behind. A retry converts a
timing failure into a green tick, so the suite never has to get better —
retries are what make flakiness survivable, and therefore permanent.

Setting `retries: 0` is not a cleanup. It is the enforcement: after it, a flake
is a build failure and someone has to find out why, which is the only mechanism
that keeps a suite honest once it is quiet.

**It must go on last, and it must be earned.** Turning retries off before the
suite is genuinely deterministic just relocates the pain — every intermittent
failure becomes a red build, the team learns to re-run the job by hand, and that
is the same lesson as merging past red with extra steps. `T-033` #6 wants
stability demonstrated over repeated runs; this card wants that demonstration to
have happened with the fake clock in place.

`scripts/flaky-reporter.ts` stays. With retries off it can no longer fire, which
makes it a tripwire rather than a report — if it ever speaks again, something
has put a retry back.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 `retries` is 0 under CI as well as locally
- [ ] #2 The browser checks are in the required list on `main` — `T-033` #7,
      which this card is the reason to trust
- [ ] #3 The suite has run green over repeated pull requests *after* the change,
      not only before it
<!-- AC:END -->
