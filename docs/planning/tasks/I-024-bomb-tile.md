---
id: I-024
type: idea
title: Tile: bomb
ordinal: 2400
labels: [engine]
---

A tile that destroys its neighbours when it is part of a match. Standard match-3 vocabulary and the first board element whose effect is not a line.

Two things specific to this game. Shaped boards mean a blast radius has to follow the mask like every other rule, so the neighbour set is `maskedNeighbours` rather than a square. And a bomb that clears indiscriminately destroys result tiles, which are the scarce thing - so it needs either a rule that spares them or an acceptance that the bomb is a points play the chain player avoids.
