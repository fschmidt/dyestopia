---
id: I-028
type: idea
title: Mix without a match
ordinal: 2800
labels: [engine, balance]
---

Let a mix resolve when it clears nothing. Today `mergeClears` requires the dyed target to complete a line, so a merge must clear to be legal and mixing **is** cashing in; drop that and building comes apart from spending, which is what the pitch says the game does.

`T-036` built it as a harness variant and measured it, so this is the only idea on the board with numbers behind it. The supply economy stops draining and on three stages reverses, tertiary clears roughly double, and the greedy bot is untouched because a dry merge pays nothing - so it rewards only the player who builds. It also introduces the first way to lose on purpose: a bot that hoards mixes fills the board and wins 0.5% where it otherwise wins 99%, because every dry mix spends a move and pays nothing.

What it is not is decided. `T-024` owns whether the multiplier problem gets solved this way, and the open question is about people rather than bots - whether over-building reads as depth or as a trap. Also unresolved is whether it ships as the rule, as a per-stage variant, or as a `T-035` parameter; the variant deliberately resolves a dry merge *after* a clearing swap, and shipping any other precedence would take moves away from a player rather than only adding them.
