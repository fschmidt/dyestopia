---
id: C-001
type: concept
title: The board maths
status: Draft
tasks: [T-032]
---

# The board maths

**Draft.** This document holds the thinking; it is not documentation. When it is
accepted, the decisions it locks become records in [docs/decisions/](../decisions/index.md),
the implementation is cut into cards, and what the game *does* moves to the game
wiki. Until then nothing here is true.

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
current value and where it lives. Research produces this; `T-032` owns it.

Known already, as the starting list: tile value per mixing tier and the tier
ceiling; the chain multiplier as *distinct results plus one*; the cash-in
bonuses; the match length; a stage's maximum multiplier as *one plus the number
of active recipes*; the two tiles a merge converts; the reshuffle attempt count.
As control flow rather than numbers: cascade waves inherit the move's multiplier
and never grow it, and a mix is legal only when the dyed target completes a line
with two result-coloured tiles already in place.

Absent in any form: refill weighting. Refills draw uniformly from the seed list
with no weights, no adjacency awareness, no clustering control. How often a
colour may land beside itself, how much mixable material a board keeps
supplying, how lumpy a deal is — none of these are expressible today.

### 2. The maths, as formulas

Scoring, chain growth, cash-in, supply and placement written so they can be
read, argued about and evaluated without the game running. This is the part that
does not exist at all today, and the reason this is a concept rather than a
refactor.

### 3. The parameter set

Named parameters with today's behaviour as their defaults, so adopting the set
changes nothing until someone changes a value. Per-stage override, because
varying them per stage is the point.

Open: how far the set goes. Every literal is too many — some constants are
genuinely structural and turning them into knobs is how a codebase becomes
unreasonable. The survey should say where others draw this line.

### 4. The rule-shaped levers

The mix-legality rule is the largest single influence on how available chain
play is, and it is unreachable by any parameter because it is a branch, not a
value. At minimum it needs a form in which a variant can be measured. Whether it
becomes a parameter, a strategy, or stays a constant with one alternative is
open.

### 5. How it gets tested

Each formula testable on its own. The parameter set verified against the harness
— same seeds, same numbers, before and after adoption. Beyond that: what metrics
say a parameter set is good, which the survey should answer rather than us
inventing them.

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

Not yet written — this is `T-032`'s first deliverable. It surveys how comparable
games parameterise refill and generation, control clustering, express difficulty
ramps, and validate balance by simulation, with sources. A scheme borrowed with
a reason beats one invented from first principles.

## Decisions this concept must emit

None yet. Expected: the parameter set's boundary, the refill model, the
treatment of mix legality, and the metrics that define a good balance.

## Status log

- **Draft** — opened alongside `T-032`, which fills in the research and the
  inventory.
