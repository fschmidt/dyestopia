---
id: T-036
type: task
title: Measure a mix that does not clear
status: Done
ordinal: 300
labels: [engine, testing, balance]
---

## Description

**Blocked on `T-022`, and it wants `T-031`'s figures beside it. Feeds `T-012`,
`T-024` and `T-038`.**

`C-001` §4 names mix legality as the largest single influence on how available
chain play is, and the one lever no parameter can reach, because it is a branch
rather than a value. `mergeClears` requires the dyed target alone to complete a
line, which means **no merge can resolve without clearing** — and that single
rule is what welds building to spending. The pitch is *mix to build, swap to
cash in*, but a mix must clear to be legal, so mixing **is** cashing in.

Give the rule a second form and measure it. A merge that is legal, costs a move,
and leaves two result tiles standing turns the merge arithmetic from −2 into +2,
and it moves the supply economy and the multiplier problem at the same time —
which is `C-001`'s argument for treating this lever before the others.

**Measurement only.** The variant is reachable by the harness, not by a player:
no flag in the game, no stage authored against it, nothing shipped. `T-024`,
`T-012` and `T-038` decide; this card gives them the numbers to decide with, and
they are the numbers none of those three can currently get.

`T-031` belongs beside this card rather than before it, since combo and legality
are two answers to the same scarcity and the interesting number is which one
buys more.

Report, per stage and per policy, against the unchanged rule as the baseline:

- **Win rate**, the headline metric, with `T-022`'s caveat attached — comparing
  two configurations under one fixed policy is a relative claim and holds;
  predicting how hard a stage feels does not.
- **The standing non-seed tile count per move**, which is the direct measure of
  whether the economy stops draining.
- **The greedy-versus-chain gap**, because a variant that raises both lines
  equally has not made building necessary, only made the game easier.
- **Tertiary clears per run.** No tertiary clear has been observed in play. If
  the variant does not produce them, it has not solved the problem it was cut
  for, whatever the win rate says.

And answer `C-001`'s open question, because the numbers can: if a merge can
resolve without clearing, what stops a player mixing the whole board before
cashing in once? The move budget is the only brake today, and it may not be
enough of one. A variant that is unbounded in practice should be reported as
unbounded rather than as a win rate.
---

## What was built

**The axis, generalised.** `T-031` built one of these for the combo wave and
`D-004` deleted it along with the wave, so `src/variants.ts` rebuilds it as the
seam rather than as one rule's private enum: a `RuleSet` names which form of
each branching rule a round is played under, and a `Variant` gives a rule set an
id a table can label and the command line can select. `T-037` adds two entries
to it and writes no machinery. `BASELINE` is the game as it ships and every row
is read against it.

`MixLegality` names the two forms. `must-clear` is `mergeClears` as it stands;
`any-mix` lets a mix that clears nothing resolve anyway. The rule set is carried
on `RoundState`, threaded through `resolveMove`, `findLegalMove`, `legalMoves`
and `reshuffle`, and reaches the harness as `PlayoutOptions.rules`. `GameScene`
asks for nothing, so the game is the baseline by construction rather than by
remembering.

Two decisions inside that are worth more than the plumbing.

**The dry merge goes last, not first.** The obvious edit is to drop the
`mergeClears` condition from step 1 of `resolveMove`, which would make every
mixable pair a merge. That is the wrong variant: a mixable pair that clears *as
a swap* would stop being able to, so the change would both add moves and take
moves away, and no win rate can tell you which of the two you are looking at.
The dry merge is therefore tried after the clearing swap and before the refusal.
The baseline is then a strict subset — every drop legal under `must-clear`
resolves identically under `any-mix` — and the variant speaks only where the
drop was previously refused.

**The deal is held at the baseline.** `generateBoard` takes no `RuleSet` on
purpose. Its legality check decides whether a board is rerolled, a reroll draws
from `rng`, and a rule that accepts boards more easily would therefore deal a
*different opening* from the same seed — every row after it comparing two games
rather than two rules. Holding the deal at the stricter rule hands both forms
the same board and leaves the variant to be measured on what a player may do
with it.

