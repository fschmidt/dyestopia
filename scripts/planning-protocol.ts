import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

export const TASKS_DIR = 'docs/planning/tasks'
export const TODO_LIMIT = 15

const LANES = ['Todo', 'In Progress', 'In Review', 'Done', 'Deferred'] as const
const RECORDS = {
  concept: {
    dir: 'docs/concepts',
    prefix: 'C',
    states: ['Draft', 'Review', 'Accepted', 'Implemented', 'Superseded', 'Rejected'],
    heading: 'Concepts',
    blurb: [
      'Design worked out before it is built. A concept **proposes**; the wiki describes',
      'what is true *now*. Never put a proposal in the wiki, and never treat a concept as',
      'the documentation.',
      '',
      'A concept is not work and carries no lane. Its research and its implementation are',
      'cards; the thinking itself lives here, and outlives them.',
    ],
  },
  decision: {
    dir: 'docs/decisions',
    prefix: 'D',
    states: ['Proposed', 'Accepted', 'Superseded', 'Rejected'],
    heading: 'Decisions',
    blurb: [
      'One choice each, in the ADR tradition: context, the call, the alternatives, the',
      'consequences. **Accepted decisions are immutable** — a later decision supersedes an',
      'earlier one rather than editing it, because the value is in being able to see what',
      'was believed at the time.',
      '',
      'Concepts emit decisions. A decision can also stand alone, and a card labelled',
      '`decision` should land as one.',
    ],
  },
} as const

type RecordKind = keyof typeof RECORDS

export interface TaskCard {
  file: string
  id: string
  type: 'task' | 'idea'
  title: string
  status?: string
  ordinal: number
  labels: string[]
}

export interface PlanningRecord {
  file: string
  id: string
  kind: RecordKind
  title: string
  status: string
  tasks: string[]
}

export interface PlanningReport {
  problems: string[]
  tasks: TaskCard[]
  records: PlanningRecord[]
}

function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function frontmatter(source: string, file: string, fail: (message: string) => void) {
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    fail(`${file}: missing YAML frontmatter`)
    return {} as Record<string, string>
  }
  const fields: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([a-z_]+):\s*(.*)$/)
    if (field) fields[field[1]] = field[2].trim()
  }
  return fields
}

