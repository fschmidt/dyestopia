---
id: T-006
type: task
title: Stages as external descriptors
status: Todo
ordinal: 500
labels: [stages, M3]
---

## Description

Move stage definitions out of TypeScript into external descriptors so stages can
be authored and tuned without a rebuild.

Still partly undecided — the prerequisites in the old roadmap were marked TBD.
Worth settling the format question before starting.

**Note:** the wiki generator imports stage data directly from `src/`. If stages
move to an external format, `scripts/wiki.ts` has to follow.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Format decided and written down
- [ ] #2 The wiki generator still produces the stage table
<!-- AC:END -->
