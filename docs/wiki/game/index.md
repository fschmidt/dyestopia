# Dyestopia — game wiki

A mobile-web match-3 where tiles are **pigments**. You drag a tile onto its
neighbour to either line up three of a colour, or pour one colour into another
and make a new one. Mixing consecutive *different* colours builds a multiplier;
a plain swap cashes that multiplier in.

The loop in one line: **mix to build, swap to cash in, before the moves run out.**

## Pages

- [Colours](colors.md) — the pigment wheel, tiers, and tile values
- [Mixing](mixing.md) — the recipe list and the rule that makes a mix legal
- [Scoring and chains](scoring-and-chains.md) — points, the multiplier ladder, Chain Breakers
- [Stages](stages.md) — every stage, its target, budget and palette
- [Tutorials](tutorials.md) — the six lessons and what each one teaches
- [Tools](tools.md) — per-run abilities and the stages that introduce them
- [Glossary](glossary.md) — the canonical terms, as used in the UI

## What a turn looks like

1. You drag a tile onto an orthogonal neighbour.
2. The game tries **mix first, swap second**. If dyeing the target would complete
   a line, both tiles become the result colour. Otherwise, if swapping would
   complete a line, they swap. If neither works the tile returns home and the
   move costs nothing.
3. Matched tiles clear, the survivors fall, and empty cells refill with **seed
   colours only** — usually just the three primaries.
4. Anything the refill happens to line up clears too, as a cascade, at the same
   multiplier as the move that caused it.

Because refills only ever drop seed colours, every secondary and tertiary on the
board beyond a stage's opening deal is something you made.

## Rules that surprise people

- **Direction matters on a mix, not on a swap.** The dragged tile dyes the tile
  it lands on, so red-onto-yellow and yellow-onto-red are different moves.
- **A mix is only legal if it immediately completes a line.** You cannot mix
  purely to make a colour — the new colour must land as the third of a row.
- **A dead board reshuffles for free** and does not cost a move.
- **Illegal drops are free.** Only moves that resolve are charged.
