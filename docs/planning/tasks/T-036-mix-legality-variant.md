---
id: T-036
type: task
title: Measure a mix that does not clear
status: Todo
ordinal: 450
labels: [engine, testing, balance]
---

## Description

`C-001` §4 names mix legality as the largest single influence on how available
chain play is, and the one lever no parameter can reach, because it is a branch
rather than a value. `mergeClears` requires the dyed target alone to complete a
line, which means **no merge can resolve without clearing** — and that single
rule is what welds building to spending. The pitch is *mix to build, swap to
cash in*, but a mix must clear to be legal, so mixing **is** cashing in.

Give the rule a second form and measure it. A merge that is legal, costs a move,
and leaves two result tiles standing turns the merge arithmetic from −2 into +2,
and it moves the supply economy and the multiplier problem at the same time —
which is `C-001`'s argument for treating this lever before the others.

**Measurement only.** The variant is reachable by the harness, not by a player:
no flag in the game, no stage authored against it, nothing shipped. `T-024`,
`T-012` and `T-038` decide; this card gives them the numbers to decide with, and
they are the numbers none of those three can currently get.

**Blocked on `T-022`**, and it wants `T-031`'s combo figures beside it, since
combo and legality are two answers to the same scarcity.

Report, per stage and per policy, against the unchanged rule as the baseline:

- **Win rate**, the headline metric, with `T-022`'s caveat attached — comparing
  two configurations under one fixed policy is a relative claim and holds;
  predicting how hard a stage feels does not.
- **The standing non-seed tile count per move**, which is the direct measure of
  whether the economy stops draining.
- **The greedy-versus-chain gap**, because a variant that raises both lines
  equally has not made building necessary, only made the game easier.
- **Tertiary clears per run.** No tertiary clear has been observed in play. If
  the variant does not produce them, it has not solved the problem it was cut
  for, whatever the win rate says.

And answer `C-001`'s open question, because the numbers can: if a merge can
resolve without clearing, what stops a player mixing the whole board before
cashing in once? The move budget is the only brake today, and it may not be
enough of one. A variant that is unbounded in practice should be reported as
unbounded rather than as a win rate.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A merge that resolves without clearing exists as a variant the harness
      can select, with the current rule as the default and the baseline
- [ ] #2 Win rate, non-seed tile count per move, greedy-versus-chain gap and
      tertiary clears per run, reported per stage and per policy for both
- [ ] #3 The mix-the-whole-board question is answered with numbers — how far a
      policy that hoards mixes actually gets on the move budget alone
- [ ] #4 The numbers are written down where `T-024`, `T-012` and `T-038` can
      cite them
- [ ] #5 No gameplay change reaches a player: no flag, no stage, nothing shipped
<!-- AC:END -->
