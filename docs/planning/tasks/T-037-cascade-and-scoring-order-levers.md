---
id: T-037
type: task
title: Measure the cascade and scoring-order levers
status: Done
ordinal: 200
labels: [engine, testing, balance]
---

## Description

**Blocked on `T-022`, and it wants `T-036` done first — the switch-and-measure
machinery is the same. Feeds `T-024`.**

The two rule-shaped levers the `C-001` inventory turned up beside mix legality.
Both are branches rather than numbers, so no parameter set reaches them, and both
bear directly on `T-024` — but neither is as large as `T-036`, which is why they
wait behind it rather than beside it.

**Wave multiplier inheritance.** A cascade wave inherits the move's multiplier
and never grows, and waves cost no moves. The alternative — waves that escalate,
which is the standard match-3 treatment — pays a player for setting up a long
cascade rather than merely for the move that started it.

**Merge scoring order.** A merge clears at the chain it *arrived* with; its own
result only raises the chain for later moves. So the chain a player builds pays
out on the move after the one that built it. Whether a merge's result should
count toward its own clear is a rule, and it is one of the cheapest ways to make
the multiplier visible at the moment the player earns it.

Same treatment as `T-036` and for the same reason: each becomes a variant the
harness can select, with today's behaviour as the default and the baseline, and
nothing reaches a player. Report win rate, the greedy-versus-chain gap and score
distribution per stage and per policy, with `T-022`'s comparative-not-predictive
caveat attached.

**The baseline to read those against is `T-044`'s**, which is what
`npm run playout` now prints: the chain policy at 90.5–94.0% across the ten and
a win gap of +18.5 to +66.5 on the eight stages that have one. `T-036` had to
report on the score gap because the win gap was pinned; this card does not, and
should say which of the two each lever moved. Two of the ten rows carry no win
gap at all — `First Splash` runs the policies as one bot, `The Hourglass`
separates them by +0.5 points — so a flat reading on those two is the test set,
not the lever.

These are the two remaining levers `T-024` can reach without touching supply,
which is why they are queued before the decisions rather than after them. They
are also the cheapest cards on the spine: by the time `T-036` has landed, both
are a switch and a run.

---

## What was built

Two more fields on `RuleSet` in [src/variants.ts](../../../src/variants.ts), and
the two entries that select them. `cascadeScoring: 'escalate'` gives wave *i*
`multiplier + i` inside `resolveCascade`; `mergeScoring: 'own-clear'` advances
the chain before scoring the merge rather than after, which in
[src/round.ts](../../../src/round.ts) is the two statements swapping places.
Neither is reachable from the game: `startRound` defaults to `BASELINE_RULES`
and `GameScene` never passes a rule set, which is AC #5 and needed no work.

**Additive escalation rather than multiplicative**, on purpose. Additive hands
the same absolute bonus to a chain of one and a chain of five, so it is the
conservative form — if it reads flat, the multiplicative form is the next thing
to try rather than the conclusion. It did not read flat, so that question did
not arise.

**The greedy bot had to be taught the merge rule.** `immediateScore` evaluates
a merge at `scoreResolutionForMerge(round.colorChain, …)`, which under
`own-clear` is the wrong chain — the round would score the move at the raised
multiplier while the bot valued it at the old one. A bot mis-reading the board
would have shown up in the numbers as though the rule had done it. It now
advances the chain first when the variant asks for it, and the difference is
not small: that one line is most of the finding below.

Cascades are still not simulated when evaluating a move — they need the `rng`,
and drawing from it to evaluate would change the round being played. That limit
is load-bearing for how `escalate` reads, and it is picked up under *What this
could not test*.

Four engine specs, alongside `T-036`'s: the escalation ladder and its
first-wave-unchanged property in `tests/engine/board.spec.ts`, the raised merge
figure and the greedy bot's behaviour change in `tests/engine/playout.spec.ts`.

## What it found

200 playouts per row, seeds 1–200, read against `T-044`'s baseline.

