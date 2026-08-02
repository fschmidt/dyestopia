---
id: T-021
type: task
title: Tutorial rounds can be lost silently
status: Deferred
ordinal: 1800
labels: [tutorial, bug]
---

## Description

A lesson hides the moves counter but still spends moves, and still loses the
round at zero. The loss overlay then reports a score against a target that the
lesson deliberately never showed, so the first-time player is told they ran out
of a resource they were never given sight of.

It is reachable rather than theoretical. The lessons that accept only merges
refuse every swap, and a merge whose result is already in the chain advances
nothing while still costing a move — so a player who has not yet understood the
rule can spend the whole budget making legal moves that go nowhere.

A wrong-*kind* move has a second problem: it restarts the entire scene after a
short delay, which replays the explanation from its first page. Nothing
documents that as intended and it reads as a crash.

Decide the lesson budget rule rather than patching the symptom — a lesson either
has no budget, or shows the one it has.

**Deferred while the `C-001` spine runs, on priority rather than on a
dependency.** Nothing in the board maths touches this and nothing about fixing
it would be thrown away — it is a live bug parked because the lane is sequenced
on one chain. It is the strongest candidate for promotion if anything comes off
the spine.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 No lesson can reach a loss state it was never shown the budget for
- [ ] #2 A refused move inside a lesson does not restart the explanation from
      page one
- [ ] #3 The rule for lesson budgets is written down, not just implemented
<!-- AC:END -->
