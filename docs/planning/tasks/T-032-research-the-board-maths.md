---
id: T-032
type: task
title: Research the board maths
status: In Review
ordinal: 300
labels: [engine, balance, research]
---

## Description

The research half of `C-001`. This card produces evidence and an inventory; the
concept holds the thinking, and the implementation cards are cut once it is
accepted. Nothing here changes gameplay.

### The survey — how do others solve this?

Tile-matching games have been tuned by data-driven parameters for two decades
and the failure modes are documented. A day spent reading beats a scheme
invented from first principles. Answer, with sources:

- **Where does the line between rule and parameter sit in practice?** Which
  decisions are conventionally left in code and which are pushed into level
  data — and what goes wrong for teams that push too much into data.
- **How is refill actually done?** Uniform draw, weighted tables, bag or pool
  systems, guaranteed-solvable generation, difficulty-aware drops that watch the
  player's state. Tetris's randomiser lineage — pure random into bag systems —
  is the cleanest documented case of why uniform draws feel wrong, and match-3
  has the same problem over a wider alphabet.
- **How are clustering and adjacency controlled at generation time?** The
  standard techniques for "no immediate match, but a board with moves in it",
  and how near-misses get manufactured deliberately.
- **How is difficulty parameterised across a sequence?** Curves over a parameter
  set versus hand-authored levels, and how a difficulty setting layers on
  without re-authoring everything.
- **How is balance validated?** Simulation with bot policies, how sophisticated
  those bots must be before their numbers mean anything, and which metrics are
  standard. Find out before inventing our own.
- **What do roguelikes and deck-builders do**, since they choose parameters at
  run time — the analogue for `I-013`, and a well-trodden source of
  weighted-table design.

### The inventory

Every constant and every rule-shaped decision governing the board, with its
current value and where it lives. The starting list is in `C-001`; the job is to
make it complete and to be honest about which entries are structural rather than
tunable.

### What this card does not do

Choose any values, design the parameter set, or write code. Those are the
concept and what follows it.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 A written survey of how comparable games parameterise their boards,
      with sources, and a note on what applies here and what does not
- [x] #2 A complete inventory of the constants and rule-shaped decisions, each
      with its current value and location
- [x] #3 Both are folded into `C-001`, which moves to Review
- [x] #4 No gameplay change and no parameter chosen
<!-- AC:END -->
