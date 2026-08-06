import { expect, test } from '@playwright/test'

import { legalMoves, parseMask } from '../../src/board'
import { CHAIN_POLICY, POINTS_POLICY, POLICIES, playOut, runStage } from '../../src/playout'
import { startRound } from '../../src/round'
import { STAGES } from '../../src/stages'

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
