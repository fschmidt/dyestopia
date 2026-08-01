---
id: T-006
type: task
title: Stages as external descriptors
status: Deferred
ordinal: 300
labels: [stages, M3]
---

## Description

Move stage definitions out of TypeScript into external descriptors so stages can
be authored and tuned without a rebuild.

**Superseded by `T-019`,** which asks the same format question at larger scope.
Fold this card in or close it when that concept lands; do not decide the format
twice.

**Note:** the wiki generator imports stage data directly from `src/`. If stages
move to an external format, `scripts/wiki.ts` has to follow.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Format decided and written down
- [ ] #2 The wiki generator still produces the stage table
<!-- AC:END -->
