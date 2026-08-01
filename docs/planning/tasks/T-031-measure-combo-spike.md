---
id: T-031
type: task
title: Measure the combo spike
status: Todo
ordinal: 400
labels: [engine, testing]
---

## Description

Quantify what the `?combo` flood-fill wave actually does to the game, so that
`T-012` and `T-024` decide against numbers instead of intuition. Measurement
only — this card changes no gameplay and ships no decision.

Run every stage under the `T-022` harness, combo off and combo on, across the
same bot policies, and report the difference. The two questions that matter pull
in opposite directions and both have to be answered:

- **Does it make chain play available?** The hypothesis is that mixes are
  supply-starved — a mix is only legal when the dyed target completes a line with
  two result-coloured tiles already in place, and refills only ever drop `seed`
  colours, so result tiles come from the opening deal and merge survivors alone.
  Combo is the one mechanism that manufactures them faster.
- **Does it make the game too easy?** A wave that fires on any mix pays out
  whether or not the player built anything, which would raise the greedy line as
  much as the chain line and flatten what little difficulty exists. If the win
  rate goes up and the gap between greedy and chain play does not, combo is not
  a fix — it is a bigger version of the problem.

Report both, per stage and in aggregate. A verdict that combo helps supply is
worthless without the second number beside it.

Worth measuring at least one bounded variant as well — capped group size, or
converting only ingredients adjacent to the merge pair — so `T-012` has
something between ship and drop to choose from.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Win rate and score distribution per stage, combo off versus on, per
      policy
- [ ] #2 The greedy-versus-chain gap reported as its own figure, since that gap
      is the thing being fixed
- [ ] #3 Mixes performed per run reported, to test the supply hypothesis directly
- [ ] #4 At least one bounded variant measured alongside the full wave
- [ ] #5 The numbers are written down where `T-012` and `T-024` can cite them
<!-- AC:END -->
