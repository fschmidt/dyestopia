# Gameplay

## Terminology

**Board** — The stage’s playable grid of cells.

**Tile** — One coloured piece occupying a cell.

**Primary** — A base colour that cannot be mixed.

**Secondary** — A colour mixed directly from two primaries.

**Tertiary** — A colour mixed from a primary and a secondary.

**Active colours** — Colours allowed by the current stage.

**Seed colours** — Colours that can appear during refill.

**Match** — Three or more identical tiles in a horizontal or vertical line.

**Clear** — Removal of every tile in a match. Overlapping lines count each tile once.

**Legal move** — An adjacent swap or mix that immediately creates a match.

**Swap** — Two adjacent tiles exchange cells.

**Mix** — Two adjacent colours become their recipe’s result colour. Direction matters.

**Gravity** — Tiles fall into empty cells below them.

**Refill** — Empty cells receive new seed-colour tiles.

**Cascade** — A match created automatically by gravity or refill.

**Colour chain** — Consecutive legal mixes since the last legal swap.

**Rainbow chain** - All legal mixes reached within the current chain.

**Chain Breaker** — A swap that cashes in a live colour chain.

**Rainbow Chain Breaker** — A Chain Breaker performed at the stage’s maximum multiplier.

**Combo wave (prototype)** — A mixed colour absorbs connected tiles matching its ingredients.

**Reshuffle** — A free rearrangement when no legal move remains.

## Move rules

- A legal move costs one move.
- An illegal drop costs nothing.
- Mixes resolve before swaps.
- Both mixed tiles take the result colour.
- Refills use seed colours only.
- Cascades resolve automatically and cost nothing.

## Scoring

`points = SUM(cleared tile values) × effective multiplier`

| Colour tier | Tile value |
|---|---:|
| Primary | 15 |
| Secondary | 20 |
| Tertiary | 30 |

Mixed tiles use their result colour’s value. Four oranges score `(20 + 20 + 20 + 20) × multiplier`.

Every cascade caused by a move uses that move’s effective multiplier.

| Action | Effective multiplier | Chain afterward |
|---|---:|---|
| First distinct mix | ×1, then raise to ×2 | Kept |
| Repeated result mix | Current | Kept |
| New result mix | Current, then raise by 1 | Kept |
| Swap at ×1 | ×1 | Reset to ×1 |
| Chain Breaker | Current ×2 | Reset to ×1 |
| Rainbow Chain Breaker | Current ×3 | Reset to ×1 |

The stage maximum is ×1 plus every result colour the stage allows players to mix.

Example stage: orange and purple are its only mixable results, so its maximum is ×3.

| Move | Action | Score | Chain afterward |
|---:|---|---:|---:|
| 1 | Swap red and yellow | Cleared-value sum ×1 | ×1 |
| 2 | Merge orange | Cleared-value sum ×1 | ×2 |
| 3 | Merge orange | Cleared-value sum ×2 | ×2 |
| 4 | Swap red and blue: Chain Breaker | Cleared-value sum ×4 | ×1 |
| 5 | Merge purple | Cleared-value sum ×1 | ×2 |
| 6 | Merge orange | Cleared-value sum ×2 | ×3 maximum |
| 7 | Merge purple | Cleared-value sum ×3 | ×3 maximum |
| 8 | Swap yellow and blue: Rainbow Chain Breaker | Cleared-value sum ×9 | ×1 |


## Stage outcome

- Reach the target score to win.
- Stage 10 may continue with unlimited moves after reaching its target.
- Run out of moves below the target to lose.
- Reaching the target on the final move still wins.
