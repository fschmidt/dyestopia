---
id: T-025
type: task
title: Ramp the stage sequence
status: Todo
ordinal: 1000
labels: [stages, balance]
---

## Description

**Blocked on `T-035`, `T-024` and `T-038`. Feeds nothing — it is the end of the
spine.** (`T-012` is closed as `D-004`.)

The stages do not get harder. Measured win rates rise and fall along the
sequence — the middle stages are the hardest, the late ones are easier than
stages a player met an hour earlier, and the last stage is easier than the sixth.
Whatever order the stages are in, it is not a difficulty curve.

Retune so that difficulty rises, and decide what "harder" means here. The
measurements suggest it tracks board *fragmentation* more than palette width: an
isolated, broken-up board on a tight move budget beats an unbroken board with
more colours on it.

Last on purpose. Retuning thresholds against rules that are about to change is
work thrown away twice, and a ramp built from the only two knobs a stage has
today is a ramp that has to be built again once `T-035`'s parameters exist.

**The headroom half is `T-044`'s, and that is a different job.** `T-036` found
the chain policy pinned at 99.5–100% on eight stages of ten, which stops the win
gap measuring anything and blocks `T-024`, `T-037` and `T-038`. Moving two
authored numbers until the bots come off the ceiling is an instrument fix: it is
cheap, it is expected to be redone once `T-038` lands, and it cannot wait behind
the cards it unblocks. Building a *curve* is none of those things, which is why
the split is worth making rather than doing both here.

So this card inherits a calibrated baseline rather than a saturated one, and its
job narrows to shape: which stage is harder than which, and why. `D-002` still
adds the job neither card had before — every threshold was calibrated against an
economy where result-tile supply only ever drained, so whatever mechanism
`T-038` chooses makes the stages materially easier at unchanged targets. If
`T-038` does not re-tune them, this card does.

A difficulty *setting*, if it ever arrives, is the same parameter set chosen a
second way — so the ramp should be expressed in those parameters rather than in
hand-picked numbers per stage.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Win rate falls monotonically enough across the sequence to read as a
      curve, measured on the harness
- [ ] #2 The last stage is the hardest
- [ ] #3 What makes a stage hard is written down in the game wiki
- [ ] #4 Every stage remains clearable by a competent player
<!-- AC:END -->
