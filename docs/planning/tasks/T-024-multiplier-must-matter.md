---
id: T-024
type: task
title: Make the multiplier necessary
status: Todo
ordinal: 500
labels: [engine, decision]
---

## Description

**Blocked on `T-031`, `T-036`, `T-037` and `T-035`. Feeds `T-025`.** Every card
ahead of it on the spine exists to give this one something to decide with.

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

`T-032` delivered the research and `C-001` was accepted on it, but that did not
unblock this card so much as name what it was waiting for. Until the board maths
are parameters (`T-035`), the only levers this card can reach are thresholds,
move budgets and board masks — and any tuning done with those is invalidated the
moment the real variables exist.

**This card and `T-038` may turn out to be one decision.** Both list a merge that
resolves without clearing among their candidates, and `C-001` argues that lever
moves supply and the multiplier together. If `T-036`'s numbers point there,
whichever card reaches the decision first records the `D-` and the other cites it
rather than deciding it twice.

~~Raising thresholds is not on the list. Targets are already calibrated near the
achievable ceiling, so pushing them past the points-chasing line makes stages
unwinnable by everyone rather than winnable only by chain players.~~

**Corrected by measurement — the premise holds on one stage of ten.** `T-036`
ran the ten core stages 200 times per row. Set the median chain run against the
stage target and the headroom is wide almost everywhere: `Royal Purple` clears
2900 with a median of 4402, `Cascade Lesson` 1800 with 2742, `Mixing Lesson`
1300 with 1880 — half again over target. `The Hourglass` is the exception at
2620 against 2500, and it is the one stage whose chain win rate is not at the
ceiling (88.0%; the other nine are 99.0% or better).

So targets are not calibrated near the achievable ceiling as a rule, and a
higher target would bite the points-chasing line before it bit the chain line
on nine stages. Whether raising thresholds belongs on the list is still this
card's call — it is a blunt lever and `T-025` owns the sequence — but it should
be decided against these numbers rather than ruled out on a premise that is
false for nine stages out of ten.

### What `T-031` and `T-036` established

Both halves of the diagnosis above now have numbers behind them, and they point
in different directions.

**The supply hypothesis is confirmed and is not sufficient on its own.** `T-031`
measured the combo wave over 12,000 playouts: it manufactures result tiles
exactly as `C-001` predicted, and the greedy-versus-chain win gap went flat or
*narrower* on nine stages of ten. `D-004` removed it, and carries the finding
that generalises — a mechanism that only manufactures supply pays whoever was
already winning. That is AC #1 answered for supply as a lever, and it is a
warning about the first bullet in the candidate list above.

**Mix legality moves the score gap where supply moved neither.** `T-036` gave
`mergeClears` its second form and measured it: the drain stops and reverses on
three stages, tertiary clears roughly double, and the greedy bot is untouched
because a dry merge pays nothing. The *score* gap widens on every stage; the
*win* gap does not. `I-028` carries the idea, and the numbers are in `T-036`.

**And they show what the win gap can and cannot see.** The chain line is
saturated — nine stages of ten at 99.0% or better — so a change that only helps
the builder has nowhere to show up, which is exactly why `T-036`'s variant reads
flat on the win gap and large on the score gap. That is a fact about *that*
measurement, not a fact about this card: the fix this card is looking for works
by lowering the *greedy* line, and the greedy line has plenty of room to fall.
The win gap is the right primary metric here, and it stops being saturated the
moment the fix works.

What was missing was a bar. "No longer clears reliably" could be satisfied at
84% as easily as at 20%, and could be met by making the game harder for
everyone — the thing AC #4 exists to prevent. AC #3 and AC #4 now carry numbers.
They are derived from the baseline rather than handed down — a points-chasing
policy clears the last three stages at 85–88% today and a chain-building one at
99.0% or better — and this card may revise them, but it should not leave them
unstated.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 The supply hypothesis is confirmed or killed with numbers
- [ ] #2 A decision is recorded: which lever, and why the others were not chosen
- [ ] #3 After the change, a points-chasing policy clears each of the last
      three stages no more than half the time, measured on the harness
      (85–88% today)
- [ ] #4 The chain remains reachable — a chain-building policy still clears
      every stage at least 90% of the time, so the fix has not simply made the
      game harder for everyone
<!-- AC:END -->
