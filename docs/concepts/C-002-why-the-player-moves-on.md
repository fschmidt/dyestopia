---
id: C-002
type: concept
title: Why the player moves on
status: Draft
tasks: []
---

# Why the player moves on

**Draft.** There is no answer here yet, and that is the point of opening the
file. Four items on the board have each walked around this gap separately
without anyone noticing they were walking around the same one. This gives it a
name and an address so the next person to trip over it recognises the shape.

Named for the question rather than the answer, deliberately. *Narrative* would
pre-commit to fiction, and fiction is one candidate among several — mastery,
collection, meta-progression, aesthetic reward and plain completion all answer
the same question, and the genre is full of games that never tell a story.

## The gap

The game knows what it **is**. Someone who picks it up learns the loop in a
minute — mix to build, swap to cash in, before the moves run out — the wiki
describes that loop accurately, and `C-001` is working out whether the maths
underneath it hold.

What the game does not know is why anyone plays the second stage.

Stage 4 follows stage 3 because it is next in the array. The threshold is
higher, the palette is wider, the name is prettier. None of that is a reason;
it is a difficulty curve wearing a reason's clothes. Nothing is promised at the
start, nothing is withheld in the middle, and nothing is paid out at the end.
The one structural gesture the game makes toward an arc — the endless fork — is
a modal on the final stage that asks whether you would like to keep going.

This is survivable for now, and probably for a long while. Ten stages is small
enough that curiosity carries a player to the end, and more content, a roguelike
mode and better feel would all improve the game without touching this. But every
one of those makes the hole bigger rather than smaller, because each adds
somewhere to go without adding a reason to go there.

## What already depends on it

The evidence that this is real is that the board has already routed around it
four times:

- **`T-029` An ending** (Deferred). You cannot acknowledge that someone finished
  without knowing what they were pursuing. This card is the gap wearing a hat —
  it was deferred because the ending is unwritable, not because it is unwanted.
- **`I-027` Unlockables** says so in its own text: *"worth deciding that shape
  before adding the first unlockable, because retrofitting a currency onto a set
  of one-off gates is worse than starting with one."* That is this concept,
  written from inside an idea card.
- **`I-013` Roguelike mode.** Meta-progression *is* progression. A run-based mode
  that hands out tools and passives needs a between-runs layer, and that layer is
  either the same one puzzle mode uses or a second one nobody has reconciled with
  the first.
- **`T-025` Ramp the stage sequence** is in Todo. The difficulty ramp is the
  mechanical half of progression and it is queued to be built without the
  motivational half. Not a blocker — a curve can be tuned on maths alone — but it
  is the last cheap moment to decide whether the sequence is meant to *say*
  anything.

## What is already implied

The game is not a blank page on this. Several things already lean a direction
without anyone having chosen it:

- **The title.** *Dyestopia* is a portmanteau that promises a place — a dystopia
  of dye. It is the strongest thematic claim in the project and nothing
  whatsoever cashes it in.
- **The stage names.** First Splash, Royal Purple, The Diamond, Twin Wells, Deep
  Teal, Amber Glow, The Hourglass, Full Spectrum. Pigment-and-vessel words that
  gesture at a world without committing to one.
- **The catalogue already has a shape.** `src/stage-catalog.ts` sorts stages into
  Tutorial, Core and Tools. That is a three-act structure sitting in the UI
  carrying no meaning at all.
- **The persistence layer is one array of integers.** `src/progress.ts` stores
  cleared stage ids and nothing else. Whatever progression turns out to be, that
  is the size of what exists to build it on — which is a reason to decide the
  shape before it grows a second field.
- **The mechanic is already about something and nobody wrote it down.** This is
  the strongest one. `C-001`'s central finding is that non-seed colour only ever
  drains: refills return primaries, every mix spends more depth than it makes,
  and the board tends back toward raw pigment. A game called *Dyestopia* whose
  governing fact is that colour is scarce, hand-made and constantly reverting is
  *already* saying something. That theme costs nothing to adopt because it does
  not have to be invented, only noticed — and it is the rare case where a
  narrative frame would be describing the engine honestly rather than decorating
  it.

## The axes

Six choices. Most are not ripe; they are here so the shape of the decision is
visible before the first one gets made by accident.

**1. Is there fiction at all?** Four positions: none, flavour text, a framing
device, an actual narrative. The genre proves all four ship. The cost is not
symmetric — flavour is nearly free and a narrative is a second production
discipline the project does not have.

**2. What is the unit of progress?** Stage completion is what exists. The
alternatives are a currency (earned, spent, tunable), mastery grades (per-stage
scores, which the scoring system could already support), or a collection (the
colours themselves are the obvious candidate — a game about making colours that
does not record which ones you have made is leaving the free thing on the table).

**3. Finite or endless?** `T-029` wants an ending. `I-027` and `I-013` want an
indefinite tail. Those are not compatible and nothing on the board acknowledges
the conflict yet. A game finishable in one sitting and a retention structure want
opposite things from every other decision in this list.

**4. Global or per-mode?** The structural one, and the reason `C-003` exists. If
unlocks and progress are global, the modes feed one meta layer and each has to
earn its place in it. If they are per-mode, there are three economies to balance
instead of one.

**5. May progression change play, or only presentation?** `I-027` notes that its
presentation half is nearly free — tile sets, themes and backgrounds are already
independent settings that no engine code reads. Anything that alters the board
is a balance change and lands straight back in `C-001`'s lap, under `D-002`'s
rules.

**6. Who is it for?** A short, complete, finishable thing that respects an
evening, or something built to be returned to. The honest answer changes every
other answer here, and it is a question about the author as much as the player.

## What this concept must emit

Nothing is ripe. Recorded here so the queue is visible:

- **Whether the game carries fiction, and how much.** Blocked on nothing but
  taste — this one could be decided the moment there is an opinion.
- **Whether unlocks may change play or only presentation.** Nearly ripe. It
  bounds `I-027` and it is cheap to hold to.
- **Global versus per-mode progression.** Blocked on `C-003`.
- **Ending versus indefinite tail.** Blocked on the mode question, because the
  answer differs for a ten-stage puzzle game and a roguelike.

When the thinking starts in earnest it likely wants a research card of its own,
the way `T-032` fed `C-001` — a survey of how comparable games answer this,
which is a genuinely well-documented question with far more prior art than the
board maths had.

## The deadline

Not a date. `T-011` — the friends playtest.

The moment the game is handed to someone, "why would I keep going" gets answered
by them whether or not it has been answered here, and their answer is the one
that counts. That is the point by which a first position has to exist, and it is
already on the board as a Deferred card behind `T-018`.

## Open questions

1. Does the colour-drain reading survive `C-001`'s eventual fix? If supply
   becomes a flow, the board stops tending toward primaries — and the theme that
   was free stops being true.
2. Is the tutorial part of the arc or a preface to it? The catalogue treats it as
   a section; a progression scheme has to decide whether it counts.
3. Do the ten authored stages become chapter one of something, or are they the
   whole of what puzzle mode ever is?
4. Is there a version of this where the answer is deliberately *nothing* — no
   meta layer, no unlocks, no fiction, just a good short game — and would that be
   a decision worth recording rather than a failure to decide?

## Status log

- **Draft** — opened because the gap was named in conversation and had nowhere to
  live. Four dependent items identified on the board, six axes listed, no
  position taken on any of them. Sibling to `C-003`, which holds the modes.
