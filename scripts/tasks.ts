/**
 * The board's data model — the one place that knows what a task card is.
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
      labels: (fields.labels ?? '')
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean),
    })
  }
  return tasks
}
