---
id: T-020
type: task
title: The engine contract as a pure function
status: Done
ordinal: 300
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

---

## Revived, and what is actually left

*The card was deferred with the description above intact; the split it asked for
then arrived sideways. Everything from here is what remains, and the title now
names that rather than the original scope.*

**Half of this card landed under a different one.** `T-022` needed a round it
could play without a screen, and building it did most of the split this card
asked for. What exists today:

- [src/board.ts](../../../src/board.ts) is Phaser-free and works on a matrix:
  `Cells` is row-major over the mask, and `resolveMove`, `resolveCascade`,
  `applyGravity`, `refill`, `generateBoard` and `reshuffle` are functions over
  it.
- [src/round.ts](../../../src/round.ts) is the round as a value — board, score,
  chain, budget, rng, outcome in one `RoundState` — and `playMove` returns a
  `MoveReport`: the ordered recording of cleared, fell, spawned this card asked
  for, produced before anything is drawn.
- [src/scenes/GameScene.ts](../../../src/scenes/GameScene.ts) imports exactly
  `isAdjacent` and `resolveMove` from the engine plus four round functions. No
  scoring, gravity, refill, chain or legality rule is computed in a scene.
  `GameScene.resolve` is tween playback of the recording.
- [src/playout.ts](../../../src/playout.ts) plays whole rounds headless, which
  is the property AC #4 was written to buy.

**What did not land is the contract.** The engine mutates and reports; it does
not take a position and return the next one. `playMove` mutates its
`RoundState`, `resolveCascade` and `applyGravity` and `refill` mutate the
`Cells` they are handed, and the recording is the return value rather than the
state. The header of `round.ts` states this as the design: *the model runs to a
standstill before anything is drawn*. True, and orthogonal to whether the model
is a value.

**The reason it is worth finishing is the `rng`.** `Rng` is a closure over a
mutable integer, so the round's random state is unreachable and unforkable —
and three cards in a row have now hit the same wall because of it:

- `immediateScore` in `src/playout.ts` cannot simulate a cascade to evaluate a
  move, because drawing from `rng` to *evaluate* would change the round being
  *played*.
- `T-037` could not test escalation's own premise for that reason, and cut
  `I-029` to record it.
- `C-001` §5's prior art puts the bar for a bot whose win rates mean anything at
  MCTS or a trained network. Both need to fork a position and throw the fork
  away. Neither is reachable while the rng is a closure.

`mulberry32` holds one uint32. Putting it in the state value is what makes the
state serialisable, comparable, forkable and revalidatable — the four things the
original card listed and the one thing the current shape cannot do.

### The shape

```
applyMove(state, move) -> { state, events }     nothing the caller passed in is touched
```

with the random stream a field of `state` rather than a closure, and the
recording (`waves`, `falls`, `spawns`) derived from the transition rather than
being the transition. `Cells` stays a matrix; the scene stays a consumer of
`events`.

### Blast radius

Nine production call sites — four in `src/round.ts`, three inside
`src/board.ts`, two in `src/playout.ts` — plus three lines of `GameScene` and
the engine specs, which assert on returned values already and mostly change
shape rather than meaning. The browser specs touch `generateBoard` only, which
is non-mutating today.

### What this card decides

- Whether the rng is a counter in the state or a small `{ state }` value passed
  through, and what a fork costs.
- Whether `Cells` becomes readonly at the type level or only by convention.
- Whether `playMove` keeps its name and gains a return, or the round grows a
  second entry point beside it.

None of that changes a rule. **Same seeds, same rounds** is the bar: the
regression net is `C-001` §2's worked round, which pays 900 and must still pay
900, move for move, when this is done.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 The move contract is a pure function — state and move in, next state
      and recording out — and nothing the caller passed in is mutated
- [x] #2 The random stream is part of the state value: serialisable, and
      forkable without disturbing the round it was forked from
- [x] #3 `GameScene` consumes the returned state rather than reading a mutated
      one, and no rule moves into the scene to make that work
- [x] #4 A policy can evaluate a candidate move *including its cascade* against
      a fork, so `I-029`'s obstacle is gone — that idea is then promoted or
      closed on its merits, not on the obstacle
- [x] #5 No gameplay change: same seeds, same rounds, and `C-001` §2's worked
      round still pays 900 move for move
