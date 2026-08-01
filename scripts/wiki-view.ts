/**
 * Read-only markdown viewer for the board's side menu, and for the panel a card
 * opens into — a card is a markdown file, so previewing one is just rendering it.
 *
 * Serves the repo's own documentation — `docs/`, plus the three root files an
 * agent is told to read — as a folder tree and rendered HTML. It is a viewer,
 * not an editor: nothing here writes, and the only paths it will open are
 * markdown files that were already in the tree it built.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'

import { Marked, type Token, type Tokens } from 'marked'

import { ROOT, TASK_DIR, read } from './tasks'

/** The files an agent is pointed at, which live outside `docs/` but belong in the tree. */
const ROOT_DOCS = ['AGENTS.md', 'CLAUDE.md', 'README.md']

export interface DocNode {
  name: string
  path?: string
  children?: DocNode[]
}

function walk(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(join(ROOT, dir)).sort()) {
    const rel = `${dir}/${entry}`
    if (statSync(join(ROOT, rel)).isDirectory()) found.push(...walk(rel))
    else if (entry.endsWith('.md')) found.push(rel)
  }
  return found
}

/** Every page the viewer will serve. Also the allow-list — see `renderPage`. */
export function pages(): string[] {
  const roots = ROOT_DOCS.filter((file) => existsSync(join(ROOT, file)))
  return [...roots, ...(existsSync(join(ROOT, 'docs')) ? walk('docs') : [])]
}

/**
 * Folders become branches so the tree mirrors the layout on disk — minus the
 * task cards, which are the board's data rather than pages to browse, and would
 * otherwise be four fifths of the tree. They stay in `pages()`, so a link to one
 * from `BOARD.md` still opens.
 */
export function tree(): DocNode[] {
  const nodes: DocNode[] = []
  for (const path of pages().filter((page) => !page.startsWith(`${TASK_DIR}/`))) {
    const parts = path.split('/')
    let level = nodes
    for (const folder of parts.slice(0, -1)) {
      let branch = level.find((node) => node.name === folder && node.children)
      if (!branch) {
        branch = { name: folder, children: [] }
        level.push(branch)
      }
      level = branch.children!
    }
    level.push({ name: parts[parts.length - 1], path })
  }
  return nodes
}

/**
 * Rewrites every link so the page works inside the viewer. A link to another
 * markdown page navigates in-app; a link to source keeps its text but stops
 * being a link, because there is nothing here that could open it.
 *
 * This is a renderer override rather than a pass over marked's output — swapping
 * an `<a>` for a `<span>` by regex would leave the closing tag behind.
 */
function viewerFor(from: string): Marked {
  const dir = posix.dirname(from)
  const known = new Set(pages())
  return new Marked({
    renderer: {
      link(this: { parser: { parseInline: (tokens: Token[]) => string } }, token: Tokens.Link) {
        const { href, title } = token
        const text = this.parser.parseInline(token.tokens)
        const tip = title ? ` title="${title}"` : ''
        if (/^(https?:|mailto:)/.test(href)) {
          return `<a href="${href}"${tip} target="_blank" rel="noreferrer">${text}</a>`
        }
        if (href.startsWith('#')) return `<a href="${href}"${tip}>${text}</a>`
        const [target, anchor] = href.split('#')
        const resolved = posix.normalize(posix.join(dir, target)).replace(/^\.\//, '')
        if (known.has(resolved)) {
          return `<a href="#wiki/${resolved}${anchor ? `#${anchor}` : ''}"${tip}>${text}</a>`
        }
        return `<span class="dead-link" title="${resolved} is not a page in this viewer">${text}</span>`
      },
    },
  })
}

export function renderPage(path: string): { title: string; html: string } {
  // The tree is the allow-list, so a crafted `..` path cannot escape it.
  if (!pages().includes(path)) throw new Error(`${path} is not a documentation page`)
  const raw = read(path)

  // Task cards open through links from the board, and their frontmatter would
  // otherwise render as an <hr> followed by a paragraph of field names.
  const front = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const source = front ? raw.slice(front[0].length) : raw
  const titled = front?.[1].match(/^title:\s*(.+)$/m)
  const heading = source.match(/^#\s+(.+)$/m)

  return {
    title: heading?.[1] ?? titled?.[1] ?? path.split('/').pop()!,
    html: viewerFor(path).parse(source, { async: false }),
  }
}
