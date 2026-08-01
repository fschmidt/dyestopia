---
id: T-028
type: task
title: Steer a first-timer into the tutorial
status: Deferred
ordinal: 1100
labels: [onboarding]
---

## Description

Nothing routes a new player into the lessons. From a clean save, the tutorial
and the core stages are equally unlocked and PLAY leads to a list of both, so
the default first run can drop someone into the first stage with a one-line hint
and no explanation of mixing at all.

Decide how firm the steer is — the tutorial as the default destination on a
clean save, the core stages gated behind it, or a prompt that can be declined.
Whichever it is, a returning player must not be made to walk past it.

Sequenced after `T-018`, because routing strangers into a tutorial that is about
to be re-cut is the wrong order.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A clean save leads to the tutorial without the player choosing it
- [ ] #2 A player who has cleared it is never sent there again
- [ ] #3 Skipping is possible if the decision allows it, and deliberate if so
<!-- AC:END -->
