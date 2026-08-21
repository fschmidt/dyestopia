/**
 * Playing a stage with no screen attached.
 *
 * `src/round.ts` made a round a value; this drives it. A policy chooses among
 * the legal moves, `playOut` runs one seeded round to its end, and `summarise`
 * folds many of them into a distribution. Nothing here reimplements a rule —
 * every move goes through `playMove`, so the simulator and the game cannot
 * drift apart. That is the whole point of the exercise (`T-022`).
 *
 * **What these numbers do and do not support.** Comparing two configurations
 * under one fixed policy is a relative claim, and it holds: the bots are the
 * constant. Predicting how *hard* a stage feels to a person does not follow
 * from it. The literature is consistent that greedy bots do not track human
 * difficulty — automated match-3 playtesting needs MCTS with evolved utilities
 * or a trained network before its win rates mean that — and these two are well
 * below that bar by design. Read a win rate here as "this change made the stage
 * easier or harder than it was", never as "this stage is 60% winnable".
 */

import { advanceColorChain, clearScore, findMatches, legalMoves, scoreResolutionForMerge, scoreResolutionForSwap, type Cells, type LegalMove } from './board'
import { colorTier, type ColorId } from './colors'
import { playMove, settleRound, startRound, type Outcome, type RoundState } from './round'
import type { Stage } from './stage'
import { BASELINE_RULES, type RuleSet } from './variants'

/**
 * How a bot picks its move. Given the settled board and every legal drop on
 * it, return one — the list is never empty, because a dead board is reshuffled
 * before the policy is asked.
 */
export interface Policy {
  id: string
  label: string
  choose(round: RoundState, options: LegalMove[]): LegalMove
}

/**
 * What a move would pay if it were played right now: the immediate clear only,
 * scored at the resolution the move would earn. Cascades are deliberately not
 * simulated — they need the `rng`, and drawing from it to *evaluate* a move
 * would change the round the bot is playing. That limit is worth remembering
 * when reading `cascadeScoring`: neither bot can see a cascade coming, so a
 * variant that pays for long ones is measured on the cascades that happen
 * anyway, not on a player steering into them.
 *
 * The merge branch reads `mergeScoring` because it must. A bot evaluating
 * merges at the pre-merge chain while the round scores them at the post-merge
 * one is not playing the variant, and the difference would land in the numbers
 * as if the rule had done it.
 */
function immediateScore(round: RoundState, option: LegalMove): number {
  const trial: (ColorId | null)[] = round.cells.slice()
  const chainForMerge =
    option.move.kind === 'merge' && round.rules.mergeScoring === 'own-clear'
      ? advanceColorChain(round.colorChain, option.move.result, round.maxMultiplier)
      : round.colorChain
  const resolution =
    option.move.kind === 'merge'
      ? scoreResolutionForMerge(chainForMerge, round.maxMultiplier)
      : scoreResolutionForSwap(round.colorChain, round.maxMultiplier)
  if (option.move.kind === 'merge') {
    trial[option.from] = trial[option.to] = option.move.result
  } else {
    ;[trial[option.from], trial[option.to]] = [trial[option.to], trial[option.from]]
  }
  const matched = [...findMatches(round.grid, trial)]
  return clearScore(matched.map((index) => trial[index]!), resolution.multiplier)
}

/**
 * Best by score, ties broken by position. The tie-break is not cosmetic: two
 * moves worth the same must resolve the same way every run, or the playout
 * stops being reproducible.
 */
function best(round: RoundState, options: LegalMove[]): LegalMove {
  let choice = options[0]
  let bestScore = immediateScore(round, choice)
  for (const option of options.slice(1)) {
    const score = immediateScore(round, option)
    if (score > bestScore || (score === bestScore && option.from < choice.from)) {
      choice = option
      bestScore = score
    }
  }
  return choice
}

/** Take the points in front of you. The obvious bot, and the shallow one. */
export const POINTS_POLICY: Policy = {
  id: 'points',
  label: 'chases points',
  choose: (round, options) => best(round, options),
}

/**
 * Play the game the way it is designed to be played: mix distinct colours to
 * raise the chain, then spend it on a swap. Falls back to points whenever the
 * board offers nothing better, which on a tight board is most of the time.
 */
export const CHAIN_POLICY: Policy = {
  id: 'chain',
  label: 'builds the chain',
  choose: (round, options) => {
    const merges = options.filter((option) => option.move.kind === 'merge')
    const swaps = options.filter((option) => option.move.kind === 'swap')

    // At the ceiling the chain cannot grow, so it is only worth what a swap
    // cashes it in for.
    if (round.colorChain.multiplier >= round.maxMultiplier && swaps.length > 0) {
      return best(round, swaps)
    }

    const growers = merges.filter(
      (option) =>
        option.move.kind === 'merge' && !round.colorChain.results.includes(option.move.result),
    )
    if (growers.length > 0) return best(round, growers)
    if (merges.length > 0) return best(round, merges)
    return best(round, options)
  },
}

