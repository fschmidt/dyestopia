---
id: T-044
type: task
title: Restore the measurement headroom
status: Todo
ordinal: 100
labels: [stages, balance, testing]
---

## Description

**Nothing blocks this. It gates `T-024`, `T-037` and `T-038`.** Carved out of
`T-025`, which keeps the difficulty curve and goes back to being last.

The headline metric has stopped measuring. `T-036` ran the ten core stages 200
times per row and the chain policy clears eight of them at 99.5–100%; only `The
Hourglass` sits meaningfully below, at 88.0%. A gap between two policies cannot
widen when the upper line is already at the ceiling, so a flat win gap is no
longer evidence about the lever being measured — it is evidence about the
instrument.

`T-036` is the worked example and the reason this card exists. Its variant
widened the greedy-versus-chain *score* gap on every stage of ten — `Full
Spectrum` +4702, `Amber Glow` +2350 — while the win gap read flat or narrower on
seven. Read on win rate alone, that is the same verdict `T-031` returned for the
combo wave, and it would be the wrong one: the combo wave lifted the greedy line
and this did not.

Three cards read that number as their headline, so all three are currently
building on it: `T-024`'s AC #3 and #4 are both stated as win rates, `T-037` is
a measurement whose report is win rate and the gap, and `T-038` chooses a
mechanism on those numbers. Fixing the instrument before they run is cheaper
than discovering afterwards which of their conclusions survived.

**The knobs already exist and both have slack.** `threshold` and `moves` are
per-stage numbers on `Stage` in [src/stage.ts](../../../src/stage.ts), authored
in [src/stages.ts](../../../src/stages.ts). Nothing has to be built, which is
what separates this half from `T-025`'s.

- **Thresholds are loose.** Set the median chain run against the stage target
  and the headroom is wide almost everywhere: `Royal Purple` clears 2900 with
  4402, `Cascade Lesson` 1800 with 2742, `Full Spectrum` 5700 with 7072.
- **Move budgets are barely a constraint.** `T-022`'s finding, unspent since:
  `Full Spectrum` allows 18 moves and is won in 5.8 under `chain`. Rounds end by
  crossing the threshold, not by running out.

`The Hourglass` is the calibration reference rather than a stage to fix. At 2620
against a 2500 target it is the one stage where the target bites, and it is the
one stage whose win rate is not pinned. That is not a coincidence — it is what a
stage with headroom already looks like, and it is the shape the others should be
moved toward.

**This card changes no rule.** No parameter set, no mix legality, no supply
mechanism, no new mechanic. Two authored numbers per stage and a re-measured
baseline. If a stage cannot be brought into range by those two numbers alone,
that is a finding for `T-035` and `T-025`, not a licence to reach for a third
knob here.

### It will need doing again, and that is the argument for doing it now

`D-002` decided supply is a flow, so whatever mechanism `T-038` chooses makes
every stage easier at unchanged targets — `T-025` already says so. This retune
does not survive that, and it is not meant to. An instrument recalibrated twice
is cheaper than three cards' worth of numbers nobody can read, and the second
recalibration is the same two numbers again.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 A chain-building policy clears every core stage between 90% and 95% —
      off the ceiling so a change can register, and above the floor `T-024`
      AC #4 already sets
- [ ] #2 The points-chasing policy stays measurably below the chain policy on
      every stage, so the gap has room to move in both directions
- [ ] #3 Only `threshold` and `moves` change — no rule, parameter or mechanic
- [ ] #4 Every stage is still cleared by a chain-building policy on the harness,
      so the retune has not made one unwinnable
- [ ] #5 The re-measured baseline is written down where `T-024`, `T-037` and
      `T-038` cite it, replacing the numbers they cite today
<!-- AC:END -->
