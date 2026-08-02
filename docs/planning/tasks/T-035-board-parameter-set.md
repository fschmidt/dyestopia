---
id: T-035
type: task
title: Name the board parameter set
status: Todo
ordinal: 600
labels: [engine, balance, decision]
---

## Description

**Blocked on `T-022` and `T-034`. Feeds `T-024`, `T-025`, `T-019` and `I-013`.**

Fill `C-001` §3. Named parameters with today's behaviour as their defaults, so
adopting the set changes nothing until someone changes a value, and per-stage
override, because varying them per stage is the point.

The survey found no industry line between
rule and parameter to borrow, so `C-001` proposes a capability test instead: a
parameter earns its place if the harness can sweep it and report a difference.
That test cannot be applied before the harness exists, which is the whole reason
this card is not simply "expose the constants".

What the set has to contain, and what it has to survive:

- **A supply rate.** `D-002` decided that result-tile supply is a flow, so a rate
  is a known member of the set rather than an open question about it. This card
  is queued *before* `T-038`, which chooses the mechanism that rate governs, so
  the rate is named as a slot and left general — a parameter shaped around one
  candidate mechanism would decide `T-038` by the back door.
- **The chain ceiling, decided one way or the other.** Today
  `stageMaxMultiplier` is `1 + active recipe count`, so ceiling and palette
  cannot move independently: the only way to raise a stage's ceiling is to change
  what the board plays. Whether they come apart is this card's call.
- **The two chain-breaker bonuses** (×2 and ×3). Plain literals with no
  structural role, the cheapest levers on the multiplier problem, and named by
  neither `T-012` nor `T-024`.
- **A shape that does not foreclose `T-019` or `I-013`.** Declarative stages will
  eventually author the parameter block, so the two have to agree on shape. A
  roguelike run chooses values nobody authored, which `C-001` §6 calls the
  hardest constraint — the survey's answer is a layered set, a base table
  belonging to the context plus a correction term, which stays coherent for
  combinations nobody wrote down as long as the base is complete.

Taking those into account does not mean building for them. It means not choosing
a shape that forecloses them.

The boundary is a decision, not a preference, so it is recorded as a `D-` record
with the capability test and its results behind it — including the parameters
that were proposed and rejected because the harness could not tell the
difference.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A named parameter set with today's behaviour as the defaults —
      adopting it changes no observed outcome on the harness, same seeds in,
      same numbers out
- [ ] #2 Every parameter is overridable per stage
- [ ] #3 The boundary is decided by the capability test and recorded as a `D-`
      record, naming what was left out and why
- [ ] #4 The set includes a supply rate and resolves whether the chain ceiling
      is authorable independently of `active`
- [ ] #5 The shape is checked against `T-019`'s declarative stages and
      `I-013`'s run-time layering, and stated to be compatible with both
<!-- AC:END -->
