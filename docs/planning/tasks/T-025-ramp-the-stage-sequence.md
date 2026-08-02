---
id: T-025
type: task
title: Ramp the stage sequence
status: Todo
ordinal: 1000
labels: [stages, balance]
---

## Description

**Blocked on `T-035`, `T-012`, `T-024` and `T-038`. Feeds nothing — it is the
end of the spine.**

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

`D-002` added a job this card did not have before: every current threshold was
calibrated against an economy where result-tile supply only ever drained, so
whatever mechanism `T-038` chooses makes the stages materially easier at
unchanged targets. If `T-038` does not re-tune them, this card does.

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
