---
id: T-022
type: task
title: Headless playout harness
status: In Review
ordinal: 200
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

`tests/play/match.spec.ts` had kept a hand-copied replay of the loop to predict where
the live game should land, which was precisely the drift warned about above; it
now calls `resolveCascade`, so the prediction and the game cannot diverge.
(That call lived in the combo test, which `D-004` removed along with the wave —
the loss is recorded there and is worth restoring on a non-combo move.)

**The round lifecycle is lifted too.** `src/round.ts` is the layer above the
cascade and equally Phaser-free: `startRound` deals a stage from a seed,
`playMove` plays one drop in full — dye or swap, cascade, score, chain, budget —
and returns a recording, and `settleRound` decides what the settled board means.
`GameScene` now animates that recording instead of deciding anything, so a whole
round can be played with no screen attached. That was the last thing the harness
was waiting on.

Three things the lift turned up, all worth keeping:

- **The scene needs its own replay position.** The model reaches the final score
  before a tile has moved, and a swap's chain has already broken by then. The
  HUD and the debug bridge read a small `shown` snapshot that lags on purpose,
  so the score still climbs a wave at a time and the chain-breaker window is
  still visible. `cells` was always reported settled-ahead; now the reason is
  written down beside it.
- **Winning and settling had to come apart.** The last stage offers unlimited
  play instead of a win screen, and the offer stands while the round is still
  being played — so `isWon` asks without committing and `settleRound` commits.
  A tutorial ends the moment its goal is met, before the stage frame gets a say,
  which is why settling is a second call rather than the tail of `playMove`.
- **One test was synchronising on the model, not the board.** A poll in
  `tests/play/match.spec.ts` waited for "full and match-free", which the lift
  makes true instantly, and then dragged the next move into a board that was
  still animating. It waits for `settled` now. That is `T-039`'s thesis showing
  up on its own before `T-039` has been picked up.

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

## The harness

`src/playout.ts` is the simulator and `scripts/playout.ts` (`npm run playout`)
is the command line and the report. Every move goes through `playMove`, so the
two cannot drift; `legalMoves` in `src/board.ts` is the only rule this card
added, and it is `findLegalMove`'s walk without the early return.

Two policies, both greedy and deliberately so. `points` takes the highest
immediate clear. `chain` prefers a merge whose result the chain does not already
hold, cashes the chain in with a swap once it is at the ceiling, and falls back
to points otherwise — the game as designed to be played.

Cascades are not simulated when *evaluating* a move, only when playing it: a
cascade needs the `rng`, and drawing from it to weigh an option would change the
round the bot is in. So both bots are shallow by construction, which is the
honest version of what they are.

`tests/engine/playout.spec.ts` keeps the claims from rotting — reproducibility
move-for-move, that policies actually differ, and the supply argument below.

## What it found

200 playouts per row, seeds 1–200, over the ten core stages.

**Every stage falls to a greedy bot.** Win rates run 85–100%, the worst being
`Full Spectrum` and `The Hourglass` under `points`. Nothing in the sequence
resists a bot that cannot plan, which is the first real evidence for `T-025`.

**The move budget is nowhere near binding.** `Full Spectrum` allows 18 and is
won in 5.8 under `chain`; `First Splash` allows 8 and is won in 2.9. Rounds end
by crossing the threshold, not by running out — so the budget is currently a
formality rather than a constraint, and tightening it is a lever `T-025` has
that nobody has spent.

**Chain-building strictly dominates.** `chain` beats `points` on score and on
moves in every row, most starkly on `Full Spectrum` — 99.5% against 85%, 8643
against 6228 mean, 5.8 moves against 13.6. Useful for `T-024` in an awkward
direction: the multiplier is already the better strategy, so what that card is
really about is that ignoring it still wins 85% of the time.

**No dead boards.** Zero reshuffles across all 4,000 playouts.

**`C-001`'s supply argument holds.** The standing non-seed pool never grew, in
any playout, on any stage, under either policy — the net column is negative
everywhere except `First Splash`, which authors no secondaries and so sits at
zero throughout. That is the arithmetic `C-001` argued and this card was asked
to settle; it is now an engine test rather than a paragraph, and `T-038` can
treat the shrinking pool as measured rather than assumed.

The caveat the report prints with every run, and the reason AC #7 exists: these
compare configurations under a fixed policy. They do not predict human
difficulty, and a win rate here is not a claim about how hard a stage feels.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 The cascade resolves in one place, used by both the game and the harness
- [x] #2 Runs from the command line over N seeded playouts of any stage
- [x] #3 At least two policies — one points-chasing, one chain-building
- [x] #4 Reports win rate and score distribution per stage
- [x] #5 Reproducible: same seeds in, same numbers out
- [x] #6 Reports the standing non-seed tile count per move, so the supply
      economy can be measured rather than argued
- [x] #7 The report states what its numbers do and do not support —
      comparisons between configurations under a fixed policy, not predictions
      of human difficulty
<!-- AC:END -->
