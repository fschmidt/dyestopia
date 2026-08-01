---
id: T-008
type: task
title: Revise the gravity algorithm
status: Todo
ordinal: 1300
labels: [engine]
---

## Description

Gravity drops tiles down masked columns. On shaped boards — the Diamond's tips,
the Hourglass waist — the current routing produces falls that read as arbitrary.

Worth deciding what the intended behaviour *is* before changing code: strict
per-column fall, or something that routes around gaps.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Intended behaviour written down in the game wiki
- [ ] #2 Existing board tests still pass, or their expectations are consciously updated
<!-- AC:END -->
