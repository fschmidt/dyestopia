---
id: D-004
type: decision
title: The combo wave is removed
status: Accepted
tasks: [T-012]
---

# The combo wave is removed

## Context

The flood-fill combo wave was a spike: after a legal mix, the fresh colour
absorbed connected groups of either ingredient, and freshly absorbed tiles kept
the wave rolling. It lived behind `?combo`, off by default, and it was a
candidate answer to two problems at once.

The first is the supply economy `C-001` and `D-002` describe. Refills only ever
drop `seed` colours and a merge spends three tiles to return one, so the pool of
result-coloured tiles can only shrink over a round. Combo was the one mechanism
in the codebase that manufactured result tiles faster than one per merge.

The second is the multiplier problem `T-024` names: chain-building is the better
strategy, but ignoring it still wins most of the time, so the multiplier is
optional rather than necessary. If mixes were supply-starved, manufacturing
result tiles would make chain play more available and the builder would pull
away from the greedy player.

`T-031` measured both, over 12,000 playouts — ten stages, two policies, three
wave reaches: off, the full flood fill, and a bounded variant converting only
the ingredients the merge already touched. The numbers are in that card.

**The supply half worked.** Mixes per move rose on every stage that mixes at all
and the non-seed pool stopped draining — `Full Spectrum` went from −0.63 tiles
per move to −0.20, `Royal Purple` from −0.42 to −0.01.

**The multiplier half did the opposite of what was wanted.** The
greedy-versus-chain win gap was flat or *narrower* under the wave on nine stages
of ten. `Twin Wells` states it cleanly: the wave took the greedy bot from 94.0%
to 98.5% and the builder from 99.0% to 100.0%. `The Hourglass` went from a
one-point gap to none at all. Rounds also shortened by around 40% where the wave
fired, on a move budget `T-022` had already shown was not binding.

The wave paid whoever was already winning, sooner.

## Decision

**The combo wave is removed from the codebase, not left dormant behind a flag.**
`comboConversions`, `Conversion`, the conversions carried on a move report, the
scene's ripple animation and `Tile.convert` are gone. The prototype-toggle
module `flags.ts` and `dyestopia.combo()` are gone with it, because the wave was
the only thing either of them existed for.

The measurement's *reporting* stays: mixes per run, the per-move rates, and
`policyGap`. Those were built to weigh this wave and they outlive it, because
`T-036` and `T-037` weigh their variants the same way.

This resolves `T-012`, which asked for exactly this shape of answer and required
that a dropped flag take its code with it.

## Alternatives

**Ship the full wave.** Rejected on the numbers. It makes the game easier and
shorter without making building necessary, which is the opposite of the change
`T-024` is looking for. Shipping it would also mean shipping a second mixing
model, and the MVP should have one.

**Ship the bounded variant.** Genuinely tempting, and the closest call here. It
keeps almost the whole drain, barely moves any win rate, and produced the only
meaningfully positive gap change in the whole run — `Full Spectrum` +2.0 points.
Rejected anyway: it narrowed the gap on two other stages by the same margin, so
it is a wash rather than a fix, and shipping a second mixing rule for a wash is
a bad trade. The bounded shape is the part worth remembering, and `I-008` is
where it survives.

**Keep the flag and decide later.** Rejected, and `T-012` had already rejected
it in advance. A dormant prototype is a second set of rules that every later
change has to stay compatible with, and the question it was waiting on has now
been answered. Nothing is lost by removing it that `T-031` and this record do
not preserve.

## Consequences

- **Supply is now a lever that has been tried and found insufficient for the
  multiplier problem.** That is the largest thing this record carries forward.
  `T-024` should not reach for another supply mechanism expecting it to make
  building necessary — manufacturing result tiles demonstrably does not. It
  points the remaining work at the rule-shaped levers, `T-036` first, which is
  `C-001`'s own ordering arriving from the other direction.
- **`D-002` still stands.** Supply is still a flow rather than a stock, and
  `T-038` still has to choose a mechanism. This record rejects one candidate for
  that role on evidence; it does not reopen the shape question.
- **`I-008` is where the idea survives.** The wave as a limited per-run tool is
  a different proposition from the wave as a core rule: a tool is spent
  deliberately, so paying out regardless of whether the player built anything is
  much less of a fault. That card should now cite the bounded variant rather
  than the full flood fill.
- **The browser suite lost its one full-cascade prediction.** The combo test in
  `tests/play/match.spec.ts` was the only place that replayed `resolveCascade`
  offline and checked the live board against the exact settled result — the
  drift-proofing `T-022` describes. The remaining tests predict with
  `resolveMove` and `findMatches` and poll the live board, which is weaker.
  Worth restoring on a non-combo move rather than leaving as an unremarked loss.
- **There is no prototype-toggle module any more**, so the next mechanic on
  trial has nowhere ready-made to hide behind. It was five lines and reading one URL
  parameter; rebuilding it when there is a second spike is cheaper than carrying
  an empty module that invites things to be left dormant in it.
- **No stage, tutorial or authored board changes.** The wave was off by default,
  so nothing a player has ever seen is different.
