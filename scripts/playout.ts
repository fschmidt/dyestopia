/**
 * `npm run playout` — play stages many times with no screen attached and print
 * the outcome as a distribution.
 *
 * The simulator is `src/playout.ts`; this file is only the command line and the
 * report. Everything it prints comes from the same `playMove` the game runs, so
 * a rule that changes in the engine changes here too, without anyone
 * remembering to update a second copy.
 *
 *   npm run playout                          all core stages, both policies
 *   npm run playout -- --stage=3 --runs=500
 *   npm run playout -- --policy=chain --seed=1000
 *   npm run playout -- --moves                 per-move detail for one playout
 */

import {
  POLICIES,
  playOut,
  policyGap,
  runStage,
  type Gap,
  type Policy,
  type Summary,
} from '../src/playout'
import { STAGES } from '../src/stages'
import { FIRST_STAGE, type Stage } from '../src/stage'

interface Options {
  stages: Stage[]
  policies: Policy[]
  runs: number
  seed: number
  moves: boolean
}

function flag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return match?.slice(name.length + 3)
}

function parseOptions(): Options {
  const stageArg = flag('stage')
  const stages =
    stageArg === undefined || stageArg === 'all'
      ? STAGES
      : stageArg === 'dev'
        ? [FIRST_STAGE]
        : [STAGES[Number(stageArg)] ?? STAGES[0]]

  const policyArg = flag('policy')
  const policies =
    policyArg === undefined || policyArg === 'all'
      ? POLICIES
      : POLICIES.filter((policy) => policy.id === policyArg)

  if (policies.length === 0) {
    throw new Error(`Unknown policy "${policyArg}" — try ${POLICIES.map((p) => p.id).join(', ')}`)
  }

  return {
    stages,
    policies,
    runs: Number(flag('runs') ?? 200),
    seed: Number(flag('seed') ?? 1),
    moves: process.argv.includes('--moves'),
  }
}

const pad = (text: string, width: number) => text.padEnd(width)
const padLeft = (text: string, width: number) => text.padStart(width)
const round1 = (value: number) => value.toFixed(1)
const percent = (value: number) => `${(value * 100).toFixed(1)}%`

/**
 * A per-move rate, as a ratio of the two means. Round length is itself one of
 * the things a rule variant changes, so a count per *run* moves for two reasons
 * at once and a reader cannot tell them apart. `T-031` is the worked example:
 * mixes per run *fell* under the combo wave while mixing became *more*
 * available, because the round ended sooner. The rate separates them, and
 * without it the table said the opposite of what happened.
 */
const rate = (value: number, moves: number) => (moves === 0 ? '—' : (value / moves).toFixed(2))

const signed = (value: number, digits = 1) =>
  `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value).toFixed(digits)}`
