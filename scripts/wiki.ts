/**
 * Wiki generator and integrity check.
 *
 * `npm run wiki` rewrites every generated block from source; `npm run wiki:check`
 * verifies they are current and exits 1 if not. The check runs inside `build`,
 * so a stale wiki fails the Pages deploy.
 *
 * Everything derivable is generated rather than asserted: the colour wheel, the
 * stage table, the tutorial list, the npm scripts and the `src/` file map all
 * come from the code, so they cannot disagree with it. What can't be generated
 * is checked instead — dead paths, planning protocol, and source hash pins.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { COLORS, colorTier, colorValue } from '../src/colors'
import { STAGE_SECTIONS } from '../src/stage-catalog'
import { stageMaxMultiplier, stageMixes, type Stage } from '../src/stage'
import { checkPlanningProtocol, recordIndexes } from './planning-protocol'
const CHECK = process.argv.includes('--check')
const ROOT = resolve(process.cwd())

/** Below this, a generator has silently stopped matching and must fail loudly. */
const MIN_ROWS = 3

const planning = checkPlanningProtocol(ROOT)
const problems = planning.problems
const stale: string[] = []

function fail(message: string) {
  problems.push(message)
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8')
}

// ---------------------------------------------------------------- helpers

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out)
    else out.push(rel)
  }
  return out
}