/**
 * Mix at every opportunity and cash in only when there is nothing left to mix.
 *
 * Under the baseline this is barely distinguishable from `chain` — every merge
 * clears, so hoarding mixes and spending them are the same act, which is
 * `C-001`'s point about the two being welded together. Under `any-mix` it is
 * the question `C-001` leaves open made into a bot: if a merge can resolve
 * without clearing, what stops a player mixing the whole board before cashing
 * in once? This one tries, and the move budget is the only thing in its way
 * (`T-036` AC #3).
 */
export const HOARD_POLICY: Policy = {
  id: 'hoard',
  label: 'mixes while it can',
  choose: (round, options) => {
    const merges = options.filter((option) => option.move.kind === 'merge')
    if (merges.length === 0) return best(round, options)

    // Prefer a mix that grows the chain; failing that, any mix at all. Score is
    // deliberately not the tie-break — a hoarder that fell back to points would
    // stop being a test of hoarding.
    const growers = merges.filter(
      (option) =>
        option.move.kind === 'merge' && !round.colorChain.results.includes(option.move.result),
    )
    const pool = growers.length > 0 ? growers : merges
    return pool.reduce((choice, option) => (option.from < choice.from ? option : choice), pool[0])
  },
}

export const POLICIES: Policy[] = [POINTS_POLICY, CHAIN_POLICY, HOARD_POLICY]

/** One move as the harness saw it. */
export interface MoveRecord {
  kind: 'merge' | 'swap'
  points: number
  waves: number
  /** The chain multiplier the move scored at. */
  multiplier: number
  /**
   * Tiles standing on the settled board whose colour is not a stage seed
   * colour — every secondary and tertiary in play. `C-001` argues this pool
   * only ever shrinks, because a merge spends three to return one and refills
   * drop seeds only. This is the count that settles it.
   */
  nonSeed: number
  /**
   * Tiles this move cleared, cascades included. Zero on a merge is a *dry
   * mix* — impossible under the baseline, where a merge is only legal if it
   * clears, and the whole point of the `any-mix` variant.
   */
  cleared: number
  /**
   * Tier-2 tiles among them. `T-036` treats this as the variant's real test:
   * no tertiary clear has ever been observed in play, so a rule that raises
   * the win rate without producing one has not solved the problem it was cut
   * for, whatever else it moved.
   */
  tertiaries: number
  /** The board was dead after this move and had to be rearranged. */
  reshuffled: boolean
}

export interface Playout {
  seed: number
  outcome: Outcome
  score: number
  movesUsed: number
  moves: MoveRecord[]
  /** The move cap was hit before the round ended — a bottomless stage, not a result. */
  truncated: boolean
}

export interface PlayoutOptions {
  /**
   * Stops a bottomless stage (the dev board's budget is effectively infinite)
   * from running forever. A playout that hits it is reported, never counted as
   * a loss.
   */
  maxMoves?: number
  /**
   * Which form of each branching rule to play under. Defaults to the baseline,
   * so a caller that does not care about variants gets the game as it ships.
   */
  rules?: RuleSet
}

const DEFAULT_MAX_MOVES = 500

/** Tiles in play that a refill could never have produced. */
function nonSeedCount(cells: Cells, seed: readonly ColorId[]): number {
  let count = 0
  for (const color of cells) if (color !== null && !seed.includes(color)) count++
  return count
}

/** One seeded round, played to a win, a loss, or the move cap. */
export function playOut(
  stage: Stage,
  seed: number,
  policy: Policy,
  options: PlayoutOptions = {},
): Playout {
  const maxMoves = options.maxMoves ?? DEFAULT_MAX_MOVES
  const rules = options.rules ?? BASELINE_RULES
  let round = startRound(stage, { seed, rules })
  const moves: MoveRecord[] = []
  let truncated = false

  while (round.outcome === 'playing') {
    if (moves.length >= maxMoves) {
      truncated = true
      break
    }
    const options_ = legalMoves(round.grid, round.cells, round.mix, rules)
    // The board is reshuffled while it still has moves left, so an empty list
    // means the rules have run out of answers rather than the bot having.
    if (options_.length === 0) break

    const choice = policy.choose(round, options_)
    const before = round.score
    const played = playMove(round, choice.from, choice.to)
    if (!played) throw new Error(`Policy "${policy.id}" chose a move the rules refuse`)
    const { report } = played
    const settlement = settleRound(played.round)
    round = settlement.round

    const cleared = report.waves.flatMap((wave) => wave.colors)
    moves.push({
      kind: report.kind,
      points: round.score - before,
      waves: report.waves.length,
      multiplier: report.resolution.multiplier,
      nonSeed: nonSeedCount(round.cells, stage.seed),
      cleared: cleared.length,
      tertiaries: cleared.filter((color) => colorTier(color) === 2).length,
      reshuffled: settlement.reshuffled !== null,
    })
  }

  return {
    seed,
    outcome: round.outcome,
    score: round.score,
    movesUsed: moves.length,
    moves,
    truncated,
  }
}

