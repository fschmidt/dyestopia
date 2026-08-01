---
id: D-001
type: decision
title: Concepts and decisions live outside the wiki
status: Accepted
tasks: []
---

# Concepts and decisions live outside the wiki

## Context

The project had two homes for prose and neither fits design work in progress.

The wiki describes what is **true now**. It is pinned to source hashes, its
paths are checked against disk, and the `wiki-audit` skill exists to hunt drift
between its prose and the code. A proposal put there is a lie with a pin on it.

A task card is a unit of **work**. It has a lane, it gets done, and then it stops
mattering. Design thinking outlives the card that produced it — its value is
being readable in six months when someone asks why refill is weighted the way it
is.

The first design large enough to make this hurt was the board maths (`C-001`):
no UI, a great deal of thought, and a shape that has to survive future modes.
Written as a card it was a document pretending to be work.

## Decision

Two new directories, neither of them a lane.

**[docs/concepts/](../concepts/index.md)** — `C-0xx`. A design worked out before
it is built: the problem, the options, the maths, what was rejected. Living
until the code lands. States: Draft, Review, Accepted, Implemented, Superseded,
Rejected.

**[docs/decisions/](index.md)** — `D-0xx`. One choice each, in the ADR
tradition: context, decision, alternatives, consequences. **Immutable once
accepted** — a later decision supersedes an earlier one rather than editing it,
because the value is in seeing what was believed at the time. States: Proposed,
Accepted, Superseded, Rejected.

The working order is: a **research card** produces the survey and the inventory
→ a **concept** holds the thinking and is accepted → it **emits decisions** and
**cuts implementation cards** → when they land, the wiki describes what the game
now does and the concept is marked Implemented.

Both directories get the same treatment as cards: frontmatter validated by
`npm run wiki:check`, a generated index, ids that must resolve when cited, and
listed tasks that must exist. Nothing in either is ever deleted.

## Alternatives

**Concepts in the wiki.** Rejected: it breaks the wiki's only promise, and the
pin machinery would start demanding that speculative prose be re-verified
against code that does not exist yet.

**Concepts as long task cards.** Rejected: this is the status quo, and it is what
prompted the change. A card that is really a document either gets closed while
its content is still needed, or never gets closed at all.

**One space for both concepts and ADRs.** Rejected, though it was close. Their
lifecycles genuinely differ — a concept is edited until it lands, an ADR is
frozen the moment it is accepted. Sharing a directory would mean sharing a
status vocabulary that fits neither.

**A folder and a written rule, no tooling.** Rejected: this is how the docs
worked before the generator existed, and drift is exactly what the generator was
built to stop.

## Consequences

- A `decision`-labelled card now has somewhere to land. Several existing cards
  say "a decision is recorded with its reasoning" without saying where; they
  mean here.
- Three kinds of record now carry ids (`T-`/`I-`, `C-`, `D-`), and the check
  enforces all three. More ceremony for a solo project — accepted deliberately,
  because the alternative is prose nobody can trust.
- The wiki gets narrower and more reliable: it only ever says what is true.
- Every concept costs a card to produce. Small designs should stay in the card
  that implements them; this machinery is for the ones that do not fit.
