---
id: T-012
type: task
title: Resolve the combo spike
status: Done
ordinal: 1000
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

---

## Resolved: removed

`T-031` measured the wave over 12,000 playouts and the answer was not close.
Combo does manufacture result tiles — mixes per move rise, the non-seed pool
stops draining — and it does nothing at all for the multiplier problem it was a
candidate answer to. The greedy-versus-chain win gap is flat or narrower on nine
stages of ten, and rounds shorten by around 40% where the wave fires. It pays
whoever was already winning, sooner. `Twin Wells` is the clean statement: 94.0%
to 98.5% for the greedy bot against 99.0% to 100.0% for the builder.

The bounded variant this card asked for was measured too, and was the closest
call — most of the supply benefit, almost none of the win-rate inflation, and
the only meaningfully positive gap change in the run. It was rejected as a wash
rather than a fix; `I-008` is where the shape survives, as a tool rather than a
core rule.

**Recorded as `D-004`**, accepted. The flag and its code are gone rather than
dormant, which is AC #3 and the operative half of AC #4 — one mixing model
ships either way. What the measurement built to weigh the wave stays: mixes per
run, the per-move rates and `policyGap` all outlive it, because `T-036` and
`T-037` weigh their variants the same way.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 A decision is recorded with its reasoning, and with the numbers from
      `T-031` behind it
- [x] #2 The decision names what combo does to the greedy-versus-chain gap and
      to the win rate, not just whether it feels good
- [x] #3 If dropped, the flag and its code are removed rather than left dormant
- [x] #4 If kept, one mixing model ships — the flag is gone either way
<!-- AC:END -->
