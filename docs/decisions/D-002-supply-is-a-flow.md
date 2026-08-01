---
id: D-002
type: decision
title: Result-tile supply is a flow, not a stock
status: Proposed
tasks: []
---

# Result-tile supply is a flow, not a stock

## Context

`C-001` established that the number of non-seed tiles on a board is
**monotonically non-increasing** over a round. Three rules combine to guarantee
it: `refill` draws only from `stage.seed`, cascades refill from the same list,
and `mergeClears` means no merge can resolve without clearing. There is no path
that puts a secondary or tertiary tile on the board mid-round.

The opening deal's colour letters are therefore a stage's entire lifetime supply
of every colour above the primaries.

Worse than static, the pool actively drains. A merge requires two result-coloured
tiles already in line, dyes both participants, and clears the completed run — so
three go in and one comes out, and zero if the dragged tile extends the line into
a run of four. For a tertiary the drain compounds, because the ingredient is
itself non-seed: teal costs a green *and* a teal, and neither can be replaced.
Deep Teal deals four of each against a fourteen-move round. No tertiary clear has
been observed in play.

This makes the tuning question unanswerable as posed. Supply is a **stock** — one
quantity, authored once, only depleting — and it has to be simultaneously correct
at the first move and the last. Enough material to make tertiaries reachable late
is enough to make chains trivial early. No value satisfies both, so no amount of
tuning the deal resolves it.

It also blocks `T-024`. The pitch is *mix to build, swap to cash in*, but a mix
must clear to be legal, so mixing **is** cashing in. There is no build phase, and
the multiplier problem and the supply drain turn out to be one fault seen from
two angles.

## Decision

**Result-tile supply must regenerate during a round.** The shape is decided here;
the mechanism is not.

What this commits to:

- Some mechanism either adds non-seed tiles during a round, or stops merges from
  net-consuming them. Which one is open.
- That mechanism has a **rate**, expressible as a parameter and varyable per
  stage, rather than a single authored quantity.
- It bounds the floor without steering the outcome. Guaranteeing that the player
  is never starved of mixable material is in scope; placing the useful tile where
  the player needs it is not. `C-001`'s survey of the Tetris randomiser lineage
  is the precedent — every step of it constrained what *cannot* happen and none
  constrained what *will*, and none of them read as telegraphed.

What this deliberately does not decide: **which** mechanism. `C-001` records five
candidates. Choosing between them needs the numbers from `T-031` and the harness
from `T-022`, and this record should not pre-empt them.

One consequence is large enough to state as part of the decision rather than
below it. The AGENTS.md invariant **"Refills only ever drop `seed` colours"** is
now in scope. It is not overturned here — two of the five candidates (a merge
that resolves without clearing, and the combo wave) preserve it, while two
others (a pity floor on refill, and cascade-seeded supply) require overturning
it. Whichever is chosen, that invariant is no longer settled, and the card that
implements the mechanism must either keep it or supersede this record's silence
with an explicit replacement.

## Alternatives

**Richer opening deals.** Rejected. More letters is a bigger stock, not a flow.
It moves the wall later in the round without removing it, and it makes the early
board more generous in exactly the way that trivialises chain play — the two
halves of the problem get worse together.

**Tune the existing stock harder** — different letter placement, pairs positioned
to survive gravity longer. Rejected for the same reason, and it is what the
current stages already attempt.

**A tool that relieves the scarcity.** Rejected on principle. A tool over a
working economy is content; a tool that exists because the economy is broken is a
patch with an interface. It would make the tool tray load-bearing for a fault the
engine should not have, and it would mean the free-move tool and everything after
it are permanently compensating rather than adding.

**Leave it, and let roguelike mode absorb it** (`I-013`). Rejected. A run that
hands out supply-fixing passives does not benefit from the fault, it *masks* it —
and the fault remains in every other mode, including the ten authored stages that
are the actual MVP. The correct reading is the reverse: roguelike wants a working
base economy whose rate it modulates per run.

**Accept that tertiaries are decorative.** The honest alternative, and the closest
call here: declare the deeper ring a late-game garnish that most players will
never clear, and design the stages around secondaries only. Rejected because four
of the ten authored stages — Deep Teal, Amber Glow, The Hourglass, Full Spectrum
— are named for tertiaries and built to gate on them. Accepting this would mean
rewriting the back half of the game rather than fixing the engine, which is the
larger change of the two.

## Consequences

- `T-024`'s "mix supply" lever is unblocked in principle and still blocked in
  practice, since the mechanism waits on `T-031`.
- The refill invariant is in scope, as stated above. AGENTS.md will need editing
  or explicit reaffirmation once a mechanism is chosen.
- The board maths parameter set (`C-001` §3) must include a supply rate. That is
  now a known member of the set rather than an open question about it.
- **Existing thresholds become suspect.** Every stage target was calibrated
  against the starved economy. Introducing a flow makes stages materially easier
  at unchanged targets, so `T-025` inherits a re-tuning job it did not have
  before — and the simulation those targets came from is the one `T-022` is
  restoring.
- `I-016` (weighted refill toward the dominant colour) is not this. It weights
  the seed draw and does nothing about result-tile scarcity; it should not be
  promoted as though it answers this record.
- `I-013` gets a parameter to modulate instead of a fault to conceal.
- A mechanism card should be cut once `T-031` reports. It is not cut here,
  because a blocked card in a capped Todo lane is noise.
