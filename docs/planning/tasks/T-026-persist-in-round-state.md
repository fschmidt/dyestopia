---
id: T-026
type: task
title: Persist the in-round state
status: Todo
ordinal: 900
labels: [engine, mobile]
---

## Description

Only cleared-stage ids survive a reload. A round in progress does not exist
anywhere outside the running scene, so a refresh — or a mobile browser evicting
a backgrounded tab, which happens routinely — drops the player back at the menu
with the board gone.

Cleared progress is safe and a retry costs nothing, so this is not fatal. It is
still a real loss eighteen moves into the last stage, and it will happen to
testers on phones before it happens to anyone else.

The save layer already carries migrations between formats, so adding a slot
follows an established path rather than inventing one.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A reload mid-round resumes the same board, score, chain and moves left
- [ ] #2 A finished or abandoned round leaves nothing behind to resume
- [ ] #3 A save written by an older version still loads
<!-- AC:END -->
