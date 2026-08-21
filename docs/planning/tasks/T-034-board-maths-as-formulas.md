---
id: T-034
type: task
title: The board maths as formulas
status: Done
ordinal: 300
labels: [engine, balance, docs]
---

## Description

**Nothing blocks this. Feeds `T-035`.** It can be done at any point; it is
queued here because the parameter set is the next card and this is its
precondition.

Fill `C-001` §2. Scoring, chain growth, cash-in, supply and placement written so
they can be read, argued about and evaluated without the game running. This is
the part of the concept that does not exist at all today, and the reason `C-001`
is a concept rather than a refactor.

The inventory in `C-001` §1 lists *where* each rule lives and what its value is.
It does not say what the rules compute. A reader who wants to know what a
maxed-chain Rainbow Chain Breaker on a run of four tertiaries is worth has to
read four functions across three files and hold the order of operations in their
head. That is why every balance argument so far has been made from intuition —
including the ones in `T-012` and `T-024`.

Each formula names the function that implements it, so drift between the two is
detectable rather than silent. Where a formula has an order of operations that
surprises — a merge clears at the chain it *arrived* with, a cascade wave
inherits the move's multiplier and never grows — the formula says so rather than
burying it.

Write them against the code as it stands. This card changes no behaviour and
chooses no value; if a formula turns out to be awkward to state, that is a
finding for `T-035`, not a licence to change the rule here.

Note that `npm test` is Playwright and there is no unit-test runner, so
"testable on its own" in `C-001` §5 is a capability `T-022` brings, not one this
card builds. What this card owes is formulas precise enough that the harness can
check them once it exists.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 Scoring, chain growth, cash-in, supply and placement each written as a
      formula in `C-001` §2, evaluable by hand
- [x] #2 Each formula names the function that implements it
- [x] #3 Each is checked against the code as it stands, with a worked example
      that a reader can follow
- [x] #4 The order-of-operations surprises are stated in the formulas rather
      than left to the prose around them
- [x] #5 No behaviour changed and no value chosen
<!-- AC:END -->

---

## What was built

`C-001` §2, in seven blocks: legality, scoring, chain growth, cash-in, supply,
placement, and one worked round that every one of them is evaluated against.
Each block is a formula, the functions that compute it, and the
order-of-operations surprises stated *inside* the formula rather than in the
prose around it — `mₖ = m` for every wave, the merge scoring at the chain it
arrived with, the dye happening before the cascade reads a colour.

**Legality was written as a sixth block although the card named five.** Scoring
and supply both turn on which cells a move clears, and that set is defined by a
rule whose test is narrower than its effect: `mergeClears` dyes only the target,
`playMove` dyes both tiles. Stating the two boards side by side —
`findMatches(B[t ← r])` for legality against `findMatches(B[t ← r, f ← r])` for
the clear — is what makes directionality and the run-of-four case fall out of
one line instead of needing a paragraph each.

**The worked round is authored, not one of the ten.** Six rows of colour
letters, three merges that walk the chain `1 → 2 → 3 → 4`, and a swap that cashes
it in at ×12 for 540 of the round's 900 points. It is not a stage because a
stage deals random cells, and a reader cannot hand-evaluate a refill: the board
is authored to the last cell and seeded at 3, the one seed in the first 20,000
where all four moves clear exactly one wave. On this board the refill makes a
second wave on roughly a fifth of first moves, which is itself the placement
finding.

**It is pinned by a spec.** `tests/engine/formulas.spec.ts` runs the same four
moves through `playMove` and asserts the hand arithmetic — points, multiplier,
chain, non-seed count, move by move — plus the tier ladder, the chain walk
including its two no-ops, the swap-only bonuses, the run-of-four case and the
`own-clear` reading of the same round. Six specs, no new engine code, and a rule
that changes without §2 being rewritten now fails the suite rather than leaving
the concept quietly wrong.

**The three modules are pinned too**, which is the first use of
`<!-- pin:… -->` outside the wiki. The mechanism is right for this one section
and no other prose in `docs/concepts/`: §2 is a *description of code* living
outside the wiki, which is exactly what the pin was built to catch. Changing
`src/board.ts`, `src/round.ts` or `src/colors.ts` now asks for §2 to be re-read
before `npm run wiki` will re-pin it.

**Six rows of §1 were pointing at functions that no longer exist.** Scoring
colour, merge scoring order, illegal drop cost and the three cascade rows all
named `resolve` or `handleDrop` in `GameScene`; the rules moved to `playMove`
and `resolveCascade` when the round became a value, and `GameScene.resolve` is
now the animation playback. The economy section's dye snippet was stale the same
way. Corrected in place — the drift this card exists to make detectable had
already happened once.

## What it found

Two numbers were measured to write the section, both read-only over the shipped
code and neither changing it.

- **A move settles into 3.70 waves on average, and 75.7% of moves cascade past
  the first** (ten stages, 200 seeds each, chain policy through `playOut`). Waves
  are free and inherit, so anything that moves the multiplier moves about three
  and a half clears rather than one.
- **The deal's placement filter never binds: 0 empty allowed-sets in 98,600
  cells, and 0 repairs in 2,000 deals.** With three seed colours a cell can be
  forbidden one colour by its row and one by its column, so away from preset
  letters it cannot run out.

And four things the formulas make visible that the inventory did not:

- **The multiplier already dominates the tier ladder by an order of magnitude.**
  A tertiary trio is worth 2× a primary trio; a rainbow cash-in is worth 12× on a
  four-recipe stage. `T-024` is a question about how often a big multiplier is
  reachable, not about how big it is.
- **The chain can only be realised by spending it.** A merge tops out at `M`, a
  swap at `3M`, and `rainbow` on a merge is a presentation flag worth nothing.
  The ×2 and ×3 bonuses are the only place the chain is multiplied at all, which
  is `T-035`'s cheapest pair of levers.
- **`ΔN ≤ −1` on every merge, provably.** A legal merge leaves a run of at least
  three result-coloured cells and dyeing the dragged tile can only lengthen it,
  so the +2 from the dye is always outspent. The economy section argued
  non-increasing; the formula gives strictly decreasing, and −2 for a tertiary.
- **Applying the deal's filter at refill time is cheap.** One rejected colour per
  cell at worst and no fallback path needed, which makes `C-001`'s open question
  about it a smaller change than it read as. What it would do to the 75.7% is
  still unmeasured, and stays `T-038`'s.

## What it did not do

No rule changed, no value moved, and nothing new is reachable from a stage or a
scene. The only source file added is a test. Where a formula has two forms the
baseline is the formula and the variant is named beside it, so §2 describes the
game as it ships and not the three variants measured against it.

The section is prose about code, which is the failure mode it documents: it is
true as of the pinned hashes and no further. `T-035` is the card that turns the
constants in it into a parameter set, and the first formula that turns out to be
awkward to state in that form is a finding for that card rather than a licence
to change a rule here.
