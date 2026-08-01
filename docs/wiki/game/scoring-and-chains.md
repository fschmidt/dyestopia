# Scoring and chains

```
points = Σ (cleared tile values) × effective multiplier
```

Tile value comes from the colour's tier — 15 primary, 20 secondary, 30 tertiary
(see [Colours](colors.md)). Mixed tiles score as their *result* colour, so four
oranges pay `(20 + 20 + 20 + 20) × multiplier`.

Every cascade a move sets off scores at that move's multiplier.

## Move rules

- A legal move costs one move; an illegal drop costs nothing.
- Mixes resolve before swaps.
- Both mixed tiles take the result colour.
- Refills use seed colours only.
- Cascades resolve automatically and cost nothing.
- A board with no legal move reshuffles, free.

## The multiplier ladder

A **Colour Chain** is the run of consecutive mixes since your last swap. What
raises it is *variety*: each new distinct result colour is another step. Mixing
orange twice in a row keeps the chain where it is.

| Action | Effective multiplier | Chain afterward |
|---|---:|---|
| First distinct mix | ×1, then raise to ×2 | Kept |
| Repeated result mix | Current | Kept |
| New result mix | Current, then raise by 1 | Kept |
| Swap at ×1 | ×1 | Reset to ×1 |
| Chain Breaker | Current ×2 | Reset to ×1 |
| Rainbow Chain Breaker | Current ×3 | Reset to ×1 |

The stage maximum is ×1 plus every result colour the stage lets you mix — the
per-stage figures are in [Mixing](mixing.md).

## Cashing in

A swap while a chain is live is a **Chain Breaker**: it scores at double the
current multiplier and resets the chain to ×1. Perform it at the stage's maximum
and it is a **Rainbow Chain Breaker**, worth triple.

That is the whole tension of the game. Every mix you add makes the eventual
break worth more, and every mix you add is a move you did not spend scoring.
Hold too long and the budget runs out with the chain still on the board.

## Worked example

A stage whose only mixable results are orange and purple, so its maximum is ×3.

| Move | Action | Score | Chain afterward |
|---:|---|---:|---:|
| 1 | Swap red and yellow | sum ×1 | ×1 |
| 2 | Mix orange | sum ×1 | ×2 |
| 3 | Mix orange | sum ×2 | ×2 |
| 4 | Swap red and blue — Chain Breaker | sum ×4 | ×1 |
| 5 | Mix purple | sum ×1 | ×2 |
| 6 | Mix orange | sum ×2 | ×3 max |
| 7 | Mix purple | sum ×3 | ×3 max |
| 8 | Swap yellow and blue — Rainbow Chain Breaker | sum ×9 | ×1 |

## Winning and losing

- Reach the target score to win.
- Reaching the target on the final move still wins.
- Run out of moves below the target to lose.
- The last core stage may continue endlessly once its target is met.

Targets are calibrated per board rather than forced to climb: a 300-seed
chain-aware simulation estimates each shape's full-budget score, and the target
takes roughly the larger of 90% of the no-luck ideal and 85% of the simulated
20th percentile, rounded to 50. This is why a later stage can have a *lower*
target than an earlier one — the board is meaner, not the goal softer.
