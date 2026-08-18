---
id: T-038
type: task
title: Choose the supply mechanism
status: Todo
ordinal: 600
labels: [engine, balance, decision]
---

## Description

**Blocked on `T-031` and `T-036`. Feeds `T-025`.** The largest product change on
the spine, and the last decision before the sequence is retuned.

`D-002` decided the shape: result-tile supply must regenerate during a round, at
a rate that can be varied per stage, bounding the floor without steering the
outcome. It deliberately did not choose the mechanism. This card does, and it is
the card that actually changes what the game plays.

`D-002` said a mechanism card should be cut once `T-031` reports, and that a
blocked card in a capped Todo lane is noise. It is queued rather than parked
because the lane is no longer a mixed backlog — it is this one chain, in order,
and a gated card in a sequenced lane reads as a position rather than as noise.

**This card and `T-024` may turn out to be one decision** — both list legality
without clearing among their candidates, and `C-001` argues that lever moves
supply and the multiplier together. Whichever reaches the decision first records
the `D-`; the other cites it.

The candidates, from `C-001`, ordered by how much they respect the constraint
that the board must not appear to steer the player:

- **Legality without clearing** — the largest change on the table, measured by
  `T-036`. Turns mixing from spending into investment, and makes the move budget
  the only brake.
- **Cascade-earned supply** — a wave seeds a result tile. A rate tied to skilful
  play rather than a timer, but it invents a second role for cascades.
- **A pity floor on mixable material** — seed-only until the board has offered no
  legal mix for N moves, then one drop. The survey's transferable idea: not a
  bag, not the Tetris lineage, and not `I-016`'s weighting toward the dominant
  colour, which does nothing about result-tile scarcity. N is a parameter nobody
  has measured.
- **The combo wave** (`T-012`, gated on `T-031`) — a genuine +N, but it pays on
  every mix regardless of setup, which is the "too easy" half of the problem.

Also settle `C-001`'s open question here, because it belongs to refill and to
nothing else: does the placement filter `generateBoard` already uses belong at
refill time too? Generation is constrained and refill is not — the engine
contains the machinery for controlled placement and does not apply it to the case
that runs hundreds of times per round. Cheap to try, unknown effect on supply,
and measurable on the harness before anyone argues about it.

Two things this card cannot leave open:

- **The refill invariant.** AGENTS.md says refills only ever drop `seed` colours.
  Two candidates preserve it and two require overturning it. Whichever wins, this
  card either reaffirms the invariant explicitly or supersedes it in writing —
  `D-002` put it in scope and left it there.
- **The existing thresholds.** Every stage target was calibrated against the
  starved economy, so a flow makes stages materially easier at unchanged targets.
  This card either re-tunes them or hands `T-025` a re-tuning job it did not have
  before, and says which.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A mechanism is chosen and recorded as a `D-` record, with the numbers
      from `T-031` and `T-036` behind it and the rejected candidates named
- [ ] #2 The mechanism has a rate, expressed as a parameter and overridable per
      stage, per `D-002`
- [ ] #3 It bounds the floor without steering — what it guarantees cannot happen
      is stated, and what it makes happen is not
- [ ] #4 On the harness, the standing non-seed tile count no longer only falls,
      and tertiary clears occur in the stages built to gate on them
- [ ] #5 The refill invariant in AGENTS.md is explicitly reaffirmed or
      superseded
- [ ] #6 Stage thresholds are re-tuned, or the job is handed to `T-025` in
      writing
<!-- AC:END -->
