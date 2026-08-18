import { expect, test } from '@playwright/test'

import { legalMoves, parseMask } from '../../src/board'
import {
  CHAIN_POLICY,
  HOARD_POLICY,
  POINTS_POLICY,
  POLICIES,
  playOut,
  policyGap,
  runStage,
} from '../../src/playout'
import { startRound } from '../../src/round'
import { STAGES } from '../../src/stages'
import { BASELINE_RULES, VARIANTS } from '../../src/variants'

/**
 * The headless harness (`T-022`). These run with no page and no Phaser — the
 * point of the exercise is that a round is now a value, so the simulator is
 * ordinary data in, data out.
 */

test('a seeded playout is reproducible, move for move', () => {
  for (const policy of POLICIES) {
    const first = playOut(STAGES[3], 4711, policy)
    const again = playOut(STAGES[3], 4711, policy)
    expect(again.outcome).toBe(first.outcome)
    expect(again.score).toBe(first.score)
    expect(again.moves).toEqual(first.moves)
  }
})

test('different seeds deal different rounds', () => {
  const scores = new Set(
    [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => playOut(STAGES[3], seed, POINTS_POLICY).score),
  )
  expect(scores.size).toBeGreaterThan(1)
})

test('a playout ends in a real outcome rather than running out of board', () => {
  for (const policy of POLICIES) {
    const { playouts } = runStage(STAGES[5], policy, 25, 900)
    for (const playout of playouts) {
      expect(playout.truncated).toBe(false)
      expect(playout.outcome).not.toBe('playing')
      expect(playout.movesUsed).toBeGreaterThan(0)
      expect(playout.movesUsed).toBeLessThanOrEqual(STAGES[5].moves)
    }
  }
})

test('every move a policy chooses is one the rules allow', () => {
  // The harness throws if `playMove` refuses a choice, so reaching an outcome
  // is the assertion. This states it directly for the policies as a pair.
  for (const policy of POLICIES) {
    expect(() => runStage(STAGES[7], policy, 15, 55)).not.toThrow()
  }
})

test('policies actually differ — the chain builder scores higher on a mixing stage', () => {
  const points = runStage(STAGES[9], POINTS_POLICY, 40, 200).summary
  const chain = runStage(STAGES[9], CHAIN_POLICY, 40, 200).summary
  expect(chain.score.mean).toBeGreaterThan(points.score.mean)
})

/**
 * `C-001`'s supply argument, measured rather than argued: refills only ever
 * drop seed colours and a merge spends three tiles to return one, so the pool
 * of secondaries and tertiaries can only shrink over a round.
 */
test('the non-seed pool never grows over a round', () => {
  for (const stage of STAGES) {
    for (const policy of POLICIES) {
      const { playouts } = runStage(stage, policy, 20, 3000)
      for (const playout of playouts) {
        if (playout.moves.length === 0) continue
        const opening = playout.moves[0].nonSeed
        for (const move of playout.moves) {
          expect(move.nonSeed).toBeLessThanOrEqual(opening)
        }
      }
    }
  }
})

test('a stage with no authored secondaries never grows one from refills', () => {
  const stage = STAGES[0]
  const grid = parseMask(stage.board)
  const opening = startRound(stage, { seed: 12 })
  expect(opening.cells.every((color) => color === null || stage.seed.includes(color))).toBe(true)
  expect(legalMoves(grid, opening.cells, opening.mix).length).toBeGreaterThan(0)

  const { playouts } = runStage(stage, POINTS_POLICY, 20, 12)
  for (const playout of playouts) {
    for (const move of playout.moves) expect(move.nonSeed).toBe(0)
  }
})

/**
 * The two figures the balance cards have to cite (`T-031`). Both outlived the
 * combo wave they were built to weigh, because `T-036` and `T-037` measure
 * their variants the same way.
 */

test('mixes per run are counted, since the supply question is about them', () => {
  const { playouts, summary } = runStage(STAGES[9], CHAIN_POLICY, 12, 300)
  const counted = playouts.map(
    (playout) => playout.moves.filter((move) => move.kind === 'merge').length,
  )
  expect(summary.mixes.mean).toBeCloseTo(
    counted.reduce((sum, count) => sum + count, 0) / counted.length,
  )
  expect(summary.mixes.max).toBe(Math.max(...counted))
})

test('the greedy-versus-chain gap is chain minus points, and it is its own figure', () => {
  const points = runStage(STAGES[9], POINTS_POLICY, 12, 88).summary
  const chain = runStage(STAGES[9], CHAIN_POLICY, 12, 88).summary
  const gap = policyGap(points, chain)
  expect(gap.stage).toBe(STAGES[9].name)
  expect(gap.winRate).toBeCloseTo(chain.winRate - points.winRate)
  expect(gap.score).toBeCloseTo(chain.score.mean - points.score.mean)
  expect(gap.movesUsed).toBeCloseTo(chain.movesUsed.mean - points.movesUsed.mean)
})

/**
 * The `T-036` variant, measured rather than argued. Everything here is a
 * comparison against the baseline, which is what makes the card's numbers a
 * relative claim that holds.
 */

test('the baseline is the default — asking for it changes nothing', () => {
  for (const policy of POLICIES) {
    const implied = playOut(STAGES[9], 77, policy)
    const asked = playOut(STAGES[9], 77, policy, { rules: BASELINE_RULES })
    expect(asked.outcome).toBe(implied.outcome)
    expect(asked.score).toBe(implied.score)
    expect(asked.moves).toEqual(implied.moves)
  }
})

test('no merge clears nothing under the baseline, on any stage or policy', () => {
  for (const stage of STAGES) {
    for (const policy of POLICIES) {
      const { summary } = runStage(stage, policy, 10, 900)
      expect(summary.dryMixes.max).toBe(0)
    }
  }
})

/**
 * The variant's whole reason for existing: a merge that clears nothing spends
 * a move and leaves *two* result-coloured tiles standing, which turns the merge
 * arithmetic from −2 into +2 and breaks the one invariant `C-001` says the
 * supply economy cannot escape.
 */
test('a dry mix is what lets the non-seed pool grow', () => {
  const anyMix = VARIANTS.find((variant) => variant.id === 'any-mix')!
  const { playouts, summary } = runStage(STAGES[9], HOARD_POLICY, 20, 4200, {
    rules: anyMix.rules,
  })
  expect(summary.dryMixes.mean).toBeGreaterThan(0)

  const grew = playouts.filter((playout) => {
    if (playout.moves.length === 0) return false
    const opening = playout.moves[0].nonSeed
    return playout.moves.some((move) => move.nonSeed > opening)
  })
  expect(grew.length).toBeGreaterThan(0)

  // And every one of those runs got there through a merge that cleared nothing.
  for (const playout of grew) {
    expect(playout.moves.some((move) => move.kind === 'merge' && move.cleared === 0)).toBe(true)
  }
})

test('tertiary clears are counted, since they are the variant\'s real test', () => {
  const { playouts, summary } = runStage(STAGES[9], CHAIN_POLICY, 12, 640)
  const counted = playouts.map((playout) =>
    playout.moves.reduce((sum, move) => sum + move.tertiaries, 0),
  )
  expect(summary.tertiaries.mean).toBeCloseTo(
    counted.reduce((sum, count) => sum + count, 0) / counted.length,
  )
  expect(summary.tertiaries.max).toBe(Math.max(...counted))
})
