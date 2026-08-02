---
id: T-012
type: task
title: Resolve the combo spike
status: Todo
ordinal: 700
labels: [engine, decision]
---

## Description

**Blocked on `T-031` and `T-036`. Feeds `T-025`.** The first decision on the
spine, and the narrowest — it settles one flag rather than a rule.

The flood-fill combo wave sits behind the `?combo` flag: a mixed colour absorbs
connected groups of its ingredients. Ship it, revise it, or remove it — the MVP
should have one intentional mixing model, not two.

Combo is a candidate answer to the multiplier problem in
`T-024`, not a presumed one: it manufactures result-coloured tiles faster than
one per merge, which is the scarce resource, but it plausibly overshoots and
makes stages trivially easy — a spike that pays regardless of whether the player
built anything. Both effects have to be measured before this card can decide
anything, and both are measurable now that `T-022` exists.

Revising it counts as resolving it. If the wave is right in principle but too
generous, the outcome may be a bounded version — capped group size, or
converting only ingredients adjacent to the merge pair — rather than a straight
ship-or-drop.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A decision is recorded with its reasoning, and with the numbers from
      `T-031` behind it
- [ ] #2 The decision names what combo does to the greedy-versus-chain gap and
      to the win rate, not just whether it feels good
- [ ] #3 If dropped, the flag and its code are removed rather than left dormant
- [ ] #4 If kept, one mixing model ships — the flag is gone either way
<!-- AC:END -->