<!-- AC:END -->

---

## What was built

**`src/rng.ts` first, because everything else followed from it.** `Rng` was
`() => number`, a closure over a mutable integer; it is now
`interface Rng { readonly state: number }` with `rngNext`, `rngInt`, `rngPick`
and `rngShuffle` returning `[value, Rng]`. `mulberry32(seed)` kept its name and
returns the stream's first state, so it still reads as a constructor at every
call site. The sequence is untouched — same arithmetic, same order — which is
what let the rest of the refactor be checked against a golden file rather than
argued about.

**`src/board.ts` returns positions.** `Cells` is `readonly`, with a private
`Draft` alias for the mutable form a producer builds and hands back, so the
compiler refuses an edit in place rather than leaving it to review.
`applyGravity` returns `{ cells, moves }`, `refill` and `generateBoard` and
`reshuffle` add `rng` to theirs, and `resolveCascade` returns
`{ cells, waves, rng }` — the settled board beside the recording, where before
it returned only the recording and left the board changed behind it.

**`src/round.ts` returns rounds.** Every field of `RoundState` is readonly.
`playMove` returns `MoveOutcome` — `{ round, report }` — and `settleRound`
returns the settled round beside its `Settlement`. Three named transitions
replace the field pokes the scene used to do: `withOutcome`, `enterEndless` and
`withColorChain`.

**`GameScene` adopts the position where it used to be handed one already
changed.** `this.round = played.round` sits exactly where the mutation used to
land, so every read below it — the HUD mirror, the tile replay, the tutorial
checks — sees what it always saw. That placement is the whole of the scene's
diff besides the three transitions and the two settle sites.

### The one place the old shape hid a decision

`reshuffle` searches up to 121 arrangements and keeps the first acceptable one.
Under a closure the stream advanced once per attempt no matter which arrangement
was kept, so a search that degraded to its fallback still left the round's
randomness 121 shuffles further on. Returning `fallback.rng` — the stream as it
stood when that arrangement was drawn — would have been the natural-looking
translation and would have dealt every later refill differently. It hands back
the stream every attempt drew from instead, and says so in a comment, because
the next person to read it will have the same instinct.

## What it found

**3,000 playouts, byte-identical.** Four rule variants × ten stages × three
policies × 25 seeds, recorded move by move — kind, points, waves, multiplier,
non-seed count, clears, tertiaries, reshuffles — before the refactor and after.
Same SHA on both files. That is AC #5, and it is a stronger statement than the
suite could make: the engine did not merely keep passing its tests, it played
every one of those rounds identically.

**The lookahead `I-029` wanted works, and needed no new API.** Because a round
is a value, `playMove` *is* the fork: play a candidate out in full — cascade,
refills and all — read what it is worth, and drop the result. The round it was
played from is untouched.
[tests/engine/contract.spec.ts](../../../tests/engine/contract.spec.ts) asserts
exactly that, including that a position evaluated over every legal move plays on
identically to one never evaluated at all. The obstacle that idea was written
around is gone; whether the lookahead is worth having is now a question about
bots rather than about the engine.

**A round survives a round trip through JSON**, its random stream included —
`stage`, `grid`, `mix` and `rules` are the fixed frame, and everything a move
changes is data. `T-026` (persist the in-round state) and `T-019`'s
server-revalidation payoff both wanted that and neither could have had it.

**The pins earned their keep on the first change after they were added.**
`T-034` pinned `src/board.ts`, `src/round.ts` and `src/colors.ts` into `C-001`
§2 the day before; this card changed two of them and the build stopped until §2
had been re-read. The formulas were unaffected — the maths does not care whether
the engine edits a board or returns the next one — but three lines describing
the dye as an edit in place were wrong and were corrected. That is the
mechanism working exactly as it was cut to.

## What it did not do

No rule changed, no value moved, no parameter was named and nothing new is
reachable from a stage or a scene. `immediateScore` still evaluates a move on
its immediate clear only: making the bots cascade-aware would change every
measured baseline on the board, and it is `I-029`'s call to make, not this
card's. `plantSeed`/`takeSeed` stay module-level mutable state — they are the
debug bridge into the scene, and what crosses them is a seed, never a stream.