const signedPercent = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : '±'}${(Math.abs(value) * 100).toFixed(1)}%`

/** Left-aligned label columns, right-aligned figures, widths from the content. */
function table<T>(rows: T[], columns: [string, (row: T) => string][], labels: number): void {
  const widths = columns.map(([header, read]) =>
    Math.max(header.length, ...rows.map((row) => read(row).length)),
  )
  console.log(columns.map(([header], i) => pad(header, widths[i])).join('  '))
  console.log(widths.map((width) => '-'.repeat(width)).join('  '))
  for (const row of rows) {
    console.log(
      columns
        .map(([, read], i) => (i < labels ? pad(read(row), widths[i]) : padLeft(read(row), widths[i])))
        .join('  '),
    )
  }
}

function reportTable(summaries: Summary[]): void {
  const columns: [string, (s: Summary) => string][] = [
    ['Stage', (s) => s.stage],
    ['Policy', (s) => s.policy],
    ['Win', (s) => percent(s.winRate)],
    ['Score min', (s) => `${s.score.min}`],
    ['median', (s) => `${s.score.median}`],
    ['mean', (s) => round1(s.score.mean)],
    ['max', (s) => `${s.score.max}`],
    ['Moves', (s) => round1(s.movesUsed.mean)],
    ['Mixes', (s) => round1(s.mixes.mean)],
    ['per move', (s) => rate(s.mixes.mean, s.movesUsed.mean)],
    ['Non-seed open', (s) => round1(s.nonSeed.opening)],
    ['close', (s) => round1(s.nonSeed.closing)],
    ['net', (s) => round1(s.nonSeed.net.mean)],
    ['drain', (s) => rate(s.nonSeed.net.mean, s.movesUsed.mean)],
    ['Reshuffles', (s) => round1(s.reshuffles.mean)],
  ]
  table(summaries, columns, 2)
}

/**
 * The gap table, which is the one `T-024` has to read: the greedy-versus-chain
 * gap per stage, stated on its own rather than left to be read off two rows of
 * win rates by eye. A variant that lifts both policies equally moves every win
 * rate and leaves this table where it found it, which is the distinction the
 * measurement cards exist to draw — `T-031` found exactly that and it is the
 * reason the combo wave is gone.
 */
function reportGaps(summaries: Summary[], policies: Policy[]): void {
  if (!policies.some((p) => p.id === 'points') || !policies.some((p) => p.id === 'chain')) return

  const find = (stage: string, policy: string) =>
    summaries.find((summary) => summary.stage === stage && summary.policy === policy)

  const gaps = [...new Set(summaries.map((summary) => summary.stage))].flatMap((stage) => {
    const greedy = find(stage, 'points')
    const builder = find(stage, 'chain')
    return greedy && builder ? [policyGap(greedy, builder)] : []
  })
  if (gaps.length === 0) return

  console.log('\nThe greedy-versus-chain gap — chain minus points\n')
  table<Gap>(
    gaps,
    [
      ['Stage', (gap) => gap.stage],
      ['Win gap', (gap) => signedPercent(gap.winRate)],
      ['Score gap', (gap) => signed(gap.score)],
      ['Move gap', (gap) => signed(gap.movesUsed)],
    ],
    1,
  )
}

function reportMoves(stage: Stage, policy: Policy, seed: number): void {
  const playout = playOut(stage, seed, policy)
  console.log(`\n${stage.name} · ${policy.id} · seed ${seed} — ${playout.outcome}, ${playout.score} points\n`)
  console.log('  #  kind   points  ×  waves  non-seed')
  console.log('  -  -----  ------  -  -----  --------')
  playout.moves.forEach((move, index) => {
    console.log(
      [
        padLeft(`${index + 1}`, 3),
        pad(move.kind, 5),
        padLeft(`${move.points}`, 6),
        padLeft(`${move.multiplier}`, 1),
        padLeft(`${move.waves}`, 5),
        padLeft(`${move.nonSeed}`, 8),
        move.reshuffled ? ' reshuffled' : '',
      ].join('  '),
    )
  })
}

function main(): void {
  const options = parseOptions()

  if (options.moves) {
    reportMoves(options.stages[0], options.policies[0], options.seed)
    return
  }

  const summaries: Summary[] = []
  for (const stage of options.stages) {
    for (const policy of options.policies) {
      const { summary } = runStage(stage, policy, options.runs, options.seed)
      summaries.push(summary)
    }
  }

  console.log(
    `\n${options.runs} playouts per row, seeds ${options.seed}–${options.seed + options.runs - 1}\n`,
  )
  reportTable(summaries)
  reportGaps(summaries, options.policies)

  const truncated = summaries.reduce((sum, summary) => sum + summary.truncated, 0)
  if (truncated > 0) {
    console.log(`\n${truncated} playout(s) hit the move cap and are not wins or losses.`)
  }

  console.log(`
Reading these numbers
---------------------
Comparing two configurations under one fixed policy is a relative claim, and it
holds — the bot is the constant. A win rate is not a prediction of how hard a
stage feels: greedy policies are known not to track human difficulty, and both
of these are well below the bar (MCTS with evolved utilities, or a trained
network) at which automated match-3 playtesting starts to. Read a row as "this
change made the stage harder than it was", never as "this stage is winnable
that often".

The non-seed columns are the supply economy: every secondary and tertiary
standing on the board, as the round opens and as it ends. Refills only ever drop
seed colours and a merge spends three tiles to return one, so C-001 predicts the
net column is never positive. That is the claim this harness exists to test
rather than argue.

Read a variant on the two per-move columns and the gap table rather than on the
win rate. A change that raises every win rate has made the game easier, which is
never what a supply or legality lever was cut for. One that widens the gap has
made building pay; one that leaves the gap where it found it has not, however
much it moved the score. That is how T-031 read the combo wave, and it is why
the wave is no longer in the game.
`)
}

main()
