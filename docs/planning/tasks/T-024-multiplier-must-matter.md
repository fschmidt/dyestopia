---
id: T-024
type: task
title: Make the multiplier necessary
status: Todo
ordinal: 500
labels: [engine, decision]
---

## Description

A player who ignores the multiplier entirely clears essentially every stage. A
player who builds chains wins by a small margin and never has to. The pitch of
the game — mix to build, swap to cash in — is therefore optional for the whole
game, which means someone can finish Dyestopia without meeting it.

This is the product problem, and it is a decision card: what changes so that
building is the way to win rather than the way to win by a bit.

The diagnosis matters more than the fix. The multiplier is not weak — a maxed
chain cashed as a Rainbow Chain Breaker is worth several times a plain clear,
and every cascade wave it sets off inherits it. If chain play only wins by a
little against payouts like that, the likely reason is that chain play is
mostly unavailable: a mix is legal only when the dyed target completes a line
with two result-coloured tiles already in place, refills only ever drop `seed`
colours, and **each merge spends more result tiles than it returns** — two in
line plus the dyed target clear, and only the dragged tile survives. The
non-seed pool is therefore monotonically non-increasing across a round, and for
a tertiary the drain compounds because the ingredient is non-seed too. `C-001`
works the arithmetic. Confirm or kill that hypothesis first — the harness can,
and `T-031` reports the mix counts.

Candidate levers, none of them presumed:

- **Mix supply** — the combo wave (`T-012`, gated on `T-031`), weighted refills
  (`I-016`), or authored deals that keep pairs coming
- **Cost** — a swap that breaks the chain for less, or a chain that decays
- **Objectives** — winning conditions the multiplier is the only route to,
  rather than a score target any route can reach

Blocked on `T-032`. Until the board maths are parameters, the only levers this
card can reach are thresholds, move budgets and board masks — and any tuning
done with those is invalidated the moment the real variables exist.

Raising thresholds is not on the list. Targets are already calibrated near the
achievable ceiling, so pushing them past the points-chasing line makes stages
unwinnable by everyone rather than winnable only by chain players.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 The supply hypothesis is confirmed or killed with numbers
- [ ] #2 A decision is recorded: which lever, and why the others were not chosen
- [ ] #3 After the change, a points-chasing policy no longer clears the later
      stages reliably, measured on the harness
- [ ] #4 The chain remains reachable — the fix does not simply make the game
      harder for everyone
<!-- AC:END -->
