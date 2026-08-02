---
id: T-022
type: task
title: Headless playout harness
status: In Progress
ordinal: 100
labels: [engine, testing]
---

## Description

**Nothing blocks this. It gates the rest of the board.** `T-031`, `T-036`,
`T-037` and `T-035` all need numbers only this card can produce, and the three
decisions behind them — `T-012`, `T-024`, `T-038` — need those numbers. It is
first for that reason alone.

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

**Where it stands.** The seam exists: `resolveCascade` in `src/board.ts` plays a
move's cascade to a standstill and returns it as a list of waves, and `GameScene`
replays them to catch the tiles up. Nothing in the loop waits on a tween, so the
same call can play a round with no screen attached — AC #1 is done.

`tests/match.spec.ts` had kept a hand-copied replay of the loop to predict where
the live game should land, which was precisely the drift warned about above; it
now calls `resolveCascade`, so the prediction and the game cannot diverge.

What remains is the script itself and everything it reports. Note that the round
lifecycle below the cascade — win, loss, reshuffle, the move budget — still lives
in the scene, so the harness needs that much lifted before it can play a whole
round rather than a single move.

The stage targets are currently documented as the output of a simulation that is
not in the repo, so this also restores a claim the codebase already makes about
itself. Restoring it is not the same as vindicating it — see the caveat below.

Two things the harness must report beyond outcomes, both from `C-001`:

**The non-seed tile count per move.** `C-001` argues the pool of secondaries and
tertiaries only ever shrinks, and that each merge spends three to return one.
That is arithmetic, not evidence, and the cells array is already in hand at every
step — so counting is nearly free and settles the argument before anyone builds
a fix for it. It is also `T-031`'s mix-count metric seen from the other side.

**What the numbers mean.** The literature is clear that greedy policies do not
predict human difficulty; automated match-3 playtesting needs MCTS with evolved
utilities or a trained network before its win rates track real players. Our bots
are below that bar by design, which is fine — comparing two configurations under
one fixed policy is a relative claim and holds. Predicting how hard a stage feels
does not. The report has to say so, or the first person to read a win rate off it
will believe the wrong thing.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 The cascade resolves in one place, used by both the game and the harness
- [ ] #2 Runs from the command line over N seeded playouts of any stage
- [ ] #3 At least two policies — one points-chasing, one chain-building
- [ ] #4 Reports win rate and score distribution per stage
- [ ] #5 Reproducible: same seeds in, same numbers out
- [ ] #6 Reports the standing non-seed tile count per move, so the supply
      economy can be measured rather than argued
- [ ] #7 The report states what its numbers do and do not support —
      comparisons between configurations under a fixed policy, not predictions
      of human difficulty
<!-- AC:END -->
