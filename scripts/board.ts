/**
 * Drag-and-drop front end for the planning board.
 *
 * `npm run board` serves `scripts/board.html` and, on a drop, writes `status`
 * and `ordinal` back into the card's own file — the same two fields you would
 * edit by hand. It rewrites those lines only, never the whole document, so a
 * move stays a one-line diff. Every write is followed by `wiki.ts`, so
 * `BOARD.md` is never stale, and the Todo cap is enforced here rather than left
 * for the build to reject.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { join } from 'node:path'

import { ORDINAL_STEP, PIPELINE, ROOT, TODO_LIMIT, loadTasks, type Lane, type Task } from './tasks'
import { renderPage, tree } from './wiki-view'

const PORT = Number(process.env.PORT ?? 5174)
const HOST = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1'

/** Ideas sit outside the lanes entirely — they carry no status. */
const IDEAS = 'Ideas'
type Group = Lane | typeof IDEAS

class BoardError extends Error {}

// ------------------------------------------------------------------- model

/**
 * Validation is the generator's, not a second copy of it. Anything `wiki:check`
 * would reject is a hard stop here too — serving a board built from invalid
 * cards would write the invalidity back out.
 */
function load(): Task[] {
  const problems: string[] = []
  const tasks = loadTasks((message) => problems.push(message))
  if (problems.length) {
    throw new BoardError(`The task files do not validate:\n${problems.map((p) => `• ${p}`).join('\n')}`)
  }
  return tasks
}

function groupOf(task: Task): Group {
  return task.type === 'idea' ? IDEAS : task.status
}

function membersOf(tasks: Task[], group: Group): Task[] {
  return tasks.filter((task) => groupOf(task) === group).sort((a, b) => a.ordinal - b.ordinal)
}

// ------------------------------------------------------------------- write

/**
 * A line-level rewrite, not a YAML round-trip. The frontmatter parser accepts
 * flat scalars and flat lists only, so re-serialising would quietly reformat
 * fields this server has no business touching.
 */
function rewriteFields(file: string, changes: Record<string, string | number>): boolean {
  const path = join(ROOT, file)
  const source = readFileSync(path, 'utf8')
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new BoardError(`${file}: missing YAML frontmatter`)

  let block = match[1]
  for (const [key, value] of Object.entries(changes)) {
    const line = new RegExp(`^${key}:.*$`, 'm')
    if (!line.test(block)) throw new BoardError(`${file}: has no \`${key}\` field to update`)
    block = block.replace(line, `${key}: ${value}`)
  }

  const next = `---\n${block}\n---${source.slice(match[0].length)}`
  if (next === source) return false
  writeFileSync(path, next)
  return true
}

/** Respace a group to 100, 200, 300… so the gaps for hand-insertion always come back. */
function renumber(members: Task[], status: Lane | null): string[] {
  const touched: string[] = []
  members.forEach((task, index) => {
    const ordinal = (index + 1) * ORDINAL_STEP
    const changes: Record<string, string | number> = {}
    if (task.ordinal !== ordinal) changes.ordinal = ordinal
    if (status && task.status !== status) changes.status = status
    if (Object.keys(changes).length && rewriteFields(task.file, changes)) touched.push(task.file)
  })
  return touched
}

