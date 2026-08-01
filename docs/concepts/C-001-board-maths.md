---
id: C-001
type: concept
title: The board maths
status: Review
tasks: [T-032]
---

# The board maths

**In review.** This document holds the thinking; it is not documentation. When it
is accepted, the decisions it locks become records in [docs/decisions/](../decisions/index.md),
the implementation is cut into cards, and what the game *does* moves to the game
wiki. Until then nothing here is true.

`T-032` has filled in the survey and the inventory. What follows the inventory is
still open.

## The problem

The rules exist as a set of functions with their numbers compiled into them.
There is no formula written down anywhere, nothing that can be evaluated on its
own, and almost nothing a stage can vary. Two numbers per stage are tunable —
the score target and the move budget. Everything else is either content or a
literal inside a function.

Balance work done against that state has to be redone every time a constant
becomes a variable. So the variables get named once, and the tuning happens
afterwards.

## What has to be answered

### 1. The inventory

Every constant and every rule-shaped decision that governs the board, with its
current value and where it lives.

**Structural** means changing it changes what the game *is*, and it should stay a
constant in code. **Tunable** means a stage could reasonably want a different
value. **Rule** means it is control flow, not a number, and no parameter can
reach it without a code change first. The calls in the last column are arguments,
not conclusions — the contested ones are collected under
[§4](#4-the-rule-shaped-levers).

#### Scoring

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Tile value by tier | 15 / 20 / 30 | `COLOR_VALUE_BY_TIER`, [src/colors.ts](../../src/colors.ts) | Tunable |
| Tier ceiling | 2 — every tertiary and deeper scores 30 | `colorTier`, [src/colors.ts](../../src/colors.ts) | Structural |
| Clear score | `sum(tile values) × multiplier` | `clearScore`, [src/board.ts](../../src/board.ts) | Structural formula, tunable shape |
| Scoring colour | the colour a tile *ends* as, so merge participants score as the result | `resolve`, [src/scenes/GameScene.ts](../../src/scenes/GameScene.ts) | Rule |

#### Chain and multiplier

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Chain growth | distinct results so far, plus one | `advanceColorChain`, [src/board.ts](../../src/board.ts) | Structural formula |
| Chain ceiling | `1 + active recipe count`, derived per stage | `stageMaxMultiplier`, [src/stage.ts](../../src/stage.ts) | Derived — no stage authors it |
| Repeat result | does not advance the chain | `advanceColorChain`, [src/board.ts](../../src/board.ts) | Rule |
| Chain-breaker bonus | ×2 | `scoreResolutionForSwap`, [src/board.ts](../../src/board.ts) | Tunable |
| Rainbow chain-breaker bonus | ×3 | `scoreResolutionForSwap`, [src/board.ts](../../src/board.ts) | Tunable |
| Rainbow condition | chain is at the stage ceiling, and the ceiling is above 1 | `scoreResolutionForMerge/Swap`, [src/board.ts](../../src/board.ts) | Rule |
| Chain reset | any legal swap, after its cascade settles | `breakColorChain`, [src/board.ts](../../src/board.ts) | Rule |
| Merge scoring order | a merge clears at the chain it *arrived* with; its own result only raises the chain for later moves | `handleDrop`, [src/scenes/GameScene.ts](../../src/scenes/GameScene.ts) | Rule |

#### Matching

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Match length | 3 | `findMatches`, [src/board.ts](../../src/board.ts) | Structural |
| Match geometry | straight orthogonal runs, rows then columns; no shapes, no diagonals | `findMatches`, [src/board.ts](../../src/board.ts) | Rule |
| Run breaks | mask gaps and empty cells break a run — matches never jump holes | `findMatches`, [src/board.ts](../../src/board.ts) | Rule |

#### Move legality

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| **Mix legality** | the dyed **target alone** must complete a line — the dragged tile contributes nothing | `mergeClears`, [src/board.ts](../../src/board.ts) | Rule — **the largest single lever** |
| Swap legality | the swap must clear something | `swapClears`, [src/board.ts](../../src/board.ts) | Rule |
| Resolution order | merge is tried before swap | `resolveMove`, [src/board.ts](../../src/board.ts) | Rule |
| Directionality | falls out of mix legality — the same pair can resolve differently each way | `resolveMove`, [src/board.ts](../../src/board.ts) | Rule (emergent) |
| Adjacency | orthogonal only; `allowDistant` already relaxes it for the free-move tool | `isAdjacent`, [src/board.ts](../../src/board.ts) | Rule, with one existing override |
| Illegal drop cost | zero | `handleDrop`, [src/scenes/GameScene.ts](../../src/scenes/GameScene.ts) | Rule |
| Stage gating | a merge result must be in the stage's `active` list | `stageMix`, [src/stage.ts](../../src/stage.ts) | Content |

#### The cascade

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Wave multiplier | inherits the move's, and never grows | `resolve`, [src/scenes/GameScene.ts](../../src/scenes/GameScene.ts) | Rule |
| Wave move cost | zero | `resolve`, [src/scenes/GameScene.ts](../../src/scenes/GameScene.ts) | Rule |
| Wave cap | none — loops until no line forms | `resolve`, [src/scenes/GameScene.ts](../../src/scenes/GameScene.ts) | Structural |

#### Supply and refill — the gap

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Refill draw | uniform pick from `stage.seed` | `refill` → `rngPick`, [src/board.ts](../../src/board.ts) | **Tunable, and the named gap** |
| Refill weighting | none | — | Absent |
| Refill adjacency awareness | none — a refill can and does land beside its own twin | — | Absent |
| Refill history or bag | none — memoryless | `rngPick`, [src/rng.ts](../../src/rng.ts) | Absent |
| Seed list | `[red, yellow, blue]` for all ten authored stages | [src/stages.ts](../../src/stages.ts) | Content, currently uniform across the whole game |
| Result-tile supply | opening-deal letters plus merge survivors, and nothing else | `stagePreset`, [src/stage.ts](../../src/stage.ts) | Consequence, not a parameter |

#### Board generation

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Placement constraint | only colours that would not complete a run of 3 with what is already placed left and above | `generateBoard`, [src/board.ts](../../src/board.ts) | Rule |
| Fallback | when every colour is forbidden, any seed colour, then a post-clear loop | `generateBoard`, [src/board.ts](../../src/board.ts) | Rule |
| Opening guarantees | no match on the board, at least one legal move | `generateBoard`, [src/board.ts](../../src/board.ts) | Rule |
| Preset deal | colour letters in the stage's `board` rows, laid down before the random fill | `stagePreset`, [src/stage.ts](../../src/stage.ts) | Content |
| Board area | 10×10 maximum | `BOARD_AREA`, [src/board.ts](../../src/board.ts) | Structural (layout) |

#### Reshuffle

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Attempt count | 120 | `reshuffle`, [src/board.ts](../../src/board.ts) | Tunable |
| Acceptance | legal move *and* no instant match; degrades to legal-move-only, then to the last attempt | `reshuffle`, [src/board.ts](../../src/board.ts) | Rule |
| Cost | free, and does not end the round | `reshuffle`, [src/board.ts](../../src/board.ts) | Rule |

#### Per stage — everything a stage can vary today

| Thing | Range across the ten stages | Where | Call |
| --- | --- | --- | --- |
| `threshold` | 600 – 5700, deliberately non-monotonic | [src/stages.ts](../../src/stages.ts) | Tunable |
| `moves` | 8 – 18, monotonic | [src/stages.ts](../../src/stages.ts) | Tunable |
| `active` | 3 – 8 colours | [src/stages.ts](../../src/stages.ts) | Content |
| `seed` | `[red, yellow, blue]` everywhere | [src/stages.ts](../../src/stages.ts) | Content |
| `board` | mask plus preset letters | [src/stages.ts](../../src/stages.ts) | Content |
| `tools` | free-move counts | [src/stage.ts](../../src/stage.ts) | Content |

#### The combo prototype, behind `flags.combo`

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Wave shape | flood-fill through connected groups of either ingredient colour | `comboConversions`, [src/board.ts](../../src/board.ts) | Prototype |
| Group size cap | none | `comboConversions`, [src/board.ts](../../src/board.ts) | Prototype — the bounded variant `T-031` should measure |
| Convert-once | each cell converts at most once per wave | `comboConversions`, [src/board.ts](../../src/board.ts) | Rule — the only thing bounding it |
| Colour gating | the wave only ever spreads the merge result, which merge legality has already stage-gated | `comboConversions`, [src/board.ts](../../src/board.ts) | Rule |
| Effect on legality | none — legality is decided before the wave runs | `mergeClears`, [src/board.ts](../../src/board.ts) | Rule |

#### What the inventory turned up

Three things worth stating outright, because they were not obvious before the
list existed:

- **Generation is constrained; refill is not.** `generateBoard` filters its
  candidate colours so no run of 3 is dealt, and retries until the board has a
  legal move. `refill` does neither — it picks uniformly and drops. The engine
  already contains the machinery for controlled placement and simply does not
  apply it to the case that runs hundreds of times per round.
- **The chain ceiling is derived, not authored.** `stageMaxMultiplier` is
  `1 + active recipe count`, so the only way to raise a stage's ceiling today is
  to add a colour to `active` — which also changes what the board plays. Ceiling
  and palette cannot move independently.
- **Two of the numbers `T-024` needs are already parameters.** The chain-breaker
  bonuses (×2 and ×3) are plain literals with no structural role. They are the
  cheapest levers on the multiplier problem and neither `T-024` nor `T-012`
  currently names them.

### 2. The maths, as formulas

Scoring, chain growth, cash-in, supply and placement written so they can be
read, argued about and evaluated without the game running. This is the part that
does not exist at all today, and the reason this is a concept rather than a
refactor.

The survey settles one shape question here: the industry's unit of account is
**win rate as a function of the move budget**, not score. See
[§5](#5-how-it-gets-tested).

### 3. The parameter set

Named parameters with today's behaviour as their defaults, so adopting the set
changes nothing until someone changes a value. Per-stage override, because
varying them per stage is the point.

Open: how far the set goes. The survey did not produce the clean industry line
this section hoped for — see [Prior art §1](#1-where-does-the-line-between-rule-and-parameter-sit).
What it produced instead is a different way to decide: expose what the harness
can search, and leave the rest.

### 4. The rule-shaped levers

The mix-legality rule is the largest single influence on how available chain
play is, and it is unreachable by any parameter because it is a branch, not a
value. At minimum it needs a form in which a variant can be measured. Whether it
becomes a parameter, a strategy, or stays a constant with one alternative is
open.

The inventory adds two more of the same kind, both currently invisible to
tuning:

- **Wave multiplier inheritance.** Cascades inherit and never grow. The
  alternative — waves that escalate — is the standard match-3 treatment and is a
  branch here, not a number.
- **Merge scoring order.** A merge clears at the chain it arrived with, so the
  chain a player builds only pays out on *later* moves. Whether the result should
  count toward its own clear is a rule, and it bears directly on `T-024`.

### 5. How it gets tested

Each formula testable on its own. The parameter set verified against the harness
— same seeds, same numbers, before and after adoption.

The survey answers the metrics question, and it partly contradicts what `T-022`
and `T-031` currently plan. See [Prior art §5](#5-how-is-balance-validated).

### 6. What it has to survive

- A **per-stage difficulty ramp** — a parameter sweep rather than hand-picked
  numbers (`T-025`).
- A **difficulty setting**, if it arrives — the same parameter set chosen a
  second way.
- A **roguelike mode** (`I-013`) — parameters chosen at run time, which is the
  hardest constraint here because it means the set has to be coherent for values
  nobody authored.
- **Declarative stages** (`T-019`) — eventually the stage's parameter block is
  authored in that format, so the two have to agree on shape.

Taking these into account does not mean building for them. It means not choosing
a shape that forecloses them.

## Prior art

The survey `T-032` owed. Six questions, each with what was found and what it
means here. Sources are listed at the end.

### 1. Where does the line between rule and parameter sit?

**Found:** thinner than hoped. The practitioner literature is near-unanimous
advocacy for data-driven design — externalise values so designers can iterate
without programmers — and almost silent on where to stop. The academic
literature approaches the problem from the opposite end and is more useful: it
treats the parameter space itself as the difficulty. Tuning is described as
manual trial and error over a space large enough that "searching it by manually
adjusting feature values is a tedious and expensive process", and the documented
answer is not restraint but **automated search** — active learning over
playtests, N-tuple bandit evolutionary algorithms, metagame autobalancing.

One remark from the practitioner side is worth keeping: if designers feel
overwhelmed by the tuning maths, that usually indicates the design goal is not
defined precisely enough, rather than that there are too many knobs.

**What it means here:** the question "how many parameters is too many" has no
industry answer to borrow, so C-001 should stop looking for one. The workable
substitute is a **capability test**: a parameter earns its place if the harness
can sweep it and report a difference. That reframes the boundary as a
consequence of `T-022` rather than a matter of taste, and it means the parameter
set should not be designed before the harness exists.

The caution about undefined goals lands squarely on `T-024`. "Make the
multiplier necessary" is not yet a measurable target, and no parameter set will
rescue it until it is one.

### 2. How is refill actually done?

**Found:** the Tetris randomiser lineage is the cleanest documented case, and it
runs in three stages.

| Model | Mechanism | Bound |
| --- | --- | --- |
| Memoryless (NES, 1984) | uniform pick, at most a one-piece lookback | unbounded drought; 99th-percentile I-drought around 30–40 pieces |
| History with reroll (TGM, 1998) | keep the last 4 pieces; reroll up to 4 times (TGM1) or 6 (later) if the pick is in the history; accept the repeat if the rerolls run out | no piece absent for longer than 35 |
| 7-bag (Guideline, current) | shuffle one of each of the 7 pieces, deal the bag, refill | maximum drought 12 |

Each step traded variance for predictability, and the stated reason for the last
one was to make the game read as skill-based rather than luck-based.

Alongside that: **pity counters**, the deck-builder treatment of the same
problem. Slay the Spire's card-rarity roll carries a hidden offset that starts at
−5%, rises 1% for every common rolled, resets to −5% when a rare appears, and
caps at +40%. It is a bag in spirit — the longer the scarce thing is absent, the
likelier it becomes — without a fixed cycle length.

And the honest note on difficulty-aware drops: King has stated publicly that
Candy Crush level difficulty ratings come from an automatic script run after
levels have been played for some weeks, not from per-player real-time
adjustment. Player belief that drops are rigged against them is extensively
documented and is not corroborated. The clustering illusion is the standard
explanation — people systematically underpredict how lumpy small random samples
are.

**What it means here — and the borrow does not fit.** Dyestopia's refill is the
1984 model: `rngPick` over `stage.seed`, memoryless, three colours deep. The
obvious move is to fit a bag or a history buffer to it. That would be a mistake,
or at least a much smaller win than it looks, because **drought is not our
problem**. Tetris draws from 7 piece types and the pain is waiting for the one
you need. We draw from 3 seed colours, where drought is nearly impossible — and
the scarce resource, result-coloured tiles, **is not in the draw at all**. No
randomiser over `seed` can supply it.

So the lineage answers a question we do not have. What transfers is the *pity
counter*, and not applied to colours: a counter over how long the board has gone
without offering the player mixable material, raising the chance of whatever
relieves that. That is a real candidate for the supply problem in `T-024`, and
it is a different shape from `I-016`'s weighted refill, which weights toward the
dominant colour and does nothing about result-tile scarcity.

The second thing that transfers is the framing. Every step in the Tetris lineage
was a move away from uniform draws toward bounded ones, for the same stated
reason: uniform *is* fair and does not *feel* fair. We are at the start of that
road, and the invariant that refills only ever drop `seed` colours is what keeps
us there.

### 3. How are clustering and adjacency controlled at generation time?

**Found:** the general technique is constraint propagation over adjacency —
model synthesis and wave function collapse, where each tile type declares which
types may sit beside it and the generator only produces assignments satisfying
every constraint. The lightweight version used widely in practice is spatial
bagging: place one instance of every type across a row or region before allowing
any repeats, which suppresses clumping without any search.

For match-3 specifically, the documented practice is post-generation validation
rather than constrained generation — deal the board, detect matches, redeal the
offenders — and solvability is checked by simulation because exhaustive recursive
search over possible matches is too slow to run per level.

**What it means here:** we are not behind on generation. `generateBoard` already
does constrained placement (filter to colours that would not complete a run of
3), a post-clear loop for the cases the filter cannot satisfy, and a
legal-move guarantee via `reshuffle` — which is the documented match-3 recipe,
implemented. The gap is the asymmetry named in the inventory: **none of it
applies to refill**. Applying the existing placement filter at refill time is a
small change with an unknown effect on supply, and it is exactly the kind of
thing the harness should measure before anyone argues about it.

The adjacency-constraint literature is the right reference if the parameter set
ever wants "how often may a colour land beside itself" as a knob, which C-001
lists as currently inexpressible.

### 4. How is difficulty parameterised across a sequence?

**Found:** hand-authored levels tuned against a projected curve, with the curve
itself deliberately not monotonic. The consistent practitioner description is a
rhythm rather than a ramp — easy wins alternating with spikes, a relief level
after each hard cluster, and new mechanics introduced after the relief rather
than on top of a spike. Playrix describes tuning individual levels chiefly
through the move count and fill rates against a master difficulty curve.

The live-service half matters as much: pass rate is treated as a running metric
per level, not a fixed property, and levels are rebalanced after release against
observed data.

**What it means here:** the non-monotonic thresholds already in
[src/stages.ts](../../src/stages.ts) are not an accident to be tidied up — they
are the documented practice, and `T-025` should not flatten them into a rising
line. What we lack is the *rhythm* being deliberate: right now the shape falls
out of per-board calibration, with no stated intent about which stages are
meant to be relief and which are meant to bite.

The move count being the primary lever is directly reassuring for `T-025`,
because `moves` is one of the two parameters that already exists. The
post-release rebalancing half does not apply — there is no telemetry and no
live audience — which makes the harness the only substitute for a pass-rate
metric, and raises the stakes on `T-022`.

### 5. How is balance validated?

**Found, and this is the survey's most consequential result.**

The metric is **win rate**, and the best-documented model of it is
Socialpoint's: win rate as a **shifted negative binomial** over the move budget,
with two parameters — `r`, the minimum moves needed to win, and `p`, the
probability that a given move is a "good" one. The shift is what lets the model
express an easy level that is won in exactly `r` moves. They report a mean error
of about **1.5 percentage points per move increment** when predicting the effect
of a rebalance, degrading for larger increments, and they fit against a "vanilla
win rate" that excludes attempts using boosters before translating back.

On bots, the literature is less comfortable reading. Mugrai et al. built
automated match-3 playtesting around **Monte Carlo Tree Search agents with
evolved utility functions**, specifically in order to approximate distinct human
playstyles — with vanilla MCTS and a random agent as baselines — and validated
against human play traces. Napolitano needed a **Dueling Deep Q-Network** before
agent results were "in most cases similar with those obtained by real users".

**What it means here, and where it contradicts our plan.** `T-022` proposes two
policies, one points-chasing and one chain-building, both presumably greedy.
That is at or below the *baseline* tier in both papers — the level they compare
against, not the level that produced human-like numbers. Taken at face value it
says our harness will not predict how hard a stage is for a person.

The distinction that rescues it is between **absolute** and **relative** claims:

- Predicting a stage's human win rate — an absolute claim — genuinely needs
  strong agents, and we should not make that claim from greedy bots. The
  simulation-derived thresholds already documented in
  [src/stages.ts](../../src/stages.ts) are exactly this kind of claim and should
  be treated as provisional.
- Comparing two configurations under a fixed policy — combo off versus on, the
  greedy line versus the chain line — is a relative claim, and a weak but
  *consistent* policy supports it. This is what `T-031` actually asks for, so
  `T-031` is sound as written.

Two adjustments follow. `T-022` should report **win rate as its headline metric**
rather than score distribution, because that is the unit everything else in the
field is expressed in and the one `T-025` will need. And both cards should state
plainly that greedy-bot numbers are comparative, not predictive — otherwise the
first person to read a win rate off the harness will believe it means something
it does not.

The greedy-versus-chain gap that `T-031` invents has no direct precedent in the
literature, which measures policies against humans rather than against each
other. That is fine — it is the right metric for our specific question — but it
is ours, and it should be described as ours.

### 6. What do roguelikes and deck-builders do?

**Found:** weighted tables with memory, chosen at run time. Slay the Spire's card
rewards roll against fixed base weights that vary by context — roughly 54/37/9
common/uncommon/rare in shops, richer for elites, all-rare from bosses — layered
with the pity offset described in §2. Rarity weight is a property of the *source*
of the reward, not a global setting, which is how the same table produces
different pacing at different points in a run.

**What it means here:** the transferable idea is not the weights but the
**layering** — a base table that belongs to the context, plus a correction term
that responds to what has recently happened. For `I-013` that is the shape a
run-time parameter set would take: stages contribute base values, the run
contributes modifiers, and neither has to know about the other. It also answers
C-001's hardest survival constraint (§6) more cheaply than expected, because a
layered set stays coherent for value combinations nobody authored as long as the
base table is complete.

The context-dependence point applies right now, though: our `seed` list is
`[red, yellow, blue]` for all ten stages. Every documented comparator varies its
draw table by context, and we vary ours not at all.

## Decisions this concept must emit

Unchanged in shape, sharpened by the survey. Expected:

- **The parameter set's boundary** — proposed test: a parameter earns its place
  if the harness can sweep it and report a difference. Depends on `T-022`.
- **The refill model** — the live candidate is a pity counter over mixable
  supply, not a bag and not the Tetris lineage.
- **The treatment of mix legality**, plus the two further rule-shaped levers the
  inventory found (wave multiplier inheritance, merge scoring order).
- **The metrics that define a good balance** — proposed: win rate as the
  headline, with an explicit statement of what greedy-bot numbers do and do not
  support.

## Open questions

- Does the placement filter `generateBoard` already uses belong at refill time
  too? Cheap to try, unknown effect on supply.
- Should the chain ceiling be authorable independently of `active`, given they
  are currently welded together?
- Is the greedy-versus-chain gap the right primary metric for `T-024`, or does
  that card need a target expressed as a win rate?

## Sources

- [How Tetris Randomizers Work (Bag, 7-Bag, Memoryless)](https://dinogame.gg/blog/how-tetris-randomizers-work/) — Dinogame GG
- [TGM randomizer](https://tetris.wiki/TGM_randomizer) — TetrisWiki
- [Random Generator](https://tetris.fandom.com/wiki/Random_Generator) — Tetris Wiki
- [Clustering illusion](https://en.wikipedia.org/wiki/Clustering_illusion) — Wikipedia
- [Tuning Level Difficulty in Match-3 Games: A Data-Driven Framework](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116) — Socialpoint Analytics
- [Automated Playtesting of Matching Tile Games](https://arxiv.org/abs/1907.06570) — Mugrai, de Mesentier Silva, Holmgård, Togelius, IEEE CoG 2019
- [Testing match-3 video games with Deep Reinforcement Learning](https://arxiv.org/abs/2007.01137) — Napolitano, 2020
- [Improving Conditional Level Generation using Automated Validation in Match-3 Games](https://arxiv.org/abs/2409.06349) — Villanueva Aylagas et al., 2024
- [Automatic Playtesting for Game Parameter Tuning via Active Learning](https://arxiv.org/abs/1908.01417)
- [The N-Tuple Bandit Evolutionary Algorithm for Automatic Game Improvement](https://arxiv.org/abs/1705.01080)
- [Playrix: Creating levels and elements for match-3 games](https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3) — Game World Observer
- [Difficulty](https://candycrush.fandom.com/wiki/Difficulty) — Candy Crush Saga Wiki
- [Card Rewards](https://slay-the-spire.fandom.com/wiki/Card_Rewards) — Slay the Spire Wiki
- [Cards](https://slaythespire.wiki.gg/wiki/Cards) — Slay the Spire Wiki

## Status log

- **Draft** — opened alongside `T-032`, which fills in the research and the
  inventory.
- **Review** — `T-032` delivered the survey and the inventory. Three findings
  change the plan rather than confirm it: the Tetris refill lineage answers a
  problem we do not have, greedy-bot numbers support comparative claims only,
  and the parameter boundary has no industry line to borrow. No value chosen and
  no gameplay changed.
