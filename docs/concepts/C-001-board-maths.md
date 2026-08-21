---
id: C-001
type: concept
title: The board maths
status: Accepted
tasks: [T-032, T-034, T-035, T-036, T-037, T-038]
---

# The board maths

**Accepted.** The analysis here is agreed: the inventory is the state of the
board, the survey is the prior art, and the result-tile economy is the problem.
What is *not* yet settled is the answer — sections 2 and 3 remain unwritten, and
the decisions this concept owes are listed at the end with the ones that are ripe
marked as such.

The work is now cut into cards. `T-034` writes §2, `T-035` writes §3, `T-036`
measures the mix-legality lever of §4 and `T-037` the two smaller ones beside it,
and `T-038` chooses the supply mechanism `D-002` left open. The evidence they all
stand on is `T-022` and `T-031`, which existed before this concept did.

A concept stays living until the code lands. The decisions it locks become
records in [docs/decisions/](../decisions/index.md) and the implementation is cut
into cards; what the game *does* then moves to the game wiki.

## The problem

The rules exist as a set of functions with their numbers compiled into them.
There is no formula written down anywhere, nothing that can be evaluated on its
own, and almost nothing a stage can vary. Two numbers per stage are tunable —
the score target and the move budget. Everything else is either content or a
literal inside a function.

Balance work done against that state has to be redone every time a constant
becomes a variable. So the variables get named once, and the tuning happens
afterwards.

## The result-tile economy

The sharpest single statement of what is wrong, and the thing the rest of this
document kept gesturing at from three directions without naming.

### The invariant

**The number of non-seed tiles on a board is monotonically non-increasing over a
round.** There is no path that adds one:

- `refill` draws from `stage.seed`, which is `[red, yellow, blue]` in every
  authored stage.
- Cascades clear and refill from the same list, so waves add nothing either.
- `mergeClears` means **no merge can happen without clearing**, so mixing cannot
  leave a result tile standing on purpose.

The opening deal's colour letters are therefore the entire lifetime supply of
every secondary and tertiary a stage plays.

### The arithmetic, which is worse than "nothing replenishes"

Each merge does not merely fail to add supply — it **spends more than it
returns**. `mergeClears` requires two result-coloured tiles already in line, and
`playMove` in [src/round.ts](../../src/round.ts) dyes both participants into the
position it is about to settle:

```
played[from] = played[to] = move.result
```

A teal merge, walked through:

| | Teal | Green | Non-seed total |
| --- | --- | --- | --- |
| Before | 2 in line | 1 (the target or the dragged tile) | **3** |
| Dyed | 4 momentarily | 0 | 4 |
| After the line clears | 1 survivor | 0 | **1** |

Three non-seed tiles in, one out. And if the dragged tile extends the line into a
run of four, `findMatches` takes all of it and the return is zero.

For a tertiary the drain compounds, because the ingredient is itself non-seed:
making teal costs a green *and* a teal, and green cannot be replaced either. The
tertiary is gated behind spending a resource with no source.

Deep Teal deals four greens and four teals. That is the whole budget, scattered
by gravity, against a fourteen-move round. This is why a tertiary clear has never
been observed in play.

### Why the supply question has no right answer as posed

Supply is a **stock** — one quantity, authored once, only depleting. A stock has
to be simultaneously correct at the first move and the last, which no value
achieves: enough to make tertiaries reachable late is enough to make chains
trivial early.

That is not a tuning failure to be solved with a better number. It is the wrong
shape. A **flow** has a rate, and a rate can be scarce-but-renewing. Most of the
too-many-versus-too-few tension dissolves the moment supply regenerates at all,
which is why this concept should choose a mechanism before it chooses a value.

### The conflict underneath

The pitch is *mix to build, swap to cash in*. But a mix must clear to be legal,
so **mixing is cashing in**. The two halves of the pitch are the same action, and
there is no build phase for the multiplier to accumulate across.

This is the same fault `T-024` is chasing from the other side. The multiplier
looks optional and the tertiaries look unreachable for one reason: building and
spending are welded together by `mergeClears`.