function flatList(value?: string): string[] {
  return (value ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function markdownFiles(root: string, dir: string, out: string[] = []): string[] {
  if (!existsSync(join(root, dir))) return out
  for (const name of readdirSync(join(root, dir)).sort()) {
    const path = `${dir}/${name}`
    if (statSync(join(root, path)).isDirectory()) markdownFiles(root, path, out)
    else if (name.endsWith('.md')) out.push(path)
  }
  return out
}

function loadTasks(root: string, fail: (message: string) => void): TaskCard[] {
  const tasks: TaskCard[] = []
  const seen = new Map<string, string>()
  for (const file of markdownFiles(root, TASKS_DIR)) {
    const name = file.slice(file.lastIndexOf('/') + 1)
    const fields = frontmatter(read(root, file), file, fail)
    const id = fields.id ?? ''
    const type = fields.type as 'task' | 'idea'
    if (type !== 'task' && type !== 'idea') {
      fail(`${file}: type must be task or idea, got "${fields.type}"`)
    }
    const prefix = type === 'idea' ? 'I' : 'T'
    if (!new RegExp(`^${prefix}-\\d{3}$`).test(id)) {
      fail(`${file}: a ${type || 'task'} needs an id like ${prefix}-001, got "${id}"`)
    }
    if (!name.startsWith(`${id}-`)) fail(`${file}: filename must start with its id "${id}"`)
    if (seen.has(id)) fail(`${file}: duplicate id ${id}, already used by ${seen.get(id)}`)
    seen.set(id, file)
    if (type === 'task' && !LANES.includes(fields.status as (typeof LANES)[number])) {
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
      status: fields.status,
      ordinal: Number(fields.ordinal ?? 0),
      labels: flatList(fields.labels),
    })
  }
  return tasks
}

function loadRecords(root: string, kind: RecordKind, fail: (message: string) => void) {
  const shape = RECORDS[kind]
  const records: PlanningRecord[] = []
  const seen = new Map<string, string>()
  for (const file of markdownFiles(root, shape.dir).filter((path) => !path.endsWith('/index.md'))) {
    const name = file.slice(file.lastIndexOf('/') + 1)
    const fields = frontmatter(read(root, file), file, fail)
    const id = fields.id ?? ''
    if (fields.type !== kind) fail(`${file}: type must be ${kind}, got "${fields.type}"`)
    if (!new RegExp(`^${shape.prefix}-\\d{3}$`).test(id)) {
      fail(`${file}: a ${kind} needs an id like ${shape.prefix}-001, got "${id}"`)
    }
    if (!name.startsWith(`${id}-`)) fail(`${file}: filename must start with its id "${id}"`)
    if (seen.has(id)) fail(`${file}: duplicate id ${id}, already used by ${seen.get(id)}`)
    seen.set(id, file)
    if (!(shape.states as readonly string[]).includes(fields.status ?? '')) {
      fail(`${file}: status "${fields.status}" is not one of ${shape.states.join(' | ')}`)
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

export function checkPlanningProtocol(root: string): PlanningReport {
  const problems: string[] = []
  const fail = (message: string) => problems.push(message)
  const tasks = loadTasks(root, fail)
  const records = (Object.keys(RECORDS) as RecordKind[]).flatMap((kind) =>
    loadRecords(root, kind, fail),
  )

  const queued = tasks.filter((task) => task.type === 'task' && task.status === 'Todo').length
  if (queued > TODO_LIMIT) {
    fail(`Todo holds ${queued} tasks, over the limit of ${TODO_LIMIT}`)
  }

  const taskIds = new Set(tasks.map((task) => task.id))
  for (const record of records) {
    for (const id of record.tasks) {
      if (!taskIds.has(id)) fail(`${record.file}: lists task ${id}, which does not exist`)
    }
  }

  const recordIds = new Set(records.map((record) => record.id))
  const recordDirs = Object.values(RECORDS).map(({ dir }) => dir)
  const docs = markdownFiles(root, 'docs')
    .filter((file) => !recordDirs.some((dir) => file.startsWith(`${dir}/`)))
  for (const file of [...docs, 'AGENTS.md', 'CLAUDE.md', 'README.md']) {
    if (!existsSync(join(root, file))) continue
    const source = read(root, file).replace(/```[\s\S]*?```/g, '')
    for (const [, id] of source.matchAll(/`([CD]-\d{3})`/g)) {
      if (!recordIds.has(id)) fail(`${file}: references \`${id}\`, which is not a record on disk`)
    }
  }

  return { problems, tasks, records }
}

export function renderRecordIndex(kind: RecordKind, records: PlanningRecord[]): string {
  const shape = RECORDS[kind]
  const groups = shape.states
    .map((status) => ({ status, records: records.filter((record) => record.status === status) }))
    .filter(({ records: group }) => group.length > 0)
    .map(({ status, records: group }) => {
      const lines = group.map((record) => {
        const tasks = record.tasks.length
          ? ` · ${record.tasks.map((task) => `\`${task}\``).join(', ')}`
          : ''
        return `- \`${record.id}\` [${record.title}](${basename(record.file)})${tasks}`
      })
      return `### ${status} (${group.length})\n\n${lines.join('\n')}`
    })
  return [
    '<!-- GENERATED by `npm run wiki` — do not edit. -->',
    '',
    `# ${shape.heading}`,
    '',
    ...shape.blurb,
    '',
    groups.length ? groups.join('\n\n') : '_None yet._',
    '',
  ].join('\n')
}

export function recordIndexes(records: PlanningRecord[]): Array<{ file: string; source: string }> {
  return (Object.keys(RECORDS) as RecordKind[]).map((kind) => ({
    file: `${RECORDS[kind].dir}/index.md`,
    source: renderRecordIndex(kind, records.filter((record) => record.kind === kind)),
  }))
}
