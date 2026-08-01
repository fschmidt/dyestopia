/**
 * The board's data model — the one place that knows what a task card is, and
 * what a concept is.
 *
 * `wiki.ts` reads it to render `docs/planning/BOARD.md` and to fail the build on
 * an invalid card; `board.ts` reads it to serve the drag-and-drop board and
 * writes lane and priority back into the files. Both import from here so the
 * schema cannot drift between the reader and the writer.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const TASK_DIR = 'docs/planning/tasks'

/** The working pipeline, left to right. Deferred and ideas sit outside it. */
export const PIPELINE = ['Todo', 'In Progress', 'In Review', 'Done'] as const
export const LANES = [...PIPELINE, 'Deferred'] as const
export type Lane = (typeof LANES)[number]

/** Queue discipline: past this, something has to be deferred rather than queued. */
export const TODO_LIMIT = 15

/** Ordinals are spaced so a card can be inserted between two others by hand. */
export const ORDINAL_STEP = 100

export interface Task {
  file: string
  id: string
  title: string
  /** Ideas sit outside the pipeline entirely, so their status is unused. */
  type: 'task' | 'idea'
  status: Lane
  ordinal: number
  labels: string[]
}

export function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8')
}

/** Flat scalars and flat lists only — the subset every writer round-trips safely. */
export function frontmatter(source: string, file: string, fail: Fail): Record<string, string> {
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    fail(`${file}: missing YAML frontmatter`)
    return {}
  }
  const fields: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([a-z_]+):\s*(.*)$/)
    if (field) fields[field[1]] = field[2].trim()
  }
  return fields
}

/** Where a problem goes is the caller's business: collected by the check, thrown by the server. */
type Fail = (message: string) => void

/** `[a, b]` or `a, b` — the frontmatter list shape, since the parser keeps values flat. */
function flatList(value?: string): string[] {
  return (value ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function loadTasks(fail: Fail): Task[] {
  if (!existsSync(join(ROOT, TASK_DIR))) return []
  const tasks: Task[] = []
  const seen = new Map<string, string>()

  for (const name of readdirSync(join(ROOT, TASK_DIR)).sort()) {
    if (!name.endsWith('.md')) continue
    const file = `${TASK_DIR}/${name}`
    const fields = frontmatter(read(file), file, fail)
    const id = fields.id ?? ''
    const type = (fields.type ?? 'task') as Task['type']
    const status = fields.status as Lane

    if (type !== 'task' && type !== 'idea') fail(`${file}: type must be task or idea, got "${type}"`)
    // The id prefix carries the type, so the two can never desync.
    const prefix = type === 'idea' ? 'I' : 'T'
    if (!new RegExp(`^${prefix}-\\d{3}$`).test(id)) {
      fail(`${file}: a ${type} needs an id like ${prefix}-001, got "${id}"`)
    }
    if (!name.startsWith(`${id}-`)) fail(`${file}: filename must start with its id "${id}"`)
    if (seen.has(id)) fail(`${file}: duplicate id ${id}, already used by ${seen.get(id)}`)
    seen.set(id, file)
    if (type === 'task' && !LANES.includes(status)) {
      fail(`${file}: status "${fields.status}" is not one of ${LANES.join(' | ')}`)
    }
    if (!/^\d+$/.test(fields.ordinal ?? '')) {
      fail(`${file}: ordinal must be a number, got "${fields.ordinal}"`)
    }
    if (!fields.title) fail(`${file}: missing title`)

    tasks.push({
      file,
      id,
      type,
      title: fields.title ?? name,
      status,
      ordinal: Number(fields.ordinal ?? 0),
      labels: flatList(fields.labels),
    })
  }
  return tasks
}

/**
 * Concepts and decisions: the two record kinds that are *not* work.
 *
 * A **concept** is a design worked out before it is built — the maths, the
 * options, what was rejected. It is a living document until the code lands, at
 * which point the wiki describes what the game does and the concept remains the
 * record of why.
 *
 * A **decision** is one choice, in the ADR tradition: context, the call, the
 * alternatives, the consequences. It is immutable once accepted — a later
 * decision supersedes it rather than editing it, which is the whole point of
 * keeping them. Concepts emit decisions; a decision can also stand alone.
 *
 * Nothing in either directory is ever deleted. A rejected record is the most
 * useful kind, because it stops the idea coming back every four months.
 */
export const CONCEPT_DIR = 'docs/concepts'
export const DECISION_DIR = 'docs/decisions'

export const CONCEPT_STATES = [
  'Draft',
  'Review',
  'Accepted',
  'Implemented',
  'Superseded',
  'Rejected',
] as const
/** An ADR is never "implemented" — it is accepted, then one day superseded. */
export const DECISION_STATES = ['Proposed', 'Accepted', 'Superseded', 'Rejected'] as const

export type RecordKind = 'concept' | 'decision'

export interface Record_ {
  file: string
  id: string
  title: string
  kind: RecordKind
  status: string
  /** The cards cut from this record, so the thinking and the board stay linked. */
  tasks: string[]
}

const SHAPES: Record<RecordKind, { dir: string; prefix: string; states: readonly string[] }> = {
  concept: { dir: CONCEPT_DIR, prefix: 'C', states: CONCEPT_STATES },
  decision: { dir: DECISION_DIR, prefix: 'D', states: DECISION_STATES },
}

/** Same rules as a card — id shape, filename agreement, no duplicates, real status. */
export function loadRecords(kind: RecordKind, fail: Fail): Record_[] {
  const { dir, prefix, states } = SHAPES[kind]
  if (!existsSync(join(ROOT, dir))) return []
  const records: Record_[] = []
  const seen = new Map<string, string>()

  for (const name of readdirSync(join(ROOT, dir)).sort()) {
    // index.md is the directory's output, not one of its records.
    if (!name.endsWith('.md') || name === 'index.md') continue
    const file = `${dir}/${name}`
    const fields = frontmatter(read(file), file, fail)
    const id = fields.id ?? ''

    if (fields.type !== kind) fail(`${file}: type must be ${kind}, got "${fields.type}"`)
    if (!new RegExp(`^${prefix}-\\d{3}$`).test(id)) {
      fail(`${file}: a ${kind} needs an id like ${prefix}-001, got "${id}"`)
    }
    if (!name.startsWith(`${id}-`)) fail(`${file}: filename must start with its id "${id}"`)
    if (seen.has(id)) fail(`${file}: duplicate id ${id}, already used by ${seen.get(id)}`)
    seen.set(id, file)
    if (!states.includes(fields.status ?? '')) {
      fail(`${file}: status "${fields.status}" is not one of ${states.join(' | ')}`)
    }
    if (!fields.title) fail(`${file}: missing title`)

    records.push({
      file,
      id,
      kind,
      title: fields.title ?? name,
      status: fields.status ?? '',
      tasks: flatList(fields.tasks),
    })
  }
  return records
}