function move(id: string, target: Group, index: number): string[] {
  const tasks = load()
  const task = tasks.find((candidate) => candidate.id === id)
  if (!task) throw new BoardError(`No card with id ${id}`)

  // Only the pipeline is draggable. Deferred and Ideas are holding areas shown
  // in the side menu, and a card leaves either one by being rewritten, not moved.
  if (!(PIPELINE as readonly string[]).includes(target)) {
    throw new BoardError(`${target} is not a lane on the board — edit ${task.file} to move a card there.`)
  }

  const from = groupOf(task)

  if (from === IDEAS) {
    throw new BoardError(
      `${id} is an idea, and promoting one means rewriting it as a task (\`T-\` id, ` +
        `\`type: task\`, a real lane). Edit ${task.file} instead.`,
    )
  }
  if (from === 'Deferred') {
    throw new BoardError(
      `${id} is deferred. Bringing it back is a deliberate edit — set \`status: ${target}\` ` +
        `in ${task.file}.`,
    )
  }

  // Enforce the cap at the point of edit. Letting it through would write a state
  // that fails `npm run build` later, somewhere with less context.
  if (target === 'Todo' && from !== 'Todo' && membersOf(tasks, 'Todo').length >= TODO_LIMIT) {
    throw new BoardError(
      `Todo already holds ${TODO_LIMIT}. Defer something before queueing more — the queue is ` +
        `meant to be a shortlist.`,
    )
  }

  const remaining = membersOf(tasks, target).filter((candidate) => candidate.id !== id)
  remaining.splice(Math.max(0, Math.min(index, remaining.length)), 0, task)

  const touched = renumber(remaining, target === IDEAS ? null : target)
  if (from !== target) touched.push(...renumber(membersOf(tasks, from).filter((c) => c.id !== id), null))
  return touched
}

/** Keep `BOARD.md` in step with the files, so the committed board is never behind. */
function regenerate(): string | null {
  const local = join(ROOT, 'node_modules/.bin/tsx')
  const [command, prefix] = existsSync(local) ? [local, []] : ['npx', ['tsx']]
  try {
    execFileSync(command, [...prefix, 'scripts/wiki.ts'], { cwd: ROOT, stdio: 'pipe' })
    return null
  } catch (error) {
    const output = error as { stdout?: Buffer; stderr?: Buffer }
    return `${output.stdout ?? ''}${output.stderr ?? ''}`.trim() || 'wiki generation failed'
  }
}

// -------------------------------------------------------------------- http

/** `status` is null for an idea, which sits outside the lanes and carries none. */
function shape(task: Task) {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.type === 'idea' ? null : task.status,
    ordinal: task.ordinal,
    labels: task.labels,
    file: task.file,
  }
}

function boardState() {
  const tasks = load()
  return {
    // The board is the pipeline and nothing else — what is actually in play.
    columns: PIPELINE.map((lane) => ({
      name: lane,
      limit: lane === 'Todo' ? TODO_LIMIT : null,
      cards: membersOf(tasks, lane).map(shape),
    })),
    // Holding areas. Read-only here; they change by editing the card.
    lists: {
      Deferred: membersOf(tasks, 'Deferred').map(shape),
      Ideas: membersOf(tasks, IDEAS).map(shape),
    },
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(payload)
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(readFileSync(join(ROOT, 'scripts/board.html'), 'utf8'))
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/board') {
      send(res, 200, boardState())
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/wiki') {
      send(res, 200, { tree: tree() })
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/wiki/page') {
      const path = url.searchParams.get('path') ?? ''
      try {
        send(res, 200, { path, ...renderPage(path) })
      } catch (error) {
        send(res, 404, { error: error instanceof Error ? error.message : String(error) })
      }
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/move') {
      const { id, column, index } = JSON.parse(await readBody(req))
      const touched = move(String(id), column as Group, Number(index))
      const warning = touched.length ? regenerate() : null
      for (const file of touched) console.log(`  ${file}`)
      send(res, 200, { ...boardState(), touched, warning })
      return
    }
    send(res, 404, { error: 'Not found' })
  } catch (error) {
    const known = error instanceof BoardError
    if (!known) console.error(error)
    send(res, known ? 409 : 500, { error: error instanceof Error ? error.message : String(error) })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Board on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  console.log('Drops are written straight to docs/planning/tasks/ — review with `git diff`.')
  // Unlike `vite --host`, this one accepts writes. Worth knowing which network it is on.
  if (HOST === '0.0.0.0') console.log('Listening on every interface, and anyone who can reach it can move a card.')
  console.log('')
})