**Two columns and a third bot.** `Dry` counts merges that cleared nothing, which
is zero under the baseline by definition and is the number the supply figures
have to be read against. `Tertiaries` counts tier-2 tiles cleared per run.
`HOARD_POLICY` mixes at every opportunity and cashes in only when it cannot
mix — under the baseline that is nearly the same bot as `chain`, because every
merge clears; under `any-mix` it is `C-001`'s open question made into a bot.

`npm run playout -- --variant=all` plays every stage under both rules.

## What it found

200 playouts per row, seeds 1–200, ten stages × two rules × three policies —
12,000 playouts.

**The supply economy is fixed, and more thoroughly than the combo wave managed.**
Mixes per move under `chain` rise on every stage that mixes at all and converge
on a ceiling around 0.8: `The Hourglass` 0.24 → 0.83, `Amber Glow` 0.34 → 0.79,
`Deep Teal` 0.36 → 0.79, `Royal Purple` 0.55 → 0.79, `Full Spectrum` 0.62 →
0.87. The non-seed drain follows it: `Full Spectrum` −0.63 → −0.00, `Twin Wells`
−0.34 → −0.18, `The Diamond` −0.51 → −0.34. On three stages it goes **positive**
— `Deep Teal` −0.28 → +0.33, `Amber Glow` −0.31 → +0.32, `The Hourglass` −0.33 →
+0.32 — which is the first time anything in this codebase has made the pool
grow. The combo wave's best was −0.20 on a stage this rule takes to −0.00.

**Tertiary clears roughly double where the palette has any.** Under `chain`,
`The Hourglass` 2.3 → 4.0 per run, `Deep Teal` 0.5 → 1.5, `Amber Glow` 0.8 →
1.5, `Full Spectrum` 0.1 → 0.9. The other six stages sit at 0.0 under both
rules, because they author no tertiary recipe to reach.

That comes with a correction to this card's own premise. It asserted that no
tertiary clear has been observed in play; the baseline harness produces them on
four stages, and `The Hourglass` averages 2.3 a run without any variant at all.
The claim was made from watching the game rather than from counting, and the
count disagrees. What is true is the weaker version: tertiaries are rare, and
this variant makes them roughly twice as common.

**The greedy-versus-chain win gap does not widen.** Seven stages of ten are flat
or narrower — `Twin Wells` −3.5 points, `Full Spectrum` −3.0, `The Diamond`
−2.5 — with only `Mixing Lesson` and `The Hourglass` moving the right way at
+1.0. Read on the metric `T-031` used to condemn the combo wave, this variant
fails the same way.

**And that metric has run out of room, which is the most useful thing this run
turned up.** The `chain` bot already wins 99.5–100% on eight of the ten stages
at the baseline. A gap cannot widen when the upper line is at the ceiling, so a
flat Δ win gap on those stages is not evidence that building did not become more
valuable — it is evidence that the win rate stopped measuring anything.

The score gap says the opposite and says it consistently. It widens on **every**
stage: `Full Spectrum` +4702, `Amber Glow` +2350, `Deep Teal` +1755, `Cascade
Lesson` +1284, `Royal Purple` +1203, `The Hourglass` +1081. Under `chain`,
`Full Spectrum`'s mean score goes 8643 → 13245 and `Deep Teal`'s 3454 → 5240,
while the greedy bot barely moves anywhere. That is what "the builder pulled
away" looks like when the win condition is already saturated, and it is the
distinction between this rule and the combo wave, which lifted both lines
together.

**The greedy bot is almost untouched, which is the sanity check.** `points`
mixes 0.02 → 0.03 per move on `Royal Purple` and 0.02 → 0.03 on `Full
Spectrum`, and takes no dry mix anywhere on any stage: a dry merge scores
nothing, so a bot that chases points never picks one. The variant is invisible
to a player who does not build. `First Splash` is identical under both rules
down to the score distribution, because it authors no recipe and never mixes.

