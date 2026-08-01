---
id: T-027
type: task
title: Orientation, viewport and the missing manifest
status: Todo
ordinal: 1100
labels: [mobile, bug]
---

## Description

Rotating the phone is unhandled, and the code that documents handling it is
dead. Both scenes carry a `relayout` method, and one of them explains in a
comment what rotation is supposed to cost the player — neither is ever called,
and the viewport watcher they refer to does not exist. Turning the phone
letterboxes the portrait canvas into the landscape viewport and shrinks the
board to a fraction of the screen.

There is also no web app manifest, so adding the game to a home screen gets
whatever the browser guesses.

Decide the rotation policy rather than restoring dead code on faith: lock to
portrait, prompt the player to turn back, or genuinely relayout. Then make the
code and the comments agree with the decision.

Fold in the smaller escape-hatch gap while here: on the Lab visual profile the
in-round HUD builds no pause button, and pause is otherwise only reachable by a
key a phone does not have — so a Lab player mid-round cannot reach settings,
the menu, or the recipe list. It is a deliberate opt-in rather than the default,
which is why it is a fold-in and not its own card.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A rotation policy is decided, implemented, and matches what the code
      comments claim
- [ ] #2 No dead relayout path is left behind
- [ ] #3 A web app manifest exists and the home-screen launch looks intentional
- [ ] #4 Pause is reachable on a phone under every visual profile
<!-- AC:END -->