export interface Spread {
  min: number
  median: number
  mean: number
  max: number
}

function spread(values: number[]): Spread {
  if (values.length === 0) return { min: 0, median: 0, mean: 0, max: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return {
    min: sorted[0],
    median:
      sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle],
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    max: sorted[sorted.length - 1],
  }
}

export interface Summary {
  stage: string
  policy: string
  playouts: number
  wins: number
  winRate: number
  truncated: number
  score: Spread
  movesUsed: Spread
  /** The non-seed pool as the round opens and as it ends, averaged over playouts. */
  nonSeed: { opening: number; closing: number; net: Spread }
  /**
   * Merges performed per run. The supply hypothesis is about mixes rather than
   * moves — a rule that raises the win rate without raising this has not made
   * chain play any more available, it has only paid better for the same play.
   */
  mixes: Spread
  /**
   * Merges that cleared nothing, per run. Always zero under the baseline —
   * a non-zero column is the `any-mix` variant doing the thing it exists to
   * do, and the number to read the supply figures against.
   */
  dryMixes: Spread
  /** Tier-2 tiles cleared per run. See `MoveRecord.tertiaries`. */
  tertiaries: Spread
  reshuffles: Spread
}

export function summarise(stage: Stage, policy: Policy, playouts: Playout[]): Summary {
  const withMoves = playouts.filter((playout) => playout.moves.length > 0)
  const wins = playouts.filter((playout) => playout.outcome === 'won').length
  return {
    stage: stage.name,
    policy: policy.id,
    playouts: playouts.length,
    wins,
    winRate: playouts.length === 0 ? 0 : wins / playouts.length,
    truncated: playouts.filter((playout) => playout.truncated).length,
    score: spread(playouts.map((playout) => playout.score)),
    movesUsed: spread(playouts.map((playout) => playout.movesUsed)),
    nonSeed: {
      opening: spread(withMoves.map((playout) => playout.moves[0].nonSeed)).mean,
      closing: spread(withMoves.map((playout) => playout.moves.at(-1)!.nonSeed)).mean,
      net: spread(
        withMoves.map((playout) => playout.moves.at(-1)!.nonSeed - playout.moves[0].nonSeed),
      ),
    },
    mixes: spread(
      playouts.map((playout) => playout.moves.filter((move) => move.kind === 'merge').length),
    ),
    dryMixes: spread(
      playouts.map(
        (playout) =>
          playout.moves.filter((move) => move.kind === 'merge' && move.cleared === 0).length,
      ),
    ),
    tertiaries: spread(
      playouts.map((playout) =>
        playout.moves.reduce((sum, move) => sum + move.tertiaries, 0),
      ),
    ),
    reshuffles: spread(
      playouts.map((playout) => playout.moves.filter((move) => move.reshuffled).length),
    ),
  }
}

/**
 * The greedy-versus-chain gap, chain minus points, as a figure in its own
 * right — that gap is the thing `T-024` is trying to widen, and reading it off
 * two rows by eye is how a variant that merely made the game easier gets
 * mistaken for one that made building necessary. A rule that lifts both lines
 * equally leaves every field here where it found it.
 */
export interface Gap {
  stage: string
  winRate: number
  score: number
  movesUsed: number
}

export function policyGap(points: Summary, chain: Summary): Gap {
  return {
    stage: points.stage,
    winRate: chain.winRate - points.winRate,
    score: chain.score.mean - points.score.mean,
    movesUsed: chain.movesUsed.mean - points.movesUsed.mean,
  }
}

/** N playouts of one stage under one policy, from consecutive seeds. */
export function runStage(
  stage: Stage,
  policy: Policy,
  runs: number,
  firstSeed: number,
  options: PlayoutOptions = {},
): { playouts: Playout[]; summary: Summary } {
  const playouts: Playout[] = []
  for (let i = 0; i < runs; i++) playouts.push(playOut(stage, firstSeed + i, policy, options))
  return { playouts, summary: summarise(stage, policy, playouts) }
}