### The mix-the-whole-board question, answered

`C-001` asks what stops a player mixing the whole board before cashing in once,
and doubts that the move budget is enough of a brake. It is enough, decisively.

The hoarder does exactly what the question describes. Under `any-mix` it mixes
on literally every move — 1.00 per move on all nine mixing stages — takes 8 to
15 dry mixes a run, and grows the non-seed pool by +9 to +15 tiles net;
`Full Spectrum` goes from 16.0 standing result tiles at the open to 31.4 at the
close, roughly doubling the board's non-seed content.

And it loses.

| Stage | hoard, baseline | hoard, `any-mix` |
| --- | --- | --- |
| `Full Spectrum` | 99.0% | **0.5%** |
| `Amber Glow` | 100.0% | **3.0%** |
| `Royal Purple` | 99.5% | **3.5%** |
| `Cascade Lesson` | 100.0% | **12.5%** |
| `Deep Teal` | 99.5% | **16.0%** |
| `Twin Wells` | 100.0% | **18.0%** |
| `The Hourglass` | 90.0% | **22.5%** |
| `The Diamond` | 99.0% | **30.0%** |
| `Mixing Lesson` | 98.5% | **31.0%** |

So the variant is unbounded in *board state* and hard-bounded in *moves*. Every
dry mix costs one and pays nothing, so hoarding converts the move budget
directly into standing tiles and then has nothing left to cash them in with. The
brake `C-001` doubted is the only one needed, and it is not close.

Worth noting what that does to the shape of the game rather than only to the
numbers: `any-mix` is the first rule measured here that introduces a way to
*lose* on purpose. Under the baseline all three bots win almost everything; under
the variant, over-building is punished. A lever that adds a losing strategy is a
different kind of thing from one that raises every line, which is what both
supply candidates before it did.

### What this means for `T-024`, `T-038` and the board

- **`T-024` should not read the flat win gap as a negative result.** It is the
  same number that condemned the combo wave and it means something different
  here, because the combo wave raised the greedy line and this does not. The
  score gap widens everywhere and the greedy bot is untouched. What `T-024`
  needs before the win gap is worth reading again is headroom — `T-025` ramping
  the sequence, or thresholds that a 100% bot does not clear. Until then the
  greedy-versus-chain *score* gap is the better primary metric, which is one of
  `C-001`'s own open questions answered from the side.
- **`T-038` gains a supply candidate that is not a supply mechanism.** `D-004`
  concluded that manufacturing result tiles pays whoever is already winning. This
  rule manufactures them too, and does not, because the player has to spend a
  move per tile and can overspend. That distinction — supply that costs
  something against supply that is free — is the one worth carrying into the
  mechanism choice.
- **It is not free, and this card does not recommend shipping it.** `Full
  Spectrum`'s `chain` win rate falls 99.5% → 97.0% and the variant adds a
  strategy that loses nine times in ten; whether that is depth or a trap is a
  question about players, not about bots, and neither this harness nor its
  caveat can answer it. `T-024` decides.

The `T-022` caveat applies to every number above: these compare two rules under
a fixed policy, which is a relative claim and holds. None of them predicts how
hard a stage feels.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 A merge that resolves without clearing exists as a variant the harness
      can select, with the current rule as the default and the baseline
- [x] #2 Win rate, non-seed tile count per move, greedy-versus-chain gap and
      tertiary clears per run, reported per stage and per policy for both
- [x] #3 The mix-the-whole-board question is answered with numbers — how far a
      policy that hoards mixes actually gets on the move budget alone
- [x] #4 The numbers are written down where `T-024`, `T-012` and `T-038` can
      cite them
- [x] #5 No gameplay change reaches a player: no flag, no stage, nothing shipped
<!-- AC:END -->
