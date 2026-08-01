---
id: I-027
type: idea
title: Unlockables
ordinal: 2700
labels: [progression, visuals]
---

Tile sets, colour themes, backgrounds and visual profiles earned by playing rather than chosen freely in settings.

The presentation half is nearly free. Tile shape, theme, background and visual profile are already independent settings that no engine code reads, so gating them is a matter of deciding what is unlocked and when - not of building anything new to unlock. `src/progress.ts` already tracks what the player has completed.

The real work is the progression system: what earns an unlock, whether it is stage completion or something finer, and whether unlocks are the game's only meta layer or the first of several. Worth deciding that shape before adding the first unlockable, because retrofitting a currency onto a set of one-off gates is worse than starting with one.