**Both levers collapse the win gap, and neither does it by helping the builder.**
Every stage that had a gap loses most of it — `Full Spectrum` +66.5 → +4.5 under
`escalate` and +1.5 under `own-clear`, `Royal Purple` +64.0 → +4.5 and +2.5,
`Cascade Lesson` +57.5 → +12.5 and +5.5. On the face of it that is the same
verdict twice. It is not: the win rates show the two arriving there by opposite
routes.

| Stage | greedy, base → `escalate` → `own-clear` | chain, base → `escalate` → `own-clear` |
| --- | --- | --- |
| `First Splash` | 91.0% → 100.0% → 91.0% | 91.0% → 100.0% → 91.0% |
| `Mixing Lesson` | 72.0% → 98.0% → 92.5% | 90.5% → 98.5% → 92.5% |
| `Cascade Lesson` | 35.0% → 87.0% → 89.5% | 92.5% → 99.5% → 95.0% |
| `Royal Purple` | 27.0% → 94.5% → 90.5% | 91.0% → 99.0% → 93.0% |
| `The Diamond` | 69.5% → 91.0% → 96.0% | 93.0% → 97.0% → 95.5% |
| `Twin Wells` | 70.0% → 94.0% → 96.0% | 93.0% → 98.0% → 97.0% |
| `Deep Teal` | 68.0% → 97.5% → 94.0% | 93.0% → 99.5% → 95.5% |
| `Amber Glow` | 62.0% → 97.0% → 94.5% | 94.0% → 100.0% → 94.5% |
| `The Hourglass` | 92.0% → 98.0% → 95.0% | 92.5% → 98.5% → 95.5% |
| `Full Spectrum` | 27.0% → 95.5% → 94.0% | 93.5% → 100.0% → 95.5% |

The gap closes from below in both columns. The builder was near 93% and stayed
there; the greedy line was at 27–72% on six stages and is now at 87–96% on all
of them. Nothing made building pay — something made not building stop costing.

### `escalate` pays the same play more

The mixes-per-move column separates the two levers cleanly, and it is the column
`Summary.mixes` was documented for: *a rule that raises the win rate without
raising this has not made chain play any more available, it has only paid better
for the same play.*

| Stage | greedy mixes/move, base → `escalate` → `own-clear` | chain under `own-clear` |
| --- | --- | --- |
| `Mixing Lesson` | 0.12 → 0.16 → **0.35** | 0.36 |
| `Cascade Lesson` | 0.02 → 0.03 → **0.38** | 0.53 |
| `Royal Purple` | 0.02 → 0.02 → **0.30** | 0.41 |
| `The Diamond` | 0.22 → 0.24 → **0.44** | 0.63 |
| `Twin Wells` | 0.19 → 0.21 → **0.41** | 0.55 |
| `Deep Teal` | 0.09 → 0.11 → **0.34** | 0.41 |
| `Amber Glow` | 0.04 → 0.04 → **0.32** | 0.37 |
| `The Hourglass` | 0.15 → 0.21 → **0.24** | 0.25 |
| `Full Spectrum` | 0.02 → 0.03 → **0.40** | 0.68 |

Under `escalate` the greedy bot plays the same round it always played — nine
stages move by 0.00 to 0.06 — and wins it far more often. That is the definition
of a difficulty change, and it is `T-031`'s verdict on the combo wave arriving
again: a lever that lifts every line has not made building necessary, whatever
it did to the score.

**It also re-breaks the instrument.** The chain line goes to 97.0–100.0% on all
ten and reaches the ceiling exactly on `First Splash`, `Amber Glow` and
`Full Spectrum`. `T-044` spent a card getting that line off 99–100% so a change
would have somewhere to register; `escalate` puts it back. Any *further* lever
measured on top of `escalate` would be unreadable without retuning first — which
is a reason to reject it that has nothing to do with what it does to a player.

**And it has a tail that makes the score gap noisy.** Escalation compounds with
cascade length, which is board luck, so the maximum blows out: `Amber Glow`'s
best chain run goes from 38,555 to 313,490 — eight times — while its median goes
from 4,157 to 6,332. `Royal Purple` 43,530 → 101,505, `Full Spectrum` 31,860 →
96,035. A score gap computed on means over a distribution with that tail is
measuring the tail. This is why the escalate rows' score gaps disagree with each
other in sign (`Amber Glow` +2844, `Deep Teal` −644) while the win rates agree:
the score gap has stopped being the better-behaved metric under this variant,
which is the reverse of what `T-036` found.

