---
id: I-025
type: idea
title: Passive: raise the odds of higher-tier colours
ordinal: 2500
labels: [passives, engine]
---

A passive that increases the chance of deeper colours appearing. As written it means weighting the refill draw toward non-seed colours, which is a supply mechanism under `D-002` and would break the invariant that refills only ever drop `seed` colours.

That makes it worth splitting rather than building. As a **base mechanic** it is a live candidate for the flow `D-002` requires. As a **passive** it is the thing `D-002` warns about - a roguelike modifier that conceals a base economy which is still broken everywhere else. Distinct from `I-016`, which weights toward the board's dominant colour and does nothing about tier depth.
