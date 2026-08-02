---
id: T-008
type: task
title: Revise the gravity algorithm
status: Deferred
ordinal: 2300
labels: [engine]
---

## Description

Gravity drops tiles down masked columns. On shaped boards — the Diamond's tips,
the Hourglass waist — the current routing produces falls that read as arbitrary.

Worth deciding what the intended behaviour *is* before changing code: strict
per-column fall, or something that routes around gaps.

**Deferred while the `C-001` spine runs.** Gravity is what scatters the result
tiles the supply economy is counted in, so changing how tiles fall while `T-036`
and `T-038` are measuring and then changing that economy would invalidate the
measurements taken either side of it.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Intended behaviour written down in the game wiki
- [ ] #2 Existing board tests still pass, or their expectations are consciously updated
<!-- AC:END -->
