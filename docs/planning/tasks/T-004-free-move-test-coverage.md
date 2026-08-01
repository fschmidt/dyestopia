---
id: T-004
type: task
title: Automated coverage for free-move interactions
status: Todo
ordinal: 300
labels: [tools, testing, M2]
---

## Description

Cover free-move against scoring, chains, cascades, legal-move detection,
reshuffles, animation and stage reset. The tool only relaxes adjacency, so the
value of these tests is proving that nothing *else* changed.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A free move that resolves nothing is illegal and costs neither a move nor a use
- [ ] #2 A use is consumed on resolution, not activation
- [ ] #3 Stage reset restores the full allowance
<!-- AC:END -->
