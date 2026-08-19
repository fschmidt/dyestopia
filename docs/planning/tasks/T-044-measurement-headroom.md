---
id: T-044
type: task
title: Restore the measurement headroom
status: Done
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

---

## What was done

**The two knobs never touch play, and that decided the shape of the retune.**
`round.ts` reads them in exactly two places: `won()` compares the score against
the target, and a legal move decrements `movesLeft`. No policy sees either. So a
single playout under an unreachable target and a generous budget carries the
answer for *every* candidate pair — the cumulative score after k moves decides
the win at any `(threshold, moves)`. Mapping the whole surface is then 400 seeds
per stage per policy, run once, rather than a search that replays the game for
each guess. Worth stating because it turned "which knob" from a preference into
a question with an answer.

**Every authored target already sat inside the 90–95% window at some budget.**

| Stage | today | the same target holds at |
| --- | --- | --- |
| `First Splash` | 600 in 8 | 600 in **4** |
| `Mixing Lesson` | 1300 in 8 | 1300 in **4** |
| `Cascade Lesson` | 1800 in 10 | 1800 in **5** |
| `Royal Purple` | 2900 in 12 | 2900 in **6** |
| `The Diamond` | 1700 in 12 | 1700 in **7** |
| `Twin Wells` | 2000 in 14 | 2000 in **10** |
| `Deep Teal` | 2500 in 14 | 2500 in **8** |
| `Amber Glow` | 3550 in 15 | 3550 in **10** |
| `The Hourglass` | 2500 in 16 | 2500 in **18** |
| `Full Spectrum` | 5700 in 18 | 5700 in **11** |

So the targets were not the loose knob. The budgets were, which is `T-022`'s
finding restated from the other side: rounds ended by crossing the target
because there were roughly twice as many moves as any of them needed.

**Three boards are borrowed by lessons, and a lesson borrows the budget.**
`TUTORIALS` reuses `STAGES[0]`, `[1]` and `[3]`. A lesson hides the score and
the target but `startRound` still spends `stage.moves`, and still loses the
round at zero — which is `T-021`, Deferred. Halving those three budgets would
make a known first-run bug arrive twice as fast. On those three the target is
therefore the safe knob and the budget is left alone; everywhere else the target
stands and the budget carries the retune.

| Stage | was | now | which knob |
| --- | --- | --- | --- |
| `First Splash` | 600 in 8 | **1350** in 8 | target — lesson board |
| `Mixing Lesson` | 1300 in 8 | **2400** in 8 | target — lesson board |
| `Cascade Lesson` | 1800 in 10 | 1800 in **5** | budget |
| `Royal Purple` | 2900 in 12 | **5500** in 12 | target — lesson board |
| `The Diamond` | 1700 in 12 | 1700 in **7** | budget |
| `Twin Wells` | 2000 in 14 | 2000 in **10** | budget |
| `Deep Teal` | 2500 in 14 | 2500 in **8** | budget |
| `Amber Glow` | 3550 in 15 | **3650** in **10** | both, by 100 points |
| `The Hourglass` | 2500 in 16 | 2500 in **18** | budget, upward |
| `Full Spectrum` | 5700 in 18 | 5700 in **11** | budget |

`The Hourglass` is the one row that needed *more* budget, which is the card's
own premise holding: it was the only one where the target already bit.

Every number was checked on the harness seeds and on two held-out blocks of 200
plus a 1000-seed run, so the band is a property of the board rather than of
seeds 1–200. `Mixing Lesson` is the loosest fit, reading 96–97% on seeds 401–600
against 90.5% on 1–200; it has the widest score spread of the ten and the band
is correspondingly harder to hold.

## What it found

200 playouts per row, seeds 1–200 — the harness default, and what
`npm run playout` prints today.

| Stage | chain, was → now | points, was → now | win gap, was → now |
| --- | --- | --- | --- |
| `First Splash` | 100.0% → **91.0%** | 100.0% → 91.0% | ±0.0 → **±0.0** |
| `Mixing Lesson` | 99.5% → **90.5%** | 99.0% → 72.0% | +0.5 → **+18.5** |
| `Cascade Lesson` | 100.0% → **92.5%** | 98.5% → 35.0% | +1.5 → **+57.5** |
| `Royal Purple` | 99.5% → **91.0%** | 88.0% → 27.0% | +11.5 → **+64.0** |
| `The Diamond` | 99.5% → **93.0%** | 95.5% → 69.5% | +4.0 → **+23.5** |
| `Twin Wells` | 99.0% → **93.0%** | 94.0% → 70.0% | +5.0 → **+23.0** |
| `Deep Teal` | 99.5% → **93.0%** | 98.5% → 68.0% | +1.0 → **+25.0** |
| `Amber Glow` | 100.0% → **94.0%** | 96.5% → 62.0% | +3.5 → **+32.0** |
| `The Hourglass` | 88.0% → **92.5%** | 87.0% → 92.0% | +1.0 → **+0.5** |
| `Full Spectrum` | 99.5% → **93.5%** | 85.0% → 27.0% | +14.5 → **+66.5** |