### `own-clear` deletes the strategy rather than rewarding it

The other column is the finding. Paid for a merge on the merge itself, the
greedy bot *starts mixing* — three to twenty times as often — and lands within a
whisker of the policy that exists to do nothing else. On `Mixing Lesson` the two
bots become the same bot: 92.5% against 92.5%, 0.35 mixes per move against 0.36,
a score gap of −6.5 points on means near 3,500.

This is worth stating carefully, because the lever was proposed as *"one of the
cheapest ways to make the multiplier visible at the moment the player earns it"*
and it does exactly that. The trouble is what visible-immediately means for a
multiplier: the chain stops being a stock that has to be carried across moves and
becomes a flow collected on each one. Carrying it was the whole strategy. A
greedy player does not need to be taught to collect a flow, so removing the
deferral removes the reason building was a separate way to play — not by making
it worse, but by making it the default.

Its score gap narrows on every stage of ten without exception, from −6.5 on
`Mixing Lesson` to −2503.7 on `Full Spectrum`. That unanimity is the difference
between this and `escalate`: one metric collapsing could be an artefact, both
collapsing in the same direction on every row is the lever.

So `own-clear` is not a candidate for `T-024` and should not be re-proposed as
one. It is the clearest example yet of a change that makes the multiplier *more
salient* and the game *less about the multiplier*, and that is worth carrying
forward as a shape rather than as one rejected rule.

### What this could not test

Neither policy simulates cascades — `immediateScore` deliberately does not, and
cannot without disturbing the round's `rng`. So `escalate` was measured on the
cascades that happened anyway, never on a player steering into one, which is the
lever's entire premise: *pays a player for setting up a long cascade rather than
merely for the move that started it*.

The verdict above stands on what was measured — the bot does not change its play
and wins much more — and a cascade-aware bot could only widen the gap from
there, not narrow it. But "escalation rewards setup" is untested rather than
refuted, and the harness cannot test it as built. `I-029` carries that.

`First Splash` and `The Hourglass` remain the two rows with no win gap to move,
for the reasons `T-044` gave: no mixable colour in play on the first, building
barely paying on the second. `escalate` pins both policies at 100.0% on
`First Splash`, which is the single-policy row behaving as a single-policy row.

### What `T-024` should cite

- **Neither lever is a candidate.** Both were queued as the two remaining ways to
  reach the multiplier without touching supply, and both fail the same test the
  combo wave failed. That closes the cheap options: what is left on `T-024`'s
  list is supply, cost and objectives, and the first of those is `T-038`.
- **The greedy line is the number to watch, not the gap.** All three levers
  measured so far — the combo wave, `escalate`, `own-clear` — were caught by the
  greedy win rate rising, and two of them looked defensible on score until that
  column was read. `T-024` AC #3 is already stated as a bar on the greedy line,
  which these three vindicate.
- **`any-mix` is still the only lever that raised the builder's mixes without
  raising the greedy bot's** — 0.02 → 0.03 for greedy on `Full Spectrum` against
  0.64 → 0.88 for chain. It is not a clean result either (`Full Spectrum` chain
  falls to 78.5%), but it is the only one of the four whose effect lands on one
  policy. `T-038` inherits that.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 Escalating cascade waves exist as a harness-selectable variant, with
      inheritance as the default
- [x] #2 A merge result counting toward its own clear exists as a second
      variant, with today's order as the default
- [x] #3 Win rate, greedy-versus-chain gap and score distribution reported per
      stage and per policy, for each variant against the baseline —
      `npm run playout -- --variant=all`
- [x] #4 The numbers are written down where `T-024` can cite them
- [x] #5 No gameplay change reaches a player — `startRound` defaults to
      `BASELINE_RULES` and `GameScene` passes no rule set
<!-- AC:END -->
