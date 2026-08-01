---
id: T-012
type: task
title: Resolve the combo spike
status: Deferred
ordinal: 200
labels: [engine, decision]
---

## Description

The flood-fill combo wave sits behind the `?combo` flag: a mixed colour absorbs
connected groups of its ingredients. Ship it, revise it, or remove it — the MVP
should have one intentional mixing model, not two.

Deferred rather than queued because it is a design decision waiting on playtest
evidence (T-011), not work waiting on time.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A decision is recorded with its reasoning
- [ ] #2 If dropped, the flag and its code are removed rather than left dormant
<!-- AC:END -->
