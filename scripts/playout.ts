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
 * The branching rules `C-001` §4 names are axes rather than switches, so an A/B
 * is one run: `--variant=all` plays every stage under each rule set and prints
 * them against each other, with the baseline — the game as it ships — first and
 * every delta measured from it.
 *
 *   npm run playout -- --variant=all           baseline vs every variant
 *   npm run playout -- --variant=any-mix       one variant, on its own
 */

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
import { BASELINE, VARIANTS, type Variant } from '../src/variants'

interface Options {
  stages: Stage[]
  policies: Policy[]
  variants: Variant[]
  runs: number
  seed: number
  moves: boolean
}

/** A summary and the rule set it was played under — the table's unit. */
interface Row {
  variant: Variant
  summary: Summary
}

function flag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return match?.slice(name.length + 3)
}

function parseVariants(): Variant[] {
  const arg = flag('variant')
  if (arg === undefined) return [BASELINE]
  if (arg === 'all') return [...VARIANTS]

  return arg.split(',').map((name) => {
    const found = VARIANTS.find((variant) => variant.id === name.trim())
    if (!found) {
      throw new Error(
        `Unknown variant "${name.trim()}" — try ${VARIANTS.map((v) => v.id).join(', ')}, or all`,
      )
    }
    return found
  })
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
    variants: parseVariants(),
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

function reportTable(rows: Row[], variants: Variant[]): void {
  const many = variants.length > 1
  const columns: [string, (row: Row) => string][] = [
    ['Stage', ({ summary }) => summary.stage],
    ...(many ? ([['Variant', ({ variant }) => variant.id]] as [string, (row: Row) => string][]) : []),
    ['Policy', ({ summary }) => summary.policy],
    ['Win', ({ summary }) => percent(summary.winRate)],
    ['Score min', ({ summary }) => `${summary.score.min}`],
    ['median', ({ summary }) => `${summary.score.median}`],
    ['mean', ({ summary }) => round1(summary.score.mean)],
    ['max', ({ summary }) => `${summary.score.max}`],
    ['Moves', ({ summary }) => round1(summary.movesUsed.mean)],
    ['Mixes', ({ summary }) => round1(summary.mixes.mean)],
    ['per move', ({ summary }) => rate(summary.mixes.mean, summary.movesUsed.mean)],
    ['Dry', ({ summary }) => round1(summary.dryMixes.mean)],
    ['Tertiaries', ({ summary }) => round1(summary.tertiaries.mean)],
    ['Non-seed open', ({ summary }) => round1(summary.nonSeed.opening)],
    ['close', ({ summary }) => round1(summary.nonSeed.closing)],
    ['net', ({ summary }) => round1(summary.nonSeed.net.mean)],
    ['drain', ({ summary }) => rate(summary.nonSeed.net.mean, summary.movesUsed.mean)],
    ['Reshuffles', ({ summary }) => round1(summary.reshuffles.mean)],
  ]
  table(rows, columns, many ? 3 : 2)
}

/**
 * The gap table, which is the one `T-024` has to read: each variant's
 * greedy-versus-chain gap stated on its own rather than left to be read off two
 * rows of win rates by eye, and — where there is a baseline to compare against —
 * what the variant did to that gap. A rule that lifts both policies equally
 * moves every win rate and scores a `±0.0` here, which is the distinction the
 * measurement cards exist to draw: `T-031` found exactly that and it is the
 * reason the combo wave is gone.
 */
function reportGaps(rows: Row[], variants: Variant[], policies: Policy[]): void {
  if (!policies.some((p) => p.id === 'points') || !policies.some((p) => p.id === 'chain')) return
  const many = variants.length > 1

  const find = (stage: string, variant: Variant, policy: string) =>
    rows.find(
      (row) =>
        row.summary.stage === stage && row.variant === variant && row.summary.policy === policy,
    )?.summary

  const gaps = [...new Set(rows.map((row) => row.summary.stage))].flatMap((stage) =>
    variants.flatMap((variant) => {
      const greedy = find(stage, variant, 'points')
      const builder = find(stage, variant, 'chain')
      if (!greedy || !builder) return []
      const baseGreedy = variant === variants[0] ? undefined : find(stage, variants[0], 'points')
      const baseBuilder = variant === variants[0] ? undefined : find(stage, variants[0], 'chain')
      return [
        {
          variant,
          gap: policyGap(greedy, builder),
          against: baseGreedy && baseBuilder ? policyGap(baseGreedy, baseBuilder) : undefined,
        },
      ]
    }),
  )
  if (gaps.length === 0) return

  console.log(
    `\nThe greedy-versus-chain gap — chain minus points${
      many ? `, and what each variant did to it against ${variants[0].id}` : ''
    }\n`,
  )
  type Gapped = (typeof gaps)[number]
  const columns: [string, (row: Gapped) => string][] = [
    ['Stage', ({ gap }) => gap.stage],
    ...(many
      ? ([['Variant', ({ variant }) => variant.id]] as [string, (row: Gapped) => string][])
      : []),
    ['Win gap', ({ gap }) => signedPercent(gap.winRate)],
    ['Score gap', ({ gap }) => signed(gap.score)],
    ['Move gap', ({ gap }) => signed(gap.movesUsed)],
    ...(many
      ? ([
          [
            'Δ win gap',
            ({ gap, against }) => (against ? signedPercent(gap.winRate - against.winRate) : '—'),
          ],
          ['Δ score gap', ({ gap, against }) => (against ? signed(gap.score - against.score) : '—')],
        ] as [string, (row: Gapped) => string][])
      : []),
  ]
  table(gaps, columns, many ? 2 : 1)
}

function reportMoves(stage: Stage, policy: Policy, seed: number, variant: Variant): void {
  const playout = playOut(stage, seed, policy, { rules: variant.rules })
  console.log(
    `\n${stage.name} · ${policy.id} · ${variant.id} · seed ${seed} — ` +
      `${playout.outcome}, ${playout.score} points\n`,
  )
  console.log('  #  kind   points  ×  waves  cleared  non-seed')
  console.log('  -  -----  ------  -  -----  -------  --------')
  playout.moves.forEach((move, index) => {
    console.log(
      [
        padLeft(`${index + 1}`, 3),
        pad(move.kind, 5),
        padLeft(`${move.points}`, 6),
        padLeft(`${move.multiplier}`, 1),
        padLeft(`${move.waves}`, 5),
        padLeft(`${move.cleared}`, 7),
        padLeft(`${move.nonSeed}`, 8),
        move.reshuffled ? ' reshuffled' : '',
      ].join('  '),
    )
  })
}

function main(): void {
  const options = parseOptions()

  if (options.moves) {
    reportMoves(options.stages[0], options.policies[0], options.seed, options.variants[0])
    return
  }

  const rows: Row[] = []
  for (const stage of options.stages) {
    for (const variant of options.variants) {
      for (const policy of options.policies) {
        const { summary } = runStage(stage, policy, options.runs, options.seed, {
          rules: variant.rules,
        })
        rows.push({ variant, summary })
      }
    }
  }

  console.log(
    `\n${options.runs} playouts per row, seeds ${options.seed}–${options.seed + options.runs - 1}` +
      `, ${options.variants.map((variant) => variant.id).join(' vs ')}\n`,
  )
  reportTable(rows, options.variants)
  reportGaps(rows, options.variants, options.policies)

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

Read a variant on the two per-move columns and the gap table rather than on the
win rate. A change that raises every win rate has made the game easier, which is
never what a supply or legality lever was cut for. One that widens the gap has
made building pay; one that leaves the gap where it found it has not, however
much it moved the score. That is how T-031 read the combo wave, and it is why
the wave is no longer in the game.

Dry is merges that cleared nothing, which is zero under the baseline by
definition — a merge is only legal there if it clears. Tertiaries is tier-2
tiles cleared per run, and it starts near zero on every stage: no tertiary clear
has been seen in play, so a variant that does not produce one has not reached
the deep end of the palette however much else it moved.
`)
}

main()
