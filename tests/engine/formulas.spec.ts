import { expect, test } from '@playwright/test'

import {
  advanceColorChain,
  clearScore,
  parseMask,
  scoreResolutionForMerge,
  scoreResolutionForSwap,
} from '../../src/board'
import { colorTier, colorValue } from '../../src/colors'
import { playMove, startRound } from '../../src/round'
import { stageMaxMultiplier, type Stage } from '../../src/stage'
import { BASELINE_RULES } from '../../src/variants'

/**
 * The worked round of `C-001` §2, asserted move for move.
 *
 * The concept states the board maths as formulas and evaluates them by hand on
 * this board; these tests are the other half of that claim — they run the same
 * four moves through `playMove` and check the hand arithmetic against what the
 * engine actually pays. A rule that changes without the section being rewritten
 * fails here rather than leaving the concept quietly wrong.
 *
 * The board is authored rather than one of the ten stages: every cell is a
 * colour letter, and seed 3 is the one that lets each move clear exactly one
 * wave, so no refill draw enters the arithmetic.
 */

const BOARD = ['byrybr', 'ooyrbb', 'rbyyrb', 'ggbryy', 'yrbyry', 'pprbyr']

const WORKED: Stage = {
  name: 'C-001 §2',
  hint: 'The worked round',
  threshold: 999999,
  moves: 99,
  active: ['red', 'yellow', 'blue', 'orange', 'green', 'purple'],
  seed: ['red', 'yellow', 'blue'],
  board: BOARD,
}

const GRID = parseMask(BOARD)
const at = (row: number, col: number): number => row * GRID.cols + col

/** The four moves of the worked round, in order. */
const MOVES = [
  { from: at(0, 2), to: at(1, 2) },
  { from: at(2, 2), to: at(3, 2) },
  { from: at(4, 2), to: at(5, 2) },
  { from: at(2, 4), to: at(2, 5) },
]

const nonSeed = (round: ReturnType<typeof startRound>): number =>
  round.cells.filter((color) => color !== null && !WORKED.seed.includes(color)).length

test('tile value is the tier ladder, and nothing reaches the clamp', () => {
  expect([colorValue('red'), colorValue('orange'), colorValue('teal')]).toEqual([15, 20, 30])
  expect(colorTier('red')).toBe(0)
  expect(colorTier('orange')).toBe(1)
  expect(colorTier('teal')).toBe(2)
})

test('the chain is one plus the distinct results, capped at the stage ceiling', () => {
  expect(stageMaxMultiplier(WORKED)).toBe(4)
  let chain = { results: [], multiplier: 1 } as ReturnType<typeof advanceColorChain>
  const walked = ['orange', 'orange', 'green', 'purple', 'teal'].map((result) => {
    chain = advanceColorChain(chain, result as never, 4)
    return chain.multiplier
  })
  // A repeat pays nothing, and at the ceiling a fresh result is not recorded.
  expect(walked).toEqual([2, 2, 3, 4, 4])
  expect(chain.results).toEqual(['orange', 'green', 'purple'])
})

test('the chain-breaker bonuses are swap-only, and rainbow on a merge pays nothing', () => {
  const atCeiling = { results: ['orange', 'green', 'purple'] as never[], multiplier: 4 }
  expect(scoreResolutionForMerge(atCeiling, 4)).toEqual({
    kind: 'normal',
    multiplier: 4,
    rainbow: true,
  })
  expect(scoreResolutionForSwap(atCeiling, 4)).toEqual({
    kind: 'rainbow-chain-breaker',
    multiplier: 12,
    rainbow: true,
  })
  expect(scoreResolutionForSwap({ results: ['orange'] as never[], multiplier: 2 }, 4)).toEqual({
    kind: 'chain-breaker',
    multiplier: 4,
    rainbow: false,
  })
  expect(clearScore(['blue', 'blue', 'blue'], 12)).toBe(540)
})

test('the worked round pays what C-001 §2 evaluates by hand', () => {
  let round = startRound(WORKED, { seed: 3, rules: BASELINE_RULES })
  expect(nonSeed(round)).toBe(6)

  const rows = MOVES.map(({ from, to }) => {
    const played = playMove(round, from, to)!
    const { report } = played
    round = played.round
    return {
      kind: report.kind,
      resolution: report.resolution.kind,
      multiplier: report.resolution.multiplier,
      waves: report.waves.length,
      cleared: report.waves.flatMap((wave) => wave.colors),
      score: round.score,
      chain: round.colorChain.multiplier,
      nonSeed: nonSeed(round),
    }
  })

  expect(rows).toEqual([
    {
      kind: 'merge',
      resolution: 'normal',
      multiplier: 1,
      waves: 1,
      cleared: ['orange', 'orange', 'orange'],
      score: 60,
      chain: 2,
      nonSeed: 5,
    },
    {
      kind: 'merge',
      resolution: 'normal',
      multiplier: 2,
      waves: 1,
      cleared: ['green', 'green', 'green'],
      score: 180,
      chain: 3,
      nonSeed: 4,
    },
    {
      kind: 'merge',
      resolution: 'normal',
      multiplier: 3,
      waves: 1,
      cleared: ['purple', 'purple', 'purple'],
      score: 360,
      chain: 4,
      nonSeed: 3,
    },
    {
      kind: 'swap',
      resolution: 'rainbow-chain-breaker',
      multiplier: 12,
      waves: 1,
      cleared: ['blue', 'blue', 'blue'],
      score: 900,
      chain: 1,
      nonSeed: 3,
    },
  ])
})

test('a merge tests legality on a smaller change than the one it makes', () => {
  // Dragging along the line instead of into it dyes a fourth tile that the
  // legality check never saw: four cleared, and no survivor.
  const round = startRound(WORKED, { seed: 3 })
  const { round: after, report } = playMove(round, at(1, 3), at(1, 2))!
  expect(report.waves[0].colors).toEqual(['orange', 'orange', 'orange', 'orange'])
  expect(report.waves[0].points).toBe(80)
  expect(nonSeed(after)).toBe(4)
  // The position that move was played from still has its six non-seed tiles.
  expect(nonSeed(round)).toBe(6)
})

test('a merge clears at the chain it arrived with, unless the rule says otherwise', () => {
  const play = (rules: typeof BASELINE_RULES): number[] => {
    let round = startRound(WORKED, { seed: 3, rules })
    return MOVES.map(({ from, to }) => {
      const played = playMove(round, from, to)!
      round = played.round
      return played.report.resolution.multiplier
    })
  }
  expect(play(BASELINE_RULES)).toEqual([1, 2, 3, 12])
  expect(play({ ...BASELINE_RULES, mergeScoring: 'own-clear' })).toEqual([2, 3, 4, 12])
})
