---
id: T-034
type: task
title: The board maths as formulas
status: Todo
ordinal: 620
labels: [engine, balance, docs]
---

## Description

Fill `C-001` §2. Scoring, chain growth, cash-in, supply and placement written so
they can be read, argued about and evaluated without the game running. This is
the part of the concept that does not exist at all today, and the reason `C-001`
is a concept rather than a refactor.

The inventory in `C-001` §1 lists *where* each rule lives and what its value is.
It does not say what the rules compute. A reader who wants to know what a
maxed-chain Rainbow Chain Breaker on a run of four tertiaries is worth has to
read four functions across three files and hold the order of operations in their
head. That is why every balance argument so far has been made from intuition —
including the ones in `T-012` and `T-024`.

Each formula names the function that implements it, so drift between the two is
detectable rather than silent. Where a formula has an order of operations that
surprises — a merge clears at the chain it *arrived* with, a cascade wave
inherits the move's multiplier and never grows — the formula says so rather than
burying it.

Write them against the code as it stands. This card changes no behaviour and
chooses no value; if a formula turns out to be awkward to state, that is a
finding for `T-035`, not a licence to change the rule here.

Note that `npm test` is Playwright and there is no unit-test runner, so
"testable on its own" in `C-001` §5 is a capability `T-022` brings, not one this
card builds. What this card owes is formulas precise enough that the harness can
check them once it exists.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Scoring, chain growth, cash-in, supply and placement each written as a
      formula in `C-001` §2, evaluable by hand
- [ ] #2 Each formula names the function that implements it
- [ ] #3 Each is checked against the code as it stands, with a worked example
      that a reader can follow
- [ ] #4 The order-of-operations surprises are stated in the formulas rather
      than left to the prose around them
- [ ] #5 No behaviour changed and no value chosen
<!-- AC:END -->
