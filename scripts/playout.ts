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
 *
 * The combo wave is an axis rather than a switch (`T-031`), so the A/B is one
 * run: `--combo=all` plays every stage under each rule and prints the rules
 * against each other, with `off` — the game as it ships — as the baseline.
 *
 *   npm run playout -- --combo=all             off vs full vs contact
 *   npm run playout -- --combo=off,contact     just the bounded variant
 *   npm run playout -- --combo                 the full wave alone, as before
 */

import { COMBO_RULES, type ComboRule } from '../src/board'
import {
  POLICIES,
  playOut,
  policyGap,
  runStage,
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
  rules: ComboRule[]
  moves: boolean
}

/** A summary and the rule it was played under — the table's unit. */
interface Row {
  rule: ComboRule
  summary: Summary
}

function flag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return match?.slice(name.length + 3)
}

function parseRules(): ComboRule[] {
  const arg = flag('combo')
  // Bare `--combo` keeps its old meaning: the full wave, on its own.
  if (arg === undefined) return process.argv.includes('--combo') ? ['full'] : ['off']
  if (arg === 'all') return [...COMBO_RULES]

  const named = arg.split(',').map((name) => name.trim())
  for (const name of named) {
    if (!COMBO_RULES.includes(name as ComboRule)) {
      throw new Error(`Unknown combo rule "${name}" — try ${COMBO_RULES.join(', ')}, or all`)
    }
  }
  return named as ComboRule[]
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
    rules: parseRules(),
    moves: process.argv.includes('--moves'),
  }
}

const pad = (text: string, width: number) => text.padEnd(width)
const padLeft = (text: string, width: number) => text.padStart(width)
const round1 = (value: number) => value.toFixed(1)
const percent = (value: number) => `${(value * 100).toFixed(1)}%`

/**
 * A per-move rate, as a ratio of the two means. Round length is itself one of
 * the things a combo rule changes, so a count per *run* moves for two reasons
 * at once and a reader cannot tell them apart — mixes fall under the full wave
 * while mixing becomes more available, because the round ends sooner. The rate
 * separates them.
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

function reportTable(rows: Row[], rules: ComboRule[]): void {
  const columns: [string, (row: Row) => string][] = [
    ['Stage', ({ summary }) => summary.stage],
    ...(rules.length > 1 ? ([['Rule', ({ rule }) => rule]] as [string, (row: Row) => string][]) : []),
    ['Policy', ({ summary }) => summary.policy],
    ['Win', ({ summary }) => percent(summary.winRate)],
    ['Score min', ({ summary }) => `${summary.score.min}`],
    ['median', ({ summary }) => `${summary.score.median}`],
    ['mean', ({ summary }) => round1(summary.score.mean)],
    ['max', ({ summary }) => `${summary.score.max}`],
    ['Moves', ({ summary }) => round1(summary.movesUsed.mean)],
    ['Mixes', ({ summary }) => round1(summary.mixes.mean)],
    ['per move', ({ summary }) => rate(summary.mixes.mean, summary.movesUsed.mean)],
    ['Non-seed open', ({ summary }) => round1(summary.nonSeed.opening)],
    ['close', ({ summary }) => round1(summary.nonSeed.closing)],
    ['net', ({ summary }) => round1(summary.nonSeed.net.mean)],
    ['drain', ({ summary }) => rate(summary.nonSeed.net.mean, summary.movesUsed.mean)],
    ['Reshuffles', ({ summary }) => round1(summary.reshuffles.mean)],
  ]
  table(rows, columns, rules.length > 1 ? 3 : 2)
}

/**
 * The gap table, which is the one `T-024` has to read. Each rule's
 * greedy-versus-chain gap, and — where there is a baseline to compare against —
 * what the rule did to that gap. A rule that lifts both policies equally scores
 * a large win-rate change and a `±0.0` here, and that is the whole distinction
 * the card exists to draw.
 */
function reportGaps(rows: Row[], rules: ComboRule[], policies: Policy[]): void {
  const points = policies.find((policy) => policy.id === 'points')
  const chain = policies.find((policy) => policy.id === 'chain')
  if (!points || !chain) return

  const stages = [...new Set(rows.map(({ summary }) => summary.stage))]
  const find = (stage: string, rule: ComboRule, policy: string) =>
    rows.find(
      (row) => row.summary.stage === stage && row.rule === rule && row.summary.policy === policy,
    )?.summary

  const gaps = stages.flatMap((stage) =>
    rules.flatMap((rule) => {
      const greedy = find(stage, rule, 'points')
      const builder = find(stage, rule, 'chain')
      if (!greedy || !builder) return []
      const baseline = rules[0] === rule ? undefined : find(stage, rules[0], 'points')
      const baselineChain = rules[0] === rule ? undefined : find(stage, rules[0], 'chain')
      return [
        {
          rule,
          gap: policyGap(greedy, builder),
          against:
            baseline && baselineChain ? policyGap(baseline, baselineChain) : undefined,
        },
      ]
    }),
  )
  if (gaps.length === 0) return

  console.log(`
The greedy-versus-chain gap — chain minus points${
    rules.length > 1 ? `, and what each rule did to it against ${rules[0]}` : ''
  }
`)
  type Gapped = (typeof gaps)[number]
  const columns: [string, (row: Gapped) => string][] = [
    ['Stage', ({ gap }) => gap.stage],
    ...(rules.length > 1 ? ([['Rule', ({ rule }) => rule]] as [string, (row: Gapped) => string][]) : []),
    ['Win gap', ({ gap }) => signedPercent(gap.winRate)],
    ['Score gap', ({ gap }) => signed(gap.score)],
    ['Move gap', ({ gap }) => signed(gap.movesUsed)],
    ...(rules.length > 1
      ? ([
          ['Δ win gap', ({ gap, against }) => (against ? signedPercent(gap.winRate - against.winRate) : '—')],
          ['Δ score gap', ({ gap, against }) => (against ? signed(gap.score - against.score) : '—')],
        ] as [string, (row: Gapped) => string][])
      : []),
  ]
  table(gaps, columns, rules.length > 1 ? 2 : 1)
}

function reportMoves(stage: Stage, policy: Policy, seed: number, combo: ComboRule): void {
  const playout = playOut(stage, seed, policy, { combo })
  console.log(
    `\n${stage.name} · ${policy.id} · seed ${seed} · combo ${combo} — ` +
      `${playout.outcome}, ${playout.score} points\n`,
  )
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
    reportMoves(options.stages[0], options.policies[0], options.seed, options.rules[0])
    return
  }

  const rows: Row[] = []
  for (const stage of options.stages) {
    for (const rule of options.rules) {
      for (const policy of options.policies) {
        const { summary } = runStage(stage, policy, options.runs, options.seed, { combo: rule })
        rows.push({ rule, summary })
      }
    }
  }

  console.log(
    `\n${options.runs} playouts per row, seeds ${options.seed}–${options.seed + options.runs - 1}` +
      `, combo ${options.rules.join(' vs ')}\n`,
  )
  reportTable(rows, options.rules)
  reportGaps(rows, options.rules, options.policies)

  const truncated = rows.reduce((sum, { summary }) => sum + summary.truncated, 0)
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

The combo rules are three answers to that scarcity: off is the game as it ships,
full is the flood-fill prototype, and contact is the same idea bounded to the
tiles the merge already touches. Read them on the two per-move columns and the
gap table rather than on the win rate — a rule that raises every win rate has made the game
easier, which is not what the wave was cut for. A rule that widens the gap has
made building pay; a rule that leaves the gap where it found it has not, however
much it moved the score.
`)
}

main()
