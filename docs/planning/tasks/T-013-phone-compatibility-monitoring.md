---
id: T-013
type: task
title: Monitor phone behaviour with a simulator
status: Todo
ordinal: 900
labels: [testing, mobile]
---

## Description

Phone issues currently surface by being noticed on a real device. Use a simulator
or equivalent to watch behaviour across viewports rather than catching it by
chance.

Testing on the physical phone works today over Tailscale via `npm run dev:host`.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A repeatable way to check a change across several phone viewports
- [ ] #2 Runs without a physical device in hand
<!-- AC:END -->
