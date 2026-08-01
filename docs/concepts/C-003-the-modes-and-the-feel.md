---
id: C-003
type: concept
title: The modes and how the game should feel
status: Draft
tasks: []
---

# The modes and how the game should feel

**Draft.** Sibling to `C-002`. The split is deliberate: `C-002` asks why a
player continues, this one asks what they are continuing *into*. Neither can be
answered alone, and putting them in one file would have produced a document too
large to ever finish.

The premise is different from `C-002`'s, though. There the gap is genuine — no
vision exists. Here a vision exists and is reasonably confident; it is just not
written down anywhere, which is a different failure with the same eventual cost.

## The gap

Three modes beyond the one that exists are proposed on the board, and between
them they run to five sentences:

- **`I-013` Roguelike mode** — *"A run-based mode where enemies interact with
  your board. Interactions are telegraphed and can be countered, so the board
  becomes something to defend as well as score on."*
- **`I-014` Battle mode** — *"Head-to-head play, where your chains affect an
  opponent's board."*
- **`I-015` Chill / endless mode** — *"No target, no move budget - just colour.
  The last core stage already continues past its target, which is a partial
  version of this."*

Those are good sentences. They are not a vision, they are three labels with a
gesture attached, and the reasoning that makes them feel obviously right lives in
one person's head. The wiki cannot hold it — by rule the wiki only describes what
is true now. A card cannot hold it — a card is work, and this outlives the work.
That leaves here.

**The same is true of "feel", which is already a label on the board.** `T-023`,
`T-029` and `T-030` all carry it, and nothing anywhere defines it. It is being
applied by instinct, correctly so far, by the only person who has the instinct.

## What exists today

One mode, which has no name because it has never needed one. Ten stages in
`src/stages.ts`, sorted by `src/stage-catalog.ts` into Tutorial, Core and Tools.
A move budget and a score threshold per stage. Tools introduced by the stages
that teach them. On the final stage only, a fork that offers to continue play
past the target — which is the closest thing to a second mode the game has, and
it is a modal.

Everything the modes would need in order to be modes is deferred:

- **`T-020` Separate the rules engine from the game** (Deferred). `src/board.ts`
  turned out to be Phaser-free already, so this is closer than the card
  suggests — but nothing enforces it and nothing has been built against it.
- **`T-019` Declarative stages and a determinism model** (Deferred). A mode that
  generates its own stages needs stages to be data. So does a roguelike run.
- **`T-006` Stages as external descriptors** (Deferred). Same family.

Three deferred engine cards is not an accident. It is what a mode ambition looks
like before it has been admitted to.

## Why each mode wants to exist

The question each has to answer before it is worth building. Not answered here.

**Roguelike.** What does it do that the puzzle sequence cannot? The candidate
answer is that it makes the board a *contested* object rather than a puzzle
object, and that run variance produces situations no author would write. It is
also, per `D-002`, the mode most at risk of being built for the wrong reason — as
a place where supply-fixing passives paper over a base economy that is broken
everywhere else.

**Battle.** The only proposal on the board that needs a server. Head-to-head is
not a mode, it is a second product: matchmaking, a backend, latency, an
abuse surface, and an ongoing operational cost for a game that currently deploys
as static files to GitHub Pages. That cost has never been stated. It might still
be worth it — but it should be paid knowingly.

**Chill / endless.** The cheapest by a distance, since the fork already exists
and the mode is mostly a matter of removing two constraints. Worth asking what is
left when the move budget goes: the loop's tension comes entirely from scarcity
of moves, so an endless mode is not the same game relaxed, it is a different
activity that shares a board. Whether that activity is good is an open question,
not a given.

## The axes

**1. Which mode is the centre of gravity?** Everything else follows. If the
puzzle sequence is the game and the rest are extras, the ten stages deserve the
polish and the modes can stay thin. If the roguelike is the real game, the
authored stages are a tutorial with ambitions and `T-025`'s ramp matters far
less than it currently looks like it does.

**2. Is the core loop the same everywhere?** Mix to build, swap to cash in. If
every mode keeps that contract intact, the modes are wrappers and the engine work
is bounded. If a mode changes the loop, it is a new game sharing a codebase, and
that should be said out loud before it is built.

**3. What does each mode do to the move budget?** This is where the modes stop
being compatible on paper. `I-015` deletes the budget. `I-022` wants a clock
instead, which the engine has no concept of and which would be the first pressure
in the game that punishes thinking. A roguelike run needs a budget that spans
stages. Three different answers to the same parameter.

**4. Do the modes share one engine?** `T-020`, `T-019` and `T-006` are the price
of yes. The alternative is that the second mode gets built against `GameScene`
and the third one cannot be built at all.

**5. Does a mode's modifier layer mask the base economy?** Already ruled on.
`D-002` rejected letting roguelike mode absorb the supply problem: *"a run that
hands out supply-fixing passives does not benefit from the fault, it masks it."*
That reasoning generalises beyond supply and is probably this concept's first
inherited rule — a mode may modulate the base game, it may not substitute for
fixing it.

**6. Which mode does a first-timer meet?** Currently the puzzle sequence, because
it is the only one. `T-028` is already about steering a first-timer into the
tutorial. Once there is a menu with three entries, that becomes a real design
question rather than a default.

## What "feel" means

Unwritten, and the harder half of this file. What exists is evidence rather than
a definition — the cards labelled `feel` are consistent about something, and it is
worth naming what:

- **Illegal moves are free.** `T-023` wants the game to *say why* a drop was
  refused. Both of those are the same instinct: the game should never punish an
  attempt to understand it.
- **A dead board reshuffles for free.** The game does not blame the player for its
  own randomness.
- **`T-021` treats a silently lost tutorial round as a bug**, not as a difficulty
  setting.
- **`T-030` and `I-017`** want the multiplier to be legible and its payoff to feel
  like something.

Read together that is a game that wants to be generous about *access* and strict
about *scoring* — easy to attempt, hard to do well, never confusing about which
of the two just happened. If that is right it is worth writing as a sentence,
because it settles arguments cheaply and it is the sort of thing that drifts
once more than one person is committing.

## Relationship to the other records

- **`C-001` / `D-002`.** The base economy must work before any mode modulates it.
  `D-002` already refused the reverse.
- **`C-002`.** Axis 4 there and axis 1 here are the same question seen from two
  sides. Whichever is answered first constrains the other.
- **`D-001`.** Why this is a concept rather than a long card, and why nothing in
  here is ever deleted.

## Open questions

1. Is "battle mode needs a server" a reason to drop it, defer it indefinitely, or
   design an asynchronous version that does not?
2. Does the roguelike inherit the ten authored stages, generate its own, or draw
   from a pool that includes them?
3. Is endless mode a mode or a per-stage option? It is currently the latter, on
   one stage, and nobody decided that.
4. Is there a fourth mode implied by the pigment premise that nobody has proposed
   because the three obvious genre modes got there first?

## Status log

- **Draft** — opened alongside `C-002`. The modes vision is believed to be sound
  and is recorded here as a set of questions rather than as the answers, because
  the answers currently exist only in conversation. No mode is endorsed and no
  card is cut.
