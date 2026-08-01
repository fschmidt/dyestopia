---
id: T-022
type: task
title: Headless playout harness
status: Todo
ordinal: 200
labels: [engine, testing]
---

## Description

A script that plays a stage many times without drawing anything and prints the
outcome as a distribution: win rate, score spread, moves used. Bot policies are
swappable, so the same stage can be measured under a player who chases points
and a player who builds the multiplier.

This is the cheap half of `T-020`, carved out and brought forward. It does not
need the full engine split — it needs the cascade loop to exist as a pure
function that returns what happened instead of animating it as it goes. Lift
that loop out of the scene, have the scene animate what it returns, and the
harness becomes a caller.

Do not reimplement the loop inside the script. A second copy will drift from the
one the game runs, and a simulator that does not match the game is worse than
none.

The stage targets are currently documented as the output of a simulation that is
not in the repo, so this also restores a claim the codebase already makes about
itself.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 The cascade resolves in one place, used by both the game and the harness
- [ ] #2 Runs from the command line over N seeded playouts of any stage
- [ ] #3 At least two policies — one points-chasing, one chain-building
- [ ] #4 Reports win rate and score distribution per stage
- [ ] #5 Reproducible: same seeds in, same numbers out
<!-- AC:END -->
