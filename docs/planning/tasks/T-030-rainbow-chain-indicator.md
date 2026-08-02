---
id: T-030
type: task
title: Dedicated rainbow chain indicator
status: Deferred
ordinal: 2200
labels: [visuals, feel]
---

## Description

The chain indicator gets its own look once the chain reaches the stage maximum,
so Rainbow is recognisable at a glance rather than requiring the player to
remember what this stage's maximum is.

Promoted from `I-018`. The state it needs is already computed and already routed
into the chain ring, so this is a visual pass on a live branch rather than new
plumbing.

Rainbow is the game's biggest payoff and it currently announces itself only
*after* it has been cashed in, in the score float. Making the peak legible
before the swap is the difference between the tension existing and the tension
being felt.

**Deferred while the `C-001` spine runs.** Rainbow is the peak of a multiplier
whose worth `T-024` is about to change, and whose ceiling `T-035` may decouple
from the stage palette. The indicator should announce the mechanic that ships,
not the one under review.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A chain at the stage maximum is distinguishable at a glance from one
      that is merely long
- [ ] #2 It reads on a phone, at speed, in every visual profile
<!-- AC:END -->
