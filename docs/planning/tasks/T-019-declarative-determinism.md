---
id: T-019
type: task
title: Declarative stages and a determinism model
status: Deferred
ordinal: 200
labels: [stages, engine, decision]
---

## Description

Overhaul the core loop so a stage is a *declaration* rather than a program —
something authored in a notation the way a chess game is authored in PGN, and
replayed identically from that notation alone. Concept first; this card is the
decision, not the implementation.

### The three determinism modes

Stages should be able to declare how much of their randomness is fixed:

1. **Authored.** Every consequence is written down in advance — not just the
   opening deal, but which colour drops into which cell after each clear. The
   board is a predefined funnel, so the same play always produces the same
   sequence. This is what tutorials want: a lesson can promise an outcome.
2. **Seeded.** Ordinary random play, but every draw comes from a named seed, so
   the same seed replays the same stage tile for tile.
3. **Unseeded.** No seed recorded, nothing replayable.

Working assumption to be confirmed: (3) is not worth having. Always seed, and
surface the seed to the player so any stage can be retried, shared or posted as
a challenge.

### What the notation has to carry

- a seed, and which of the modes the stage is in
- an authored drop sequence for mode (1) — per clear, or as one flat queue
- the opening deal, the board shape and which colours are in play
- objectives, beyond "reach N points in M moves"
- tool inventories and whatever later stage-level rules arrive
- versioning, so an old declaration still replays after the rules change

### Why it is worth the churn

Each of these becomes cheap once a stage is data and a run is reproducible, and
stays expensive otherwise:

- **Player-built stages** — authoring is editing a declaration, not shipping code
- **Replay and retry** — a seed is a shareable handle on a specific board
- **Pre-authored tutorials** — see `T-018`; a scripted lesson needs mode (1)
- **Server-side logic** — a server that can replay a run from its declaration
  can validate a score without trusting the client, which is the precondition
  for leaderboards or any competitive mode
- **Tests** — assert against a named stage plus a seed

**Overlaps `T-006` (stages as external descriptors),** which asks the same
format question at smaller scope. Fold it in or close it once this concept
lands, rather than deciding the format twice.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A written concept in the tech wiki covering the notation, the
      determinism modes and the migration path
- [ ] #2 The three modes are decided — which ship, and whether unseeded play
      exists at all
- [ ] #3 The concept says how an authored stage records its drop sequence, and
      how a run is replayed from a declaration alone
- [ ] #4 The concept says what a player sees of the seed and how they reuse it
- [ ] #5 `T-006` is folded in or closed, and follow-up implementation cards are
      cut from the concept
<!-- AC:END -->
