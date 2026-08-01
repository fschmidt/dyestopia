---
id: D-003
type: decision
title: Progression is per mode, and mode access is the only thing shared
status: Proposed
tasks: []
---

# Progression is per mode, and mode access is the only thing shared

## Context

`C-002` asks why a player moves on; `C-003` asks what they move on into. Both
files list the same question as their structural axis, from opposite sides:
whether progression is one thing the whole game feeds, or one thing per mode.

Everything else in both concepts bends around the answer. A global meta layer
makes every mode a contributor to a single economy, which has to be balanced
across modes that do not resemble each other. Per-mode progression makes each
mode self-contained and multiplies the number of economies instead.

The question could not be deferred much further without being answered by
accident. `I-027` says so in its own text — *"retrofitting a currency onto a set
of one-off gates is worse than starting with one"* — and the first unlockable, in
either direction, is the moment the choice becomes expensive.

## Decision

**Progression is per mode.** Each mode owns its own record of what has been done
and what that earns. There is no shared currency, no cross-mode experience track,
and no single meta layer that every mode feeds.

**Mode access is the one signal that crosses.** A mode may be locked behind
progression made in another mode — concretely, the roguelike is earned by playing
the puzzle sequence rather than offered from the first launch.

So the model has two layers, and naming the second is the substance of this
record. "Per mode" on its own would be false: there is a thin global layer, its
entire content is *which modes are open*, and it is deliberately not allowed to
hold anything else. Without that sentence the decision gets remembered as one
half or the other — either a global currency arrives by drift, or the gate is
forgotten and every mode is open on first launch.

## Alternatives

**One global meta layer.** Rejected. It makes every mode's economy a shared
balance problem, and it generalises the fault `D-002` already refused: a mode
that feeds a global track becomes a place to farm the track, which is the same
shape as a mode masking a defect in the base game. It is also the standard
free-to-play answer, and it is standard because it serves retention rather than
because it serves the player.

**Strictly per mode, no gate at all.** Rejected. Advanced modes should be earned,
and a first-timer meeting three unexplained modes on the menu has a worse first
minute than one who meets the game. The gate costs almost nothing and buys the
whole shape of an opening.

**Defer until the second mode exists.** Rejected on `I-027`'s reasoning above.
The decision is cheap now and expensive later, and it is currently blocking two
concepts from making any further progress.

## Consequences

- **`C-002`'s finite-versus-endless conflict dissolves.** `T-029` wanted an
  ending; `I-013` and `I-027` wanted an indefinite tail. Those were only
  incompatible under a global model. Per mode, the puzzle sequence is finite and
  gets a real ending, the roguelike is the indefinite tail, and both are true at
  once. This was not the point of the decision but it is the largest thing it
  unblocks.
- **`C-003`'s first-timer question is answered.** A new player meets the puzzle
  sequence, because it is the only mode open. `T-028` keeps its meaning rather
  than becoming one branch of a menu problem.
- **`I-027` splits along a seam that now needs watching.** Presentation unlocks
  are global by nature — a theme earned in the puzzle sequence should not vanish
  in the roguelike. So the *award* is per mode while the *wardrobe* is shared.
  That is not a contradiction, but it is exactly where a global currency would
  sneak in. This decision forbids the currency, not the shared wardrobe.
- **The machinery exists one level down already.** Catalog entries carry
  `lockedBy` and `src/progress.ts` resolves it in `catalogStageUnlocked`. Gating a
  mode is the same idea one level up, which makes the gate cheap to build when
  there is a second mode to gate.
- **`src/progress.ts` grows a dimension eventually.** It currently stores one
  array of cleared stage ids. Per-mode progression means per-mode records. Worth
  doing when the second mode exists and not before, but the save format should
  not acquire a global counter in the meantime.
- **What unlocks the roguelike is not decided here** — finishing the core
  sequence, clearing some number of stages, or something else entirely. Nor does
  this record decide whether a given mode has progression at all, or what any of
  it awards.