**The instrument works again.** Eight stages of ten had a win gap under 5.0
points and the chain line pinned at 99.0% or better; the same eight now run
+18.5 to +66.5 with the chain line off the ceiling. A change that helps the
builder has somewhere to show up, and one that helps both has somewhere to fail
to.

**The budget binds now.** Slack — the gap between the chain bot's mean run and
the budget it is given — falls from 8.0 moves to 4.4 across the ten, and from
12.2 to 5.4 on `Full Spectrum`. A round that does not cross the target now runs
out of moves rather than wandering.

**The score gap moved with it and stayed the better-behaved metric**, which is
the sanity check that the retune did not simply invent a gap: `Full Spectrum`
+2416 → +3864, `Royal Purple` +2863 → +3735, `Cascade Lesson` +1995 → +2501. The
two lines were always this far apart in points. Only the win condition could not
see it.

### The win gap is measured on eight rows, not ten

Two rows carry no policy gap after the retune, and neither is reachable by
`threshold` or `moves`. Both are facts about the test set rather than about the
game, which is the right way round: the lineup is a set of testing grounds, so a
row that cannot separate two policies is a gap in the *instrument* to be filled
by changing the set, not a board to be defended.

- **No mixable colour in play** means `legalMoves` offers swaps only and the two
  policies are one bot — identical down to the score distribution, as `T-036`
  also observed. `First Splash` is that row, at ±0.0 for every budget from 3 to
  16 moves. It still measures "did this change make this harder", which is what
  a single-policy row is for.
- **A board where building barely pays** shows up as a score gap near zero, and
  a win gap cannot be tuned out of that. `The Hourglass` is that row at +137.8,
  the smallest of the ten — and the smallest before the retune too, at +134.1.
  Across every budget from 3 to 22 moves its win gap never exceeds 2.5 points.

Which also corrects this card's own framing. It called `The Hourglass` the
calibration reference because it was the one stage whose win rate was not
pinned — but it was not pinned because both bots do equally badly there, not
because building pays. The thing worth copying was the headroom, not the board.

So a lever measured on this set is measured on eight rows. Whether the set
should grow a row that separates the policies where these two do not is a
question for whoever next touches the lineup; it is not a defect in these two.

### What the cards this unblocks should cite now

- **`T-024` AC #3.** The greedy line on the last three stages was 85–88%; it now
  reads `Amber Glow` 62.0%, `The Hourglass` 92.0%, `Full Spectrum` 27.0%. Two of
  the three are already under half, and not because anything got harder for the
  builder — the bar that AC was written to set needs restating against these
  numbers, and this card does not restate it.
- **`T-024` AC #4.** "A chain-building policy still clears every stage at least
  90% of the time" is now the calibration itself rather than a check on it. It
  passes by construction, which makes it a regression test for the retune and
  no longer evidence about a fix.
- **`T-024`'s corrected-premise section** cites median chain runs against the
  old targets (`Royal Purple` 4402 against 2900, and so on). Those are gone; the
  card is amended to point here.
- **`T-037` and `T-038`** report against the harness as it stands, so they
  inherit this baseline by running. Both are amended to say which baseline that
  is.

And it does not survive `T-038`. `D-002` decided supply is a flow, so whatever
mechanism that card chooses makes every stage easier at these numbers, and the
same two columns get set a second time. That was the argument for doing it now
and it is unchanged by having done it.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 A chain-building policy clears every core stage between 90% and 95% —
      off the ceiling so a change can register, and above the floor `T-024`
      AC #4 already sets
- [ ] #2 The points-chasing policy stays measurably below the chain policy on
      every stage, so the gap has room to move in both directions — **met on
      eight of ten.** `First Splash` runs the two policies as one bot and
      `The Hourglass` separates them by +0.5 points at every budget swept;
      neither is reachable by these two knobs, so both are handed on rather
      than forced
- [x] #3 Only `threshold` and `moves` change — no rule, parameter or mechanic
- [x] #4 Every stage is still cleared by a chain-building policy on the harness,
      so the retune has not made one unwinnable
- [x] #5 The re-measured baseline is written down where `T-024`, `T-037` and
      `T-038` cite it, replacing the numbers they cite today
<!-- AC:END -->
