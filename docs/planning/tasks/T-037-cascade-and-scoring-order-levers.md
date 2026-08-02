---
id: T-037
type: task
title: Measure the cascade and scoring-order levers
status: Deferred
ordinal: 1500
labels: [engine, testing, balance]
---

## Description

The two rule-shaped levers the `C-001` inventory turned up beside mix legality.
Both are branches rather than numbers, so no parameter set reaches them, and both
bear directly on `T-024` — but neither is as large as `T-036`, which is why they
wait behind it rather than beside it.

**Wave multiplier inheritance.** A cascade wave inherits the move's multiplier
and never grows, and waves cost no moves. The alternative — waves that escalate,
which is the standard match-3 treatment — pays a player for setting up a long
cascade rather than merely for the move that started it.

**Merge scoring order.** A merge clears at the chain it *arrived* with; its own
result only raises the chain for later moves. So the chain a player builds pays
out on the move after the one that built it. Whether a merge's result should
count toward its own clear is a rule, and it is one of the cheapest ways to make
the multiplier visible at the moment the player earns it.

Same treatment as `T-036` and for the same reason: each becomes a variant the
harness can select, with today's behaviour as the default and the baseline, and
nothing reaches a player. Report win rate, the greedy-versus-chain gap and score
distribution per stage and per policy, with `T-022`'s comparative-not-predictive
caveat attached.

**Deferred, not dismissed.** These are cheap once `T-022` and `T-036` exist —
the switch-and-measure machinery is the same — and they are the two remaining
levers `T-024` can reach without touching supply. Promote when `T-036` reports.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Escalating cascade waves exist as a harness-selectable variant, with
      inheritance as the default
- [ ] #2 A merge result counting toward its own clear exists as a second
      variant, with today's order as the default
- [ ] #3 Win rate, greedy-versus-chain gap and score distribution reported per
      stage and per policy, for each variant against the baseline
- [ ] #4 The numbers are written down where `T-024` can cite them
- [ ] #5 No gameplay change reaches a player
<!-- AC:END -->
