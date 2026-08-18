---
id: T-031
type: task
title: Measure the combo spike
status: Done
ordinal: 200
labels: [engine, testing]
---

## Description

**Blocked on `T-022`. Feeds `T-012`, `T-024` and `T-038`.**

Quantify what the `?combo` flood-fill wave actually does to the game, so that
`T-012` and `T-024` decide against numbers instead of intuition. Measurement
only — this card changes no gameplay and ships no decision.

Run every stage under the `T-022` harness, combo off and combo on, across the
same bot policies, and report the difference. The two questions that matter pull
in opposite directions and both have to be answered:

- **Does it make chain play available?** The hypothesis is that mixes are
  supply-starved — a mix is only legal when the dyed target completes a line with
  two result-coloured tiles already in place, and refills only ever drop `seed`
  colours, so result tiles come from the opening deal and merge survivors alone.
  Combo is the one mechanism that manufactures them faster.
- **Does it make the game too easy?** A wave that fires on any mix pays out
  whether or not the player built anything, which would raise the greedy line as
  much as the chain line and flatten what little difficulty exists. If the win
  rate goes up and the gap between greedy and chain play does not, combo is not
  a fix — it is a bigger version of the problem.

Report both, per stage and in aggregate. A verdict that combo helps supply is
worthless without the second number beside it.

Worth measuring at least one bounded variant as well — capped group size, or
converting only ingredients adjacent to the merge pair — so `T-012` has
something between ship and drop to choose from.

---

## What was built

The wave is an axis rather than a switch. `ComboRule` in `src/board.ts` names
three: `off`, the game as it ships and the baseline every row is read against;
`full`, the flood-fill prototype; and `contact`, the bounded variant — only the
ingredients the merge already touches convert, so the wave is one tile deep and
cannot chain. The bound is geometric rather than a cap, so there is no number
anyone has to justify.

`RoundState` carries the rule instead of a boolean and `GameScene` asks for
`full` or `off`, so nothing a player can reach changed. `npm run playout --
--combo=all` plays every stage under every rule in one run.

Two things the report had to gain before the numbers could be read at all.

**A per-move rate beside every count.** Round length is itself one of the things
a combo rule changes, so a count per *run* moves for two reasons at once and a
reader cannot tell them apart. Mixes per run **fall** under the full wave on
every mixing stage while mixing becomes **more** available — because the round
ends sooner. Without the rate the table says the opposite of what happened.

**The gap as its own table.** `policyGap` states chain minus points, and the
table states what each rule did to that gap against the baseline. A rule that
lifts both policies equally now reads as a large win-rate change beside a `±0.0`
gap, which is precisely the distinction this card exists to draw and precisely
what two rows of win rates hide.

## What it found

200 playouts per row, seeds 1–200, ten core stages × three rules × two
policies — 12,000 playouts.

**The supply hypothesis holds. Combo does manufacture result tiles.** Under the
full wave, mixes per move rise on every stage that mixes at all — `Cascade
Lesson` 0.47 → 0.63, `Royal Purple` 0.55 → 0.64, `Twin Wells` 0.50 → 0.74,
`Full Spectrum` 0.62 → 0.77 under `chain` — and the pool stops draining: the
non-seed drain per move goes from −0.63 to −0.20 on `Full Spectrum`, −0.42 to
−0.01 on `Royal Purple`, −0.51 to −0.09 on `The Diamond`. That is the mechanism
working as `C-001` argued it would. It is also the only good news here.

**And it does not make building necessary, which is what it was wanted for.**
The greedy-versus-chain win gap is flat or **narrower** under the full wave on
nine of the ten stages. `Twin Wells` −3.5 points, `Royal Purple` −1.0, `The
Hourglass` −1.0, `Amber Glow` −0.5, four stages at ±0.0, and only `Full
Spectrum` moves the right way at +0.5.

**`Twin Wells` is the clean statement of the failure.** The wave takes the
greedy bot from 94.0% to 98.5% and the chain bot from 99.0% to 100.0%. It paid
the player who built nothing more than the player who built, on a stage where
the greedy bot mixes 1.4 times a run at 0.19 per move. `The Hourglass` is the
same shape and starker: 87.0% → 91.5% greedy against 88.0% → 91.5% chain, a gap
of one point collapsing to zero.

**Rounds get much shorter.** `Full Spectrum` under `chain` falls from 5.8 moves
to 3.2, `Royal Purple` from 4.0 to 2.7, `Amber Glow` from 5.2 to 3.5. The wave's
largest single effect is that the threshold arrives sooner, which is the "too
easy" half of the question answered in a form the win rates understate — the
move budget was already not binding (`T-022`), and this makes it less so.

**The bounded variant is the interesting one.** `contact` keeps almost the whole
drain (`Full Spectrum` −0.59 against the baseline's −0.63, where `full` is
−0.20), barely moves any win rate, and produces the only meaningfully positive
gap change anywhere in the run: `Full Spectrum` +2.0 points. It also narrows the
gap on `Twin Wells` (−2.0) and `The Hourglass` (−2.0), so it is not a fix
either — but it buys a little of what the wave was for at a small fraction of
what the wave costs.

**`First Splash` is identical under all three rules**, down to the score
distribution. It authors no secondaries and never mixes, so there is no wave to
fire. A useful sanity check that the axis does nothing on its own.

### What this means for `T-012` and `T-024`

The two questions this card was cut to answer, answered:

- **Does combo make chain play available?** Yes, measurably — more mixes per
  move and a pool that stops draining.
- **Does it make the game too easy?** Yes. Win rates rise, rounds shorten by
  around 40% on the stages where the wave fires, and the greedy line rises as
  fast as the chain line.

So the full wave is a bigger version of the problem, exactly as this card
warned. `T-012` has three options with numbers behind each rather than two with
intuition: ship it and accept a flatter, shorter game; drop it; or ship
`contact`, which is most of the supply benefit and almost none of the win-rate
inflation.

And `T-024` should read this as a negative result about supply as a lever.
Manufacturing result tiles was the obvious fix for the multiplier problem and it
does not touch it — whoever was winning still wins, sooner. That points the
remaining work at the rule-shaped levers `T-036` and `T-037` rather than at more
supply, which is `C-001`'s own ordering arriving from the other direction.

The `T-022` caveat applies to every number above: these compare configurations
under a fixed policy, which is a relative claim and holds. None of them predicts
how hard a stage feels.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 Win rate and score distribution per stage, combo off versus on, per
      policy
- [x] #2 The greedy-versus-chain gap reported as its own figure, since that gap
      is the thing being fixed
- [x] #3 Mixes performed per run reported, to test the supply hypothesis directly
- [x] #4 At least one bounded variant measured alongside the full wave
- [x] #5 The numbers are written down where `T-012` and `T-024` can cite them
<!-- AC:END -->
