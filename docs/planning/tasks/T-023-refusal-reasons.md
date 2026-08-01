---
id: T-023
type: task
title: Say why a drop was refused
status: Todo
ordinal: 500
labels: [feel, onboarding]
---

## Description

Every refused drop currently gets the same answer: both tiles say no and the
tile goes home. But several different rules produce that refusal — the pair has
no recipe, the recipe's result is not active in this stage, the dyed target
would not complete a line, or the two cells are not adjacent. The hardest rule
in the game is the one taught by saying nothing.

Name the reason. The refusal is already the moment the player is paying closest
attention; it is the cheapest teaching surface in the game and it is currently
mute.

Two things to watch. The adjacency refusal is decided before the rules are
consulted, so the reason has to be assembled in more than one place. And the
hint strip is hidden during lessons, so a lesson needs a different surface —
the floating score text is the existing pattern for a transient message.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Each distinct refusal reason produces its own message
- [ ] #2 The reason travels with the refusal from the rules layer, rather than
      being guessed at by the scene
- [ ] #3 It works during a lesson, where the hint strip is not available
- [ ] #4 A refusal still costs nothing
<!-- AC:END -->