/** The first sentence of a module's leading block comment — its one-line job. */
function headerSummary(path: string): string {
  const header = read(path).match(/^\s*\/\*\*([\s\S]*?)\*\//)
  if (!header) return '—'
  const prose = header[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const sentence = prose.split(/\.\s/)[0]
  return sentence ? `${sentence.replace(/\.$/, '')}.` : '—'
}

function shortHash(path: string): string {
  return createHash('sha256').update(read(path)).digest('hex').slice(0, 12)
}

/** Unpadded rows keep a one-cell edit to a one-line diff. */
function table(headers: string[], rows: string[][]): string {
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`]
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`)
  return lines.join('\n')
}

function boardSize(stage: Stage): string {
  const cells = stage.board.join('').split('').filter((char) => char !== '.').length
  return `${stage.board[0].length}×${stage.board.length} (${cells})`
}

// ------------------------------------------------------------- generators

function colourRows(): string[][] {
  return COLORS.map((colour) => {
    const from = colour.mix ? colour.mix.join(' + ') : '—'
    const tier = ['primary', 'secondary', 'tertiary'][colorTier(colour.id)]
    return [colour.id, tier, from, String(colorValue(colour.id))]
  })
}

function recipeRows(): string[][] {
  return COLORS.filter((colour) => colour.mix).map((colour) => {
    const [a, b] = colour.mix!
    return [`${a} + ${b}`, colour.id, String(colorValue(colour.id))]
  })
}

function stageRows(): string[][] {
  return STAGE_SECTIONS.flatMap((section) =>
    section.stages.map((entry) => [
      String(entry.id),
      section.name,
      entry.name,
      String(entry.stage.threshold),
      String(entry.stage.moves),
      boardSize(entry.stage),
      `×${stageMaxMultiplier(entry.stage)}`,
      entry.stage.active.join(', '),
    ]),
  )
}

function tutorialRows(): string[][] {
  return STAGE_SECTIONS.find((section) => section.id === 'tutorial')!.stages.map((entry) => [
    String(entry.index + 1),
    entry.name,
    entry.tutorial!.term,
    entry.tutorial!.goal,
    entry.tutorial!.showChain ? 'yes' : 'no',
    entry.tutorial!.showScore ? 'yes' : 'no',
  ])
}

function toolRows(): string[][] {
  const rows: string[][] = []
  for (const section of STAGE_SECTIONS) {
    for (const entry of section.stages) {
      for (const [tool, uses] of Object.entries(entry.stage.tools ?? {})) {
        rows.push([tool, String(uses), entry.name, section.name])
      }
    }
  }
  return rows
}

function mixesPerStageRows(): string[][] {
  return STAGE_SECTIONS.flatMap((section) =>
    section.stages
      .filter((entry) => stageMixes(entry.stage).length > 0)
      .map((entry) => [
        entry.name,
        stageMixes(entry.stage)
          .map(({ result, ingredients }) => `${ingredients.join('+')}→${result}`)
          .join(', '),
        `×${stageMaxMultiplier(entry.stage)}`,
      ]),
  )
}

function fileMapRows(): string[][] {
  return walk('src')
    .filter((path) => path.endsWith('.ts'))
    .sort()
    .map((path) => [`[\`${path}\`](../../../${path})`, headerSummary(path)])
}

function scriptRows(): string[][] {
  const pkg = JSON.parse(read('package.json'))
  return Object.entries(pkg.scripts as Record<string, string>).map(([name, command]) => [
    `\`npm run ${name}\``,
    `\`${command}\``,
  ])
}

// ------------------------------------------------------------ block engine

interface Block {
  file: string
  name: string
  body: () => string
  /** Fewer rows than this means the generator stopped matching. Defaults to MIN_ROWS. */
  min?: number
}

const BLOCKS: Block[] = [
  {
    file: 'docs/wiki/game/colors.md',
    name: 'colours',
    body: () => table(['Colour', 'Tier', 'Mixes from', 'Tile value'], colourRows()),
  },
  {
    file: 'docs/wiki/game/mixing.md',
    name: 'recipes',
    body: () => table(['Recipe', 'Result', 'Tile value'], recipeRows()),
  },
  {
    file: 'docs/wiki/game/mixing.md',
    name: 'stage-mixes',
    body: () => table(['Stage', 'Recipes in play', 'Max multiplier'], mixesPerStageRows()),
  },
  {
    file: 'docs/wiki/game/stages.md',
    name: 'stages',
    body: () =>
      table(
        ['#', 'Section', 'Name', 'Target', 'Moves', 'Board (cells)', 'Max ×', 'Active colours'],
        stageRows(),
      ),
  },
  {
    file: 'docs/wiki/game/tutorials.md',
    name: 'lessons',
    body: () => table(['#', 'Lesson', 'Teaches', 'Goal', 'Chain HUD', 'Score HUD'], tutorialRows()),
  },
  {
    file: 'docs/wiki/game/tools.md',
    name: 'tools',
    body: () => table(['Tool', 'Uses', 'Stage', 'Section'], toolRows()),
    min: 1,
  },
  {
    file: 'docs/wiki/tech/architecture.md',
    name: 'filemap',
    body: () => table(['Module', 'Owns'], fileMapRows()),
  },
  {
    file: 'docs/wiki/tech/architecture.md',
    name: 'scripts',
    body: () => table(['Script', 'Runs'], scriptRows()),
  },
]

function applyBlocks(): void {
  const byFile = new Map<string, Block[]>()
  for (const block of BLOCKS) {
    byFile.set(block.file, [...(byFile.get(block.file) ?? []), block])
  }

  for (const [file, blocks] of byFile) {
    if (!existsSync(join(ROOT, file))) {
      fail(`${file}: referenced by a generator but does not exist`)
      continue
    }
    let source = read(file)

    for (const block of blocks) {
      const open = `<!-- generated:${block.name} -->`
      const close = `<!-- /generated:${block.name} -->`
      const start = source.indexOf(open)
      const end = source.indexOf(close)
      if (start === -1 || end === -1 || end < start) {
        fail(`${file}: missing marker pair for "${block.name}"`)
        continue
      }
      const body = block.body()
      const rows = body.split('\n').length - 2
      if (rows < (block.min ?? MIN_ROWS)) {
        fail(
          `generator "${block.name}" produced only ${rows} rows — the source shape probably ` +
            `changed. Fix scripts/wiki.ts rather than lowering the floor.`,
        )
        continue
      }
      source = `${source.slice(0, start + open.length)}\n${body}\n${source.slice(end)}`
    }

    write(file, source)
  }
}

/** Fails the check when a pinned module changed without its section being revisited. */
function applyPins(): void {
  for (const file of docFiles()) {
    let source = read(file)
    let changed = false
    source = source.replace(/<!-- pin:(\S+) sha=([0-9a-f]+) -->/g, (whole, path: string, sha) => {
      if (!existsSync(join(ROOT, path))) {
        fail(`${file}: pin references "${path}", which does not exist`)
        return whole
      }
      const current = shortHash(path)
      if (current === sha) return whole
      changed = true
      // In check mode this is the whole point. In generate mode, re-pinning *is*
      // the intended action — the git diff is where the human reviews it.
      if (CHECK) {
        stale.push(
          `${file}: \`${path}\` changed since this section was last reviewed — re-read the ` +
            `section, correct it if it is now wrong, then run \`npm run wiki\` to re-pin.`,
        )
      } else {
        console.log(`  re-pinned ${path} in ${file} — check that section still reads true`)
      }
      return `<!-- pin:${path} sha=${current} -->`
    })
    if (changed) write(file, source)
  }
}

// ------------------------------------------------------------------ checks

function docFiles(): string[] {
  return walk('docs').filter((path) => path.endsWith('.md'))
}

/**
 * Both directions matter, and the second is the one that fires: a path an agent
 * invented or a rename it missed. Fenced blocks are stripped first — they hold
 * board art and sample paths that need not exist.
 */
function checkPaths(): void {
  const candidates = /(?:`|\]\()((?:src|scripts|tests|public|docs)\/[\w./-]+)[`)]/g
  for (const file of [...docFiles(), 'AGENTS.md', 'CLAUDE.md', 'README.md']) {
    if (!existsSync(join(ROOT, file))) continue
    const source = read(file).replace(/```[\s\S]*?```/g, '')
    let found = 0
    for (const [, path] of source.matchAll(candidates)) {
      found++
      const clean = path.replace(/[.,;:]$/, '')
      if (!existsSync(join(ROOT, clean))) {
        fail(`${file}: references \`${clean}\`, which does not exist on disk`)
      }
    }
    if (file === 'docs/wiki/tech/architecture.md' && found < MIN_ROWS) {
      fail(`${file}: found only ${found} source paths — the file map generator has stopped working`)
    }
  }
}

function write(file: string, next: string): void {
  const path = join(ROOT, file)
  const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
  if (current === next) return
  if (CHECK) stale.push(`${file} is out of date`)
  else writeFileSync(path, next)
}

// -------------------------------------------------------------------- main

for (const index of recordIndexes(planning.records)) write(index.file, index.source)
applyBlocks()
applyPins()
checkPaths()

if (problems.length) {
  console.error('\nWiki integrity problems:\n')
  for (const problem of problems) console.error(`  ✗ ${problem}`)
}
if (stale.length) {
  console.error(`\nRun \`npm run wiki\` and commit the result.\n`)
  for (const item of stale) console.error(`  ✗ ${item}`)
}
if (problems.length || stale.length) {
  console.error('')
  process.exit(1)
}
console.log(
  CHECK
    ? `Wiki is current (${planning.tasks.length} cards, ${planning.records.length} records).`
    : `Wiki updated (${planning.tasks.length} cards, ${planning.records.length} records, ${BLOCKS.length} blocks).`,
)
