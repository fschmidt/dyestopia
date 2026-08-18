/**
 * A round as a value.
 *
 * `resolveCascade` made a *move's* outcome computable without a screen. This
 * is the layer above it: the stage frame — the move budget, the running score,
 * the colour chain, the dead-board reshuffle, and the win or loss those settle
 * into. Together they are enough to play a whole round with nothing drawn,
 * which is what the headless harness needs and what `GameScene` now animates
 * rather than decides.
 *
 * The rule the split keeps: **the model runs to a standstill before anything
 * is drawn.** `playMove` mutates the state and hands back a recording; the
 * scene replays that recording tween by tween. Nothing here waits, nothing
 * here imports Phaser, and every draw from `rng` happens in the same order it
 * did when the scene owned the loop — which is what makes a seeded playout
 * reproducible.
 */

import {
  advanceColorChain,
  breakColorChain,
  comboConversions,
  findLegalMove,
  generateBoard,
  parseMask,
  reshuffle,
  resolveCascade,
  resolveMove,
  scoreResolutionForMerge,
  scoreResolutionForSwap,
  type CascadeWave,
  type Cells,
  type CellMove,
  type ColorChain,
  type ComboRule,
  type Conversion,
  type Grid,
  type MixRule,
  type ScoreResolution,
} from './board'
import type { ColorId } from './colors'
import { mulberry32, type Rng } from './rng'
import { stageMaxMultiplier, stageMix, stagePreset, type Stage } from './stage'

/** Where a round stands: still being played, or over and which way. */
export type Outcome = 'playing' | 'won' | 'lost'

/**
 * Everything a round is. The first block is fixed for the round's life, the
 * second is what a move changes.
 */
export interface RoundState {
  readonly stage: Stage
  readonly grid: Grid
  readonly mix: MixRule
  /** The chain multiplier this stage's recipes can build up to. */
  readonly maxMultiplier: number
  /**
   * The M3 combo spike, passed in rather than read from `flags` — that module
   * reads `window`. A rule rather than a switch so `T-031` can weigh the
   * bounded variant against the full wave; the game only ever asks for `off`
   * or `full`.
   */
  readonly combo: ComboRule

  cells: Cells
  rng: Rng
  score: number
  colorChain: ColorChain
  /** How the last move scored; the HUD reads it, the next move replaces it. */
  resolution: ScoreResolution
  movesLeft: number
  /** The final stage past its target, with the player choosing to keep going. */
  endless: boolean
  outcome: Outcome
  /** The threshold has been crossed at least once — a one-shot celebration. */
  thresholdMet: boolean
}

export interface RoundOptions {
  /** Seeds the round's one `mulberry32` stream. Same seed in, same round out. */
  seed?: number
  combo?: ComboRule
}

/**
 * Deal a stage. The opening board is authored first (`stagePreset`) and the
 * rest dealt from `seed` colours, so the only thing between two runs of the
 * same seed is the stage itself.
 */
export function startRound(stage: Stage, options: RoundOptions = {}): RoundState {
  const rng = mulberry32(options.seed ?? 0)
  const grid = parseMask(stage.board)
  const mix: MixRule = (a, b) => stageMix(stage, a, b)
  return {
    stage,
    grid,
    mix,
    maxMultiplier: stageMaxMultiplier(stage),
    combo: options.combo ?? 'off',
    cells: generateBoard(grid, stage.seed, rng, mix, stagePreset(stage.board, grid)),
    rng,
    score: 0,
    colorChain: { results: [], multiplier: 1 },
    resolution: { kind: 'normal', multiplier: 1, rainbow: false },
    movesLeft: stage.moves,
    endless: false,
    outcome: 'playing',
    thresholdMet: false,
  }
}

/** What one legal move did, in the order the scene has to play it back. */
export interface MoveReport {
  kind: 'merge' | 'swap'
  /** The colour a merge produced; absent on a swap. */
  result?: ColorId
  /** The chain multiplier before the move — what the HUD animates away from. */
  previousMultiplier: number
  /** The resolution this move's clears scored at, cascades included. */
  resolution: ScoreResolution
  /** Combo conversions, already applied to `cells`. Empty unless `combo` is on. */
  conversions: Conversion[]
  waves: CascadeWave[]
  /** The score before the cascade — add wave points to replay the climb. */
  scoreBefore: number
  /** Index of the wave that first crossed the threshold, if one did. */
  thresholdWave: number | null
  /**
   * A scoring swap spends the chain, so it breaks afterwards — carrying the
   * multiplier it was worth, because the HUD animates down from it.
   */
  chainBreak: { previousMultiplier: number } | null
}

