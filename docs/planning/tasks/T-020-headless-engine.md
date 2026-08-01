---
id: T-020
type: task
title: Separate the rules engine from the game
status: Deferred
ordinal: 100
labels: [engine, decision]
---

## Description

Split the game into a rules engine and a presentation layer, so that a round can
be played without drawing anything. The engine's contract is a single pure
function: hand it a board position and a move, get back the resulting position.
No Phaser, no tweens, no waiting.

Concept and decisions first; the refactor is cut as follow-up cards.

### The shape to aim for

- **The whole game is a value.** Board, score, chain, moves left, tools,
  outcome, rng state — one `GameState` that can be serialised, stored, sent and
  compared. If part of the game lives in a scene field, it is not in the engine.
- **The engine emits events, the scene animates them.** Resolving a move
  produces the outcome plus an ordered list of what happened — cleared, fell,
  spawned, converted — and returns immediately. Animation becomes a consumer of
  that list rather than a step inside the loop that produces it.
- **The engine never waits.** Nothing in it may be timed, tweened or awaited.
  This is the property everything below depends on; without it the model can
  only advance as fast as the screen.

### What it buys

- **Simulation.** Run thousands of playouts headlessly to tune stages —
  `threshold` against `moves` against which colours are active — and read the
  outcome as a distribution instead of setting the numbers by feel. Needs a bot
  policy; a greedy "highest-scoring legal move" is enough to start.
- **Server-side logic, later.** The same pure function plus a seeded run (see
  `T-019`) is what a server needs to revalidate a score without trusting the
  client — the precondition for leaderboards or competitive play. Worth keeping
  the door open, not worth building for yet.
- **Tests that assert on states rather than pixels.**

### Open questions

- Where the boundary falls for lesson rules — a tutorial refuses otherwise-legal
  moves and defines its own win condition, which makes it engine business rather
  than presentation, and overlaps the stage objectives in `T-019`.
- Whether the engine owns the tool effects or only their results.
- What a bot policy has to look like before its numbers mean anything.

Independent of `T-019` — that card decides what a stage *is*, this one decides
what runs it — but they share the determinism payoff, so decide them in view of
each other.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A written concept in the tech wiki: the engine boundary, the state
      value, the event stream, and what stays in the scene
- [ ] #2 The open questions above are answered, in particular where lesson rules
      live
- [ ] #3 A worked example of one move resolving end to end without animation
- [ ] #4 The simulation use is spelled out far enough to know what a harness
      would need
- [ ] #5 Follow-up implementation cards are cut from the concept
<!-- AC:END -->
