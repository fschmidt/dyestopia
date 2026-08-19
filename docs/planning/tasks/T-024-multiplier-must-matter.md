---
id: T-024
type: task
title: Make the multiplier necessary
status: Todo
ordinal: 500
labels: [engine, decision]
---

## Description

**Blocked on `T-037` and `T-035`; `T-031`, `T-036` and `T-044` have
reported. Feeds `T-025`.** Every card
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

**Corrected by measurement — the premise held on one stage of ten, and
`T-044` has since spent the slack it named.** `T-036` ran the ten core stages
200 times per row and found the headroom wide almost everywhere: `Royal Purple`
cleared its 2900 target with a median chain run of 4402, `Cascade Lesson` 1800
with 2742. So targets were not calibrated near the achievable ceiling as a rule,
and the struck-through claim above was false for nine stages out of ten.

`T-044` acted on exactly that, moving `threshold` and `moves` until a
chain-building policy clears every stage at 90.5–94.0% rather than 99.0% or
better. **Read that card's tables rather than the figures in this paragraph** —
the targets and budgets they were measured against no longer exist. What
survives here is the shape of the finding: the greedy line has room to fall and
the builder's line has none to rise, so a fix this card makes registers as the
greedy line dropping.

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

**And they show what the win gap can and cannot see.** The chain line was
saturated — nine stages of ten at 99.0% or better — so a change that only helped
the builder had nowhere to show up, which is exactly why `T-036`'s variant reads
flat on the win gap and large on the score gap. That was a fact about *that*
measurement rather than about this card, and `T-044` has since fixed it: the
eight stages that ran a win gap under 5.0 points now run +18.5 to +66.5, with
the chain line off the ceiling. The win gap is the right primary metric here,
and it measures again.

Two of the ten rows still carry no gap, so a lever is measured on eight:
`First Splash` plays no mixable colour and runs the two policies as one bot, and
`The Hourglass` separates them by +0.5 points at every budget swept. That is a
gap in the test set rather than a verdict on either lever — the lineup is a set
of testing grounds, and `T-044` leaves whether it should grow a row that
separates them to whoever next touches it.

What was missing was a bar. "No longer clears reliably" could be satisfied at
84% as easily as at 20%, and could be met by making the game harder for
everyone — the thing AC #4 exists to prevent. AC #3 and AC #4 carry numbers for
that reason, derived from the baseline rather than handed down.

**Both need restating against `T-044`'s baseline, and that is this card's
call.** The greedy line on the last three stages is no longer 85–88%: it reads
`Amber Glow` 62.0%, `The Hourglass` 92.0%, `Full Spectrum` 27.0%. AC #3's "no
more than half the time" is therefore already true on one of the three before
this card changes anything, and a retune rather than a fix made it true. AC #4's
90% floor is now the calibration itself — every stage sits at 90.5–94.0% by
construction — so it has become a regression test on the retune rather than
evidence about a lever. Neither is wrong; both are measuring something other
than what they were written to measure, and the decision this card records sets
the bar itself.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 The supply hypothesis is confirmed or killed with numbers
- [ ] #2 A decision is recorded: which lever, and why the others were not chosen
- [ ] #3 After the change, a points-chasing policy clears each of the last
      three stages no more than half the time, measured on the harness —
      restated against `T-044`'s baseline before it is used, since that reads
      `Amber Glow` 62.0%, `The Hourglass` 92.0%, `Full Spectrum` 27.0%
- [ ] #4 The chain remains reachable — a chain-building policy still clears
      every stage at least 90% of the time, so the fix has not simply made the
      game harder for everyone. `T-044` calibrated the sequence to 90.5–94.0%,
      so this now checks that the fix did not eat the headroom
<!-- AC:END -->