export interface MoveOptions {
  /** The free-move tool: a drop may land anywhere, not just next door. */
  allowDistant?: boolean
}

/**
 * Play one drop and settle the board it leaves behind.
 *
 * Returns `null` when the rules refuse the drop — nothing is spent, nothing
 * moves, and the caller's only job is to say so. A legal move spends from the
 * budget *before* it resolves, which is why a move that wins still costs one.
 *
 * Stops at the settled board rather than going on to declare a winner: see
 * `settleRound` for why those are two calls.
 */
export function playMove(
  round: RoundState,
  from: number,
  to: number,
  options: MoveOptions = {},
): MoveReport | null {
  const move = resolveMove(round.grid, round.cells, round.mix, from, to, {
    allowDistant: options.allowDistant,
  })
  if (move.kind === 'illegal') return null

  const previousMultiplier = round.colorChain.multiplier
  if (!round.endless) round.movesLeft--

  let conversions: Conversion[] = []
  if (move.kind === 'merge') {
    // The merge clears at the chain it arrived with; its result raises the
    // chain only for later moves.
    round.resolution = scoreResolutionForMerge(round.colorChain, round.maxMultiplier)
    round.colorChain = advanceColorChain(round.colorChain, move.result, round.maxMultiplier)
    round.cells[from] = round.cells[to] = move.result
    conversions = comboConversions(round.grid, round.cells, [from, to], round.combo)
  } else {
    round.resolution = scoreResolutionForSwap(round.colorChain, round.maxMultiplier)
    ;[round.cells[from], round.cells[to]] = [round.cells[to], round.cells[from]]
  }

  const resolution = round.resolution
  const scoreBefore = round.score
  const waves = resolveCascade(
    round.grid,
    round.cells,
    resolution.multiplier,
    round.stage.seed,
    round.rng,
  )

  let thresholdWave: number | null = null
  for (const [wave, { points }] of waves.entries()) {
    round.score += points
    if (!round.thresholdMet && round.score >= round.stage.threshold) {
      round.thresholdMet = true
      thresholdWave = wave
    }
  }

  let chainBreak: MoveReport['chainBreak'] = null
  if (move.kind === 'swap') {
    chainBreak = { previousMultiplier: round.colorChain.multiplier }
    round.colorChain = breakColorChain(round.colorChain)
    round.resolution = { kind: 'normal', multiplier: 1, rainbow: false }
  }

  return {
    kind: move.kind,
    result: move.kind === 'merge' ? move.result : undefined,
    previousMultiplier,
    resolution,
    conversions,
    waves,
    scoreBefore,
    thresholdWave,
    chainBreak,
  }
}

/**
 * Has the round been won? Asks without committing, which is what the final
 * stage needs: it offers unlimited play instead of a win screen, and the offer
 * has to be made while the round is still officially being played.
 */
export function isWon(round: RoundState): boolean {
  return round.score >= round.stage.threshold && !round.endless
}

/** What settling the board after a move decided. */
export interface Settlement {
  /** The tiles a dead board was rearranged into; `null` when it was still alive. */
  reshuffled: CellMove[] | null
  outcome: Outcome
}

/**
 * Decide the round's fate now the board has stopped moving: the threshold
 * reached wins, a dead board is revived at no cost, and an empty budget loses.
 *
 * Separate from `playMove` because a caller may end the round on its own terms
 * first — a tutorial finishes the moment its goal is met, before the stage
 * frame gets a say, and settling anyway would draw from `rng` for a reshuffle
 * nobody will see.
 */
export function settleRound(round: RoundState): Settlement {
  if (isWon(round)) {
    round.outcome = 'won'
    return { reshuffled: null, outcome: round.outcome }
  }

  let reshuffled: CellMove[] | null = null
  if (!findLegalMove(round.grid, round.cells, round.mix)) {
    const shuffled = reshuffle(round.grid, round.cells, round.rng, round.mix)
    round.cells = shuffled.cells
    reshuffled = shuffled.moves
  }

  if (!round.endless && round.movesLeft <= 0) round.outcome = 'lost'
  return { reshuffled, outcome: round.outcome }
}
