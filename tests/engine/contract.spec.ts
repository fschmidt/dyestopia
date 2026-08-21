import { expect, test } from '@playwright/test'

import { legalMoves } from '../../src/board'
import { playMove, settleRound, startRound, type RoundState } from '../../src/round'
import { STAGES } from '../../src/stages'

/**
 * The engine's contract (`T-020`): a position is a value.
 *
 * `playMove` takes a round and returns the next one; nothing it was handed
 * changes. These specs assert that directly, because the property is what the
 * rest of it rests on — a round that can be kept, compared, stored and forked
 * is what lets a bot look ahead, a scene keep the frame it is still animating,
 * and a seeded round be replayed from a snapshot.
 *
 * The random stream is the part that used to make this impossible. It was a
 * closure over a mutable integer, so evaluating a move meant advancing the
 * round being played (`I-029`). It is now one uint32 in the state, and copying
 * the state copies the stream.
 */

const STAGE = STAGES[3] // Royal Purple: three recipes, a board with room to cascade

/** The mutable half of a round — everything a move changes. */
const snapshot = (round: RoundState) => ({
  cells: round.cells,
  rng: round.rng,
  score: round.score,
  colorChain: round.colorChain,
  resolution: round.resolution,
  movesLeft: round.movesLeft,
  endless: round.endless,
  outcome: round.outcome,
  thresholdMet: round.thresholdMet,
})

/** Play `count` moves, always taking the first legal one, and return the round. */
function playOn(round: RoundState, count: number): RoundState {
  let position = round
  for (let move = 0; move < count && position.outcome === 'playing'; move++) {
    const [first] = legalMoves(position.grid, position.cells, position.mix, position.rules)
    if (!first) break
    position = settleRound(playMove(position, first.from, first.to)!.round).round
  }
  return position
}

test('playing a move leaves the position it was handed alone', () => {
  const round = startRound(STAGE, { seed: 12 })
  const before = snapshot(round)

  const [first] = legalMoves(round.grid, round.cells, round.mix, round.rules)
  const played = playMove(round, first.from, first.to)!

  expect(snapshot(round)).toEqual(before)
  expect(played.round).not.toBe(round)
  expect(played.round.cells).not.toEqual(round.cells)
})

test('settling leaves the position it was handed alone', () => {
  const round = startRound(STAGE, { seed: 12 })
  const before = snapshot(round)
  settleRound(round)
  expect(snapshot(round)).toEqual(before)
})

test('a lookahead over every legal move, cascades and all, disturbs nothing', () => {
  const round = playOn(startRound(STAGE, { seed: 12 }), 3)
  const before = snapshot(round)

  // What a cascade-aware policy would do: play each candidate out in full —
  // the clear, every wave it sets off, and the refills those draw for — and
  // read what it is worth. Under the old closure this was impossible, because
  // the draws would have come out of the round being played.
  const candidates = legalMoves(round.grid, round.cells, round.mix, round.rules).map((option) => {
    const played = playMove(round, option.from, option.to)!
    return {
      option,
      waves: played.report.waves.length,
      total: played.report.waves.reduce((sum, wave) => sum + wave.points, 0),
      first: played.report.waves[0].points,
    }
  })

  expect(candidates.length).toBeGreaterThan(1)
  expect(snapshot(round)).toEqual(before)

  // The lookahead sees something an immediate-clear evaluation cannot: at
  // least one candidate is worth more than its first wave.
  expect(candidates.some(({ waves }) => waves > 1)).toBe(true)
  expect(candidates.some(({ total, first }) => total > first)).toBe(true)

  // And the round plays on exactly as it would have without any of it.
  const evaluated = playOn(round, 2)
  const untouched = playOn(playOn(startRound(STAGE, { seed: 12 }), 3), 2)
  expect(snapshot(evaluated)).toEqual(snapshot(untouched))
})

test('the mutable half of a round survives a round trip through JSON', () => {
  const round = playOn(startRound(STAGE, { seed: 12 }), 4)
  // `stage`, `grid`, `mix` and `rules` are the round's fixed frame; what a move
  // changes is data, the random stream included.
  const stored = JSON.parse(JSON.stringify(snapshot(round))) as ReturnType<typeof snapshot>
  const restored: RoundState = { ...round, ...stored }

  expect(restored.rng).toEqual(round.rng)
  expect(snapshot(playOn(restored, 3))).toEqual(snapshot(playOn(round, 3)))
})