### Candidate shapes, none chosen

Ordered by how much they respect the constraint that the board must not appear to
steer the player — see [Prior art §2](#2-how-is-refill-actually-done) on why
bounding the floor reads as fair while placing the useful tile does not.

| Shape | Effect on the economy | Cost |
| --- | --- | --- |
| **Legality without clearing** — a merge is legal, costs a move, and leaves two result tiles standing | −2 becomes +2, and mixing becomes investment | The largest change on the table; removes "earned by setup", and the move budget becomes the only brake |
| **Cascade-earned supply** — a wave seeds a result tile | Rate, tied to skilful play rather than a timer | Cascades currently have no second role, so this invents one |
| **Pity floor on mixable material** — seed-only until the board has offered no legal mix for N moves, then one drop | Rate, with a floor and no steering | A new counter in the engine; N is a parameter nobody has measured |
| ~~**Combo wave**~~ — **rejected, `D-004`** | Genuine +N, and measured as such | Pays on every mix regardless of setup. `T-031` found it lifts the greedy line as fast as the chain line, which is the "too easy" half of the problem confirmed rather than feared |
| **Richer opening deals** | Still a stock | Does not change the shape; postpones the same wall |

A **tool** that relieves the scarcity is deliberately absent from this table. A
tool over a working economy is content; a tool that exists because the economy is
broken is a patch with an interface, and it would make the tray load-bearing for
a fault the engine should not have.

`I-013`'s roguelike mode does not benefit from this fault either — it *masks* it.
A run that hands out supply-fixing passives conceals an economy that is still
broken in every other mode. The correct reading is that roguelike wants a working
base economy whose rate it modulates per run, which is the layered
base-plus-modifier shape [Prior art §6](#6-what-do-roguelikes-and-deck-builders-do)
describes.

### Correction to existing prose

Two places in the repo describe the survivor as the supply and omit what the
merge consumed, which reads as a weakly positive economy rather than a negative
one:

- `T-024` — "each merge nets roughly one surviving result tile"
- [src/stages.ts](../../src/stages.ts) — "Loose result tiles beyond those come
  only from merge survivors"

Both are corrected alongside this section. Neither was wrong about the survivor;
both were silent about the three tiles spent to produce it.

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
| Scoring colour | the colour a tile *ends* as, so merge participants score as the result | `playMove` dyes, [src/round.ts](../../src/round.ts); `resolveCascade` reads, [src/board.ts](../../src/board.ts) | Rule |

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
| Merge scoring order | a merge clears at the chain it *arrived* with; its own result only raises the chain for later moves | `playMove`, [src/round.ts](../../src/round.ts) | Rule |

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
| Illegal drop cost | zero | `playMove`, [src/round.ts](../../src/round.ts) | Rule |
| Stage gating | a merge result must be in the stage's `active` list | `stageMix`, [src/stage.ts](../../src/stage.ts) | Content |

#### The cascade

| Thing | Value today | Where | Call |
| --- | --- | --- | --- |
| Wave multiplier | inherits the move's, and never grows | `resolveCascade`, [src/board.ts](../../src/board.ts) | Rule |
| Wave move cost | zero | `resolveCascade`, [src/board.ts](../../src/board.ts) | Rule |
| Wave cap | none — loops until no line forms | `resolveCascade`, [src/board.ts](../../src/board.ts) | Structural |

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
| `threshold` | 1350 – 5700, deliberately non-monotonic | [src/stages.ts](../../src/stages.ts) | Tunable |
| `moves` | 5 – 18, non-monotonic since `T-044` | [src/stages.ts](../../src/stages.ts) | Tunable |
| `active` | 3 – 8 colours | [src/stages.ts](../../src/stages.ts) | Content |
| `seed` | `[red, yellow, blue]` everywhere | [src/stages.ts](../../src/stages.ts) | Content |
| `board` | mask plus preset letters | [src/stages.ts](../../src/stages.ts) | Content |
| `tools` | free-move counts | [src/stage.ts](../../src/stage.ts) | Content |

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

<!-- pin:src/rng.ts sha=0d7f350803fe -->
<!-- pin:src/board.ts sha=67b90af6a856 -->
<!-- pin:src/round.ts sha=e8201e8cef83 -->
<!-- pin:src/colors.ts sha=8b0cfc592ac7 -->

Scoring, chain growth, cash-in, supply and placement, written against the code
as it stands so they can be read, argued about and evaluated without the game
running. Every formula names the function that computes it, and the modules they
live in are pinned above: change one and the check asks for this
section to be re-read, which is what makes drift between a formula and its code
detectable rather than silent.

The survey settles one shape question here: the industry's unit of account is
**win rate as a function of the move budget**, not score. See
[§5](#5-how-it-gets-tested). Nothing below chooses a value or changes a rule —
where a rule is a branch rather than a number, the baseline is the formula and
the measured alternative (`src/variants.ts`) is named beside it.

#### Notation

| Symbol | Meaning |
| --- | --- |
| `B(i)` | the colour in cell `i`; `∅` when the cell is empty or off the mask |
| `S` | the stage's `seed` list — `[red, yellow, blue]` in all ten authored stages |
| `A` | the stage's `active` list: the colours a merge is allowed to produce |
| `mix(a,b)` | the recipe result, when the pair has one and it is in `A` |
| `tier(c)`, `v(c)` | a colour's mixing depth and a tile's score value |
| `(R, m)` | the colour chain: the distinct results mixed since the last swap, and the multiplier they are worth |
| `M` | the stage's chain ceiling |
| `W₁ … Wₙ` | the waves one move's cascade settles into; each `Wₖ` is a set of cells |

`B[t ← r]` is the board with cell `t` recoloured to `r`; `B[f ↔ t]` is the board
with two cells swapped.

#### The worked round

One hand-authored board, four moves, played by hand below and pinned by
[tests/engine/formulas.spec.ts](../../tests/engine/formulas.spec.ts) so the
numbers cannot quietly stop being true. It is not one of the ten stages: it is
six rows of authored letters, chosen so that every move clears exactly one wave
and the arithmetic stays visible.

```
        col  0 1 2 3 4 5
  row 0      b y r y b r
  row 1      o o y r b b
  row 2      r b y y r b
  row 3      g g b r y y
  row 4      y r b y r y
  row 5      p p r b y r

  active: red yellow blue orange green purple      seed: red yellow blue
  three recipes are live (orange, green, purple), so M = 4
```

1. **Merge.** Drag the red at `(0,2)` onto the yellow at `(1,2)`. It dyes orange
   and completes `o o o` across row 1.
2. **Merge.** Drag the yellow at `(2,2)` onto the blue at `(3,2)` — green,
   completing row 3.
3. **Merge.** Drag the blue at `(4,2)` onto the red at `(5,2)` — purple,
   completing row 5.
4. **Swap.** Swap the red at `(2,4)` with the blue at `(2,5)`, which drops a
   third blue into column 4 and cashes the chain in.

#### Legality — what counts as a move

```
legal_merge(f → t)  ⟺  r = mix(B(f), B(t)) exists  ∧  findMatches(B[t ← r]) ≠ ∅
legal_swap(f, t)    ⟺  findMatches(B[f ↔ t]) ≠ ∅

resolveMove(f → t) = merge r   if adjacent(f,t) ∧ legal_merge(f → t)
                   = swap      else if adjacent(f,t) ∧ legal_swap(f,t)
                   = merge r   else if r exists ∧ mixLegality = 'any-mix'   (variant)
                   = illegal   otherwise

cleared(merge) = findMatches(B[t ← r, f ← r])   ⊇  the board legality was tested on
```

`mergeClears`, `swapClears`, `resolveMove`, `isAdjacent` in
[src/board.ts](../../src/board.ts); the recipe filter is `stageMix` in
[src/stage.ts](../../src/stage.ts). `allowDistant` drops the adjacency term for
the free-move tool and changes nothing else.

**The order-of-operations surprise is in the last line.** Legality is tested on a
strictly smaller change than the one that happens: only the target is dyed for
the test, but both tiles are dyed when the merge goes ahead. Two consequences
fall out of that one asymmetry — the same pair resolves differently in the two
directions, and a dragged tile that lands *in* the line makes the run four long.
In the worked round, dragging the red at `(1,3)` onto the yellow at `(1,2)`
instead of coming from above gives `o o o o`: 80 points rather than 60, and no
surviving orange at all.

#### Scoring

```
tier(c) = 0                                          if c has no recipe
        = min(2, 1 + max(tier of its two ingredients))  otherwise
v(c)    = [15, 20, 30][tier(c)]

points(Wₖ) = ( Σ_{i ∈ Wₖ} v(B(i)) ) × mₖ

mₖ = m           baseline (`cascadeScoring: 'inherit'`)
   = m + (k − 1) variant  (`'escalate'`, T-037)

points(move) = Σₖ points(Wₖ)
```

`colorTier` and `colorValue` in [src/colors.ts](../../src/colors.ts);
`clearScore` and `resolveCascade` in [src/board.ts](../../src/board.ts); the
running total in `playMove`, [src/round.ts](../../src/round.ts).

- **`B(i)` is read after the dye.** `playMove` hands `resolveCascade` a board
  with both merge participants already recoloured, so a yellow tile dyed orange
  scores 20 and not 15, and every tile in a merged line scores at the result's
  value. Move 1 pays `3 × 20 × 1 = 60`, though only two of the three oranges
  were on the board a moment earlier.
- **The multiplier applies to the sum, once per wave.** Tier and multiplier are
  multiplicative and never additive.
- **Every wave of a move is worth the same `m`, and no wave costs a move.**
  Across the ten stages a chain-policy move settles into **3.70 waves on average
  and 75.7% of moves cascade past the first** (200 seeds a stage through
  `playOut`, [src/playout.ts](../../src/playout.ts)). The multiplier is applied
  to roughly three and a half clears, not one: the move is bought and the
  cascade is free.
- **The tier clamp is dead code in practice.** Every tertiary is a primary plus
  a secondary, so no recipe reaches depth 3; `min(2, …)` guards colours nobody
  has authored yet.

#### Chain growth

```
advance((R, m), r) = (R, m)             if r ∈ R    — a repeat pays nothing
                   = (R, m)             if m ≥ M    — and r is not recorded either
                   = (R + r, |R| + 2)   otherwise

m = |R| + 1,   1 ≤ m ≤ M
M = 1 + |{ recipes whose result and both ingredients are in A }|
```

`advanceColorChain` in [src/board.ts](../../src/board.ts); `stageMaxMultiplier`
and `stageMixes` in [src/stage.ts](../../src/stage.ts).

Only a merge advances the chain. A swap breaks it, an illegal drop leaves it
untouched, and a cascade wave — however long — contributes nothing: the chain
counts *moves that mixed*, not clears. Moves 1–3 of the worked round walk it
`1 → 2 → 3 → 4`; a fourth distinct result would not move it, because the cap is
tested before the append and `M = 4` is already reached.

The ceiling is derived from the palette rather than authored: the only way to
raise it is to add a recipe to `A`, which also changes what the board plays.
That welding is `T-035`'s to undo or keep.

#### Cash-in

```
merge:  resolution = ( normal, m, rainbow = M > 1 ∧ m ≥ M )
        m is the chain the merge ARRIVED with          baseline ('after-clear')
        m is the chain after its own result            variant  ('own-clear', T-037)

swap:   m = 1              →  ( normal,                 1,  false )
        1 < m < M          →  ( chain-breaker,         2m,  false )
        1 < m ∧ m ≥ M > 1  →  ( rainbow-chain-breaker, 3m,  true  )

        then, once the whole cascade has scored:  (R, m) ← (∅, 1)
```

`scoreResolutionForMerge`, `scoreResolutionForSwap` and `breakColorChain` in
[src/board.ts](../../src/board.ts), sequenced by `playMove` in
[src/round.ts](../../src/round.ts).

- **A merge clears at the chain it arrived with.** The chain a player builds pays
  out on the move *after* the one that built it. Moves 1–3 score at ×1, ×2 and
  ×3 while leaving the chain at 2, 3 and 4.
- **The ×2 and ×3 bonuses are swap-only.** A merge at the ceiling is worth `M`; a
  swap at the ceiling is worth `3M`. The chain's peak value cannot be realised
  by mixing, only by spending — move 4 is worth ×12 where a fourth merge would
  have been worth ×4.
- **`rainbow` on a merge is a flag, not a bonus.** At the ceiling
  `scoreResolutionForMerge` reports `rainbow: true` with the multiplier
  unchanged; it is what the HUD reads for the ring and the splash colours, and
  it is worth nothing.
- **The chain breaks after the swap's cascade, not before it.** Every wave the
  cash-in sets off is paid at the boosted multiplier, and the next move starts
  at ×1.

The round frame around it, which is where the move budget is spent:

```
movesLeft ← movesLeft − 1   at the top of every legal move, before it resolves
illegal drop, cascade wave, reshuffle:  0 moves
won  ⟺ score ≥ threshold        (checked wave by wave for the celebration,
                                 at settle for the outcome)
lost ⟺ movesLeft ≤ 0 at settle  ∧ not won
```

`playMove`, `settleRound` and `isWon` in [src/round.ts](../../src/round.ts). A
move that wins still costs one, and `endless` suspends the charge entirely.

#### Supply

With `N = |{ i : B(i) ∉ S }|` the non-seed pool — every secondary and tertiary
standing on the board — and `ns(c) = 1` when `c ∉ S`:

```
ΔN(merge f → t producing r) = 2·ns(r) − ns(B(f)) − ns(B(t)) − |{ i ∈ ⋃ₖ Wₖ : B(i) ∉ S }|
ΔN(swap)                    =                               − |{ i ∈ ⋃ₖ Wₖ : B(i) ∉ S }|
ΔN(refill)                  = 0        — `refill` draws from S, and only from S
ΔN(reshuffle)               = 0        — a permutation of the standing tiles
```

The dye is `playMove` (`played[from] = played[to] = move.result`, on the copy it
hands on to the cascade), the clear and the refill are `resolveCascade` and
`refill` in
[src/board.ts](../../src/board.ts), and the count itself is `nonSeedCount` in
[src/playout.ts](../../src/playout.ts), which the harness records per move.

`r` is always non-seed while `S` is the primaries, so the dye term is `+2` and
the cases are:

| Move | ΔN |
| --- | --- |
| Secondary merge, both ingredients seed, clearing a run of three | `2 − 0 − 0 − 3` = **−1** |
| The same merge with the dragged tile in the line, so the run is four | `2 − 0 − 0 − 4` = **−2** |
| Tertiary merge — one ingredient is itself a secondary | `2 − 0 − 1 − 3` = **−2** |
| Swap clearing primaries | **0** |
| Swap clearing a line of three result tiles | **−3** |
| Dry merge under `any-mix`: secondary / tertiary | **+2** / **+1** |

**Every merge is strictly negative, and that is provable rather than observed.**
A legal merge leaves a run of at least three `r`-coloured cells on the board by
definition, and dyeing the dragged tile as well can only lengthen it. Those
cells are non-seed and they clear in the first wave, so `ΔN ≤ 2 − 3 = −1` with
no exception. This sharpens
[the invariant](#the-invariant) from "non-increasing" to "strictly decreasing on
every mix", and it is why the last row is the only positive number in the table
— and why it describes a rule the game does not have.

The worked round runs `6 → 5 → 4 → 3 → 3`: half the board's authored supply
spent in four moves, with the swap costing nothing because it clears primaries.

#### Placement

The deal, `generateBoard` in [src/board.ts](../../src/board.ts):

```
allowed(i) = { c ∈ S : placing c at i completes no run of 3 on the cells placed so far }
B(i) ~ Uniform(allowed(i))   if allowed(i) ≠ ∅
     ~ Uniform(S)            otherwise

then:  while a match exists, repaint every matched non-preset cell ~ Uniform(S)
       (all-preset match → the stage is an authoring error, and it throws)
then:  if no legal move exists, reshuffle
```

Preset letters are laid down first and never repainted (`stagePreset`,
[src/stage.ts](../../src/stage.ts)). The walk is row-major, so on a preset-free
stretch the constraint sees the two cells to the left and the two above; preset
letters to the right or below are already on the board and forbid a colour the
same way.

Measured against the ten stages, 200 deals each: `allowed(i)` was empty **0
times in 98,600 cells** and the repair loop ran **0 times in 2,000 deals**. With
`|S| = 3` a cell can be forbidden at most one colour by its row and one by its
column, so away from presets the fallback cannot fire at all.

The refill, `refill` in [src/board.ts](../../src/board.ts):

```
B(i) ~ Uniform(S)   for every empty cell, independently — no filter, no memory,
                    no adjacency awareness, no bag
```

Same distribution as the deal with the constraint removed, which is
[§1's first finding](#what-the-inventory-turned-up) as a formula. It has a
number too: the deal never leaves a match on the board, while the settle after a
clear leaves one on **75.7% of moves** — falls and refill together, which is
what a settle is, and only one of the two is filtered at all. A named colour lands in a given cell
with probability `1/3`, and three refilled cells in a row come up monochrome
with probability `1/9`.

The reshuffle, `reshuffle` in [src/board.ts](../../src/board.ts):

```
accept ⟺ a legal move exists ∧ no match on the board
120 attempts, each a Fisher–Yates permutation of the standing tiles
degrade:  first attempt with both  →  else first with a legal move  →  else the last
```

#### The worked round, evaluated

Every column is the formula above applied by hand; the spec asserts the same
numbers off `playMove`. Seeded at 3, so no refill happens to make a second wave.

| # | Move | Cleared | `m` | Points | Score | Chain after | `N` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | merge → orange | 3 × orange (20) | ×1 | 60 | 60 | 2 | 5 |
| 2 | merge → green | 3 × green (20) | ×2 | 120 | 180 | 3 | 4 |
| 3 | merge → purple | 3 × purple (20) | ×3 | 180 | 360 | 4 | 3 |
| 4 | swap, rainbow chain breaker | 3 × blue (15) | ×12 | 540 | 900 | 1 | 3 |

Three mixes that spend the board's whole purple, green and orange supply pay
360 between them; the swap that spends the chain pays 540 for three primaries.
Under `mergeScoring: 'own-clear'` the same four moves pay 1080 rather than 900,
because moves 1–3 each clear at the chain they just raised.

#### What the formulas turned up

- **The multiplier already dominates the tier ladder, by an order of magnitude.**
  A tertiary trio is worth `2×` a primary trio (90 against 45); a rainbow cash-in
  is worth `3M`, which is `12×` on a four-recipe stage. `T-024`'s question is not
  how big the multiplier is but how often a board lets a player reach one — and
  `T-025`'s thresholds are set against a curve whose top end is this steep.
- **Anything that moves `m` is worth about 3.7 clears, not one.** Waves are free
  and inherit, so the multiplier multiplies the whole cascade. This is the
  arithmetic behind `T-037`'s finding that `escalate` lifted the greedy win rate
  from 27–72% to 87–98% while barely moving how the bot played.
- **The chain can only be cashed in by spending it.** A merge tops out at `M`, a
  swap at `3M`, and the merge is paid at the chain it arrived with rather than
  the one it just raised. The two bonuses are the only place the chain is ever
  multiplied, and `T-035` inherits them as the cheapest levers on the board.
- **`ΔN ≤ −1` on every merge, provably.** The economy section argued the pool
  was non-increasing; the formula shows every mix is strictly negative and that
  the tertiaries cost two. No value of any parameter changes that while a merge
  must clear to be legal.
- **The deal's placement filter never binds.** Zero empty allowed-sets in 98,600
  cells, and with three seed colours it cannot be empty away from presets. So the
  open question about applying it at refill time is cheaper than it looked: one
  rejected colour per cell at worst, and no fallback path needed. What it would
  do to the 75.7% cascade rate is still unmeasured, and that is `T-038`'s to
  find out.

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

It is also the rule that welds building to spending — see
[The result-tile economy](#the-conflict-underneath). Any variant that lets a
merge resolve without clearing changes the supply economy and the multiplier
problem at the same time, which is the strongest argument for treating this
lever first.

The inventory adds two more of the same kind, both currently invisible to
tuning:

- **Wave multiplier inheritance.** Cascades inherit and never grow. The
  alternative — waves that escalate — is the standard match-3 treatment and is a
  branch here, not a number.
- **Merge scoring order.** A merge clears at the chain it arrived with, so the
  chain a player builds only pays out on *later* moves. Whether the result should
  count toward its own clear is a rule, and it bears directly on `T-024`.

A fourth lever was measured and then removed, and the result is the reason to
take the three above seriously. The combo wave manufactured result tiles: `T-031`
ran all ten stages under three reaches and found it did exactly what this concept
predicted for supply — mixes per move rise, the non-seed pool stops draining —
and nothing whatever for the multiplier problem. The greedy-versus-chain win gap
was flat or narrower on nine stages of ten, and rounds shortened by around 40%
where the wave fired. Manufacturing result tiles was the obvious answer to
[the conflict underneath](#the-conflict-underneath), and it turned out to pay
whoever was already winning, sooner. The wave is gone (`D-004`); the finding is
the argument for spending what is left on mix legality rather than on more
supply.

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
- Comparing two configurations under a fixed policy — a wave off versus on, the
  greedy line versus the chain line — is a relative claim, and a weak but
  *consistent* policy supports it. That is what `T-031` asked for, and it is why
  a greedy bot could settle `D-004`.

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

**Ripe now** — decidable on what this document already contains:

- **Whether supply is a stock or a flow.** It precedes every value question here,
  and the economy section answers it: a stock cannot be right at the first move
  and the last simultaneously. Deciding the *shape* does not require choosing the
  mechanism, so this one does not wait on `T-031`. **Emitted as `D-002`**,
  accepted — supply must regenerate at a tunable rate that bounds the floor
  without steering. The mechanism remains open.
- **The metrics that define a good balance** — win rate as the headline, with an
  explicit statement of what greedy-bot numbers do and do not support. Already
  reflected in `T-022`.

**Blocked on evidence** — these need the harness or its numbers first:

- **The parameter set's boundary** — proposed test: a parameter earns its place
  if the harness can sweep it and report a difference. Depends on `T-022`
  existing at all. Owed by `T-035`.
- **The refill model** — the live candidate is a pity counter over mixable
  supply, not a bag and not the Tetris lineage. Depends on `T-031`. Owed by
  `T-038`, which chooses between it and the other candidates. One candidate is
  already out: the combo wave was measured and removed as **`D-004`**, and the
  reason generalises — a mechanism that only manufactures supply pays the greedy
  player as much as the builder.
- **The treatment of mix legality**, plus the two further rule-shaped levers the
  inventory found (wave multiplier inheritance, merge scoring order). The
  legality lever moves supply and the multiplier together, so it should not be
  decided before both are measured. Measured by `T-036` and `T-037`; decided by
  `T-024` and `T-038` on their numbers. `T-012` decided its own lever and is
  closed — see `D-004`.

## Open questions

- Does the placement filter `generateBoard` already uses belong at refill time
  too? Cheap to try, unknown effect on supply. `T-034` costed the first half:
  the filter never runs out of colours (0 empty allowed-sets in 98,600 dealt
  cells), so applying it at refill needs no fallback path — and the settle it
  would be filtering currently leaves a fresh match on 75.7% of moves.
- Should the chain ceiling be authorable independently of `active`, given they
  are currently welded together?
- Is the greedy-versus-chain gap the right primary metric for `T-024`, or does
  that card need a target expressed as a win rate? `T-036` argues the *win* gap
  is spent: the chain bot already wins 99.5–100% on eight stages of ten, so it
  cannot widen and a flat reading means nothing. The score gap still
  discriminates. Whether the answer is to read the score gap or to raise the
  thresholds (`T-025`) is open.
- Can the harness measure the non-seed pool over a round directly? A per-move
  count of standing result tiles would turn the economy argument above from
  arithmetic into evidence, and it is cheaper than any of the fixes.
- ~~If a merge could resolve without clearing, what stops a player mixing the
  whole board before cashing in once? The move budget alone may not be enough of
  a brake.~~ **Answered by `T-036`: the move budget alone is enough, and it is
  not close.** A bot that mixes at every opportunity under the variant grows the
  non-seed pool by up to +15 tiles a run — `Full Spectrum` from 16.0 standing
  result tiles to 31.4 — and wins between 0.5% and 31% of the time where the
  same bot wins ~99% under the shipped rule. Every dry mix costs a move and pays
  nothing, so hoarding converts the budget straight into tiles it can no longer
  cash in.

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
- **Accepted** — the analysis is agreed. Sections 2 and 3 stay unwritten, and the
  decisions the concept owes are split into the two that are ripe and the three
  that need evidence. `T-022` carries the metrics decision as acceptance
  criteria; the stock-versus-flow decision is owed as a `D-` record.
- **Review, amended** — added [The result-tile economy](#the-result-tile-economy)
  after the inventory made the arithmetic checkable. The non-seed pool is
  monotonically non-increasing and each merge spends three to return one, so the
  supply question has no right answer while supply is a stock. Corrected the two
  places in the repo that described the survivor without the spend. Still no
  value chosen.
- **Cut into cards** — `T-034` through `T-038`. Two of them write the sections
  this document still owes; three make the rule-shaped levers measurable and
  choose the supply mechanism. Still no value chosen and still no gameplay
  changed.
- **The board is sequenced on this concept.** Todo now holds one chain in
  dependency order — `T-022` → `T-031` → `T-036` → `T-037` → `T-034` → `T-035` →
  `T-012` → `T-024` → `T-038` → `T-025` — and everything else is Deferred. Each
  card states what gates it and what it feeds, so the chain is readable from any
  point in it. Six of the ten change nothing a player can see; they exist so the
  other four are decidable.

  One card in the lane is not part of the chain: `T-033` sits second, because
  the engine half of the test suite is what catches a rule quietly ceasing to
  hold, and three cards below it change engine rules. It guards the spine rather
  than belonging to it.
- **Accepted, §4 partly measured** — `T-031` weighed the combo wave and `D-004`
  removed it; `T-036` gave mix legality its second form and measured that. The
  first of the three rule-shaped levers is now evidence rather than argument,
  and one of this concept's open questions is closed by it. Still no value
  chosen and no gameplay changed.
- **§2 written** — `T-034` filled the formulas section against the code as it
  stands: legality, scoring, chain growth, cash-in, supply and placement, each
  naming the functions that compute it, with one hand-authored worked round that
  `tests/engine/formulas.spec.ts` asserts move for move. The three modules it
  describes are pinned, so a rule that changes without this section being
  re-read fails `npm run wiki:check`. Six rows of §1 pointing at `GameScene`
  were corrected — the rules had moved to `playMove` and `resolveCascade`, and
  the inventory had not followed. The formulas sharpen two of this document's
  own claims: the non-seed pool is *strictly* decreasing on every mix rather
  than merely non-increasing, and the multiplier already outweighs the tier
  ladder by an order of magnitude, which reframes `T-024` as a question of
  availability rather than of size. Still no value chosen and no gameplay
  changed.
- **§2 re-read under its own pin** — `T-020` made a position a value, and the
  pins added a card earlier stopped the build until this section had been read
  against the new signatures. The formulas were unchanged by it, which is the
  point: the maths is the same whether the engine edits a board or returns the
  next one. Three lines of prose that described the dye as an edit in place now
  describe it as the copy the cascade is handed.
