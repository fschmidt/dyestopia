---
id: T-017
type: task
title: Module map misses most header comments
status: Deferred
ordinal: 1000
labels: [docs, tooling]
---

## Description

The module map in [architecture.md](../../wiki/tech/architecture.md) shows `—`
for 30 of 37 modules, which reads as "undocumented". 25 of them do have a header
comment. `headerSummary` in [wiki.ts](../../../scripts/wiki.ts) only matches a
block comment at the very start of a file, so every module whose imports come
first is missed — `src/board.ts` among them.

Either widen the generator to look past the imports, or move the headers above
them and write the placement rule down. The first is cheaper but will sometimes
pick up a declaration's doc comment instead of the module's.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Every module with a header comment shows a real one-liner
- [ ] #2 conventions.md states where a header comment must sit to be picked up
- [ ] #3 A module with no header comment still renders `—`
<!-- AC:END -->
