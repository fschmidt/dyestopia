---
name: wiki-audit
description: Use when the wiki may have drifted from the code - after a refactor, a rename, a batch of changes, or when asked to audit, prune or slim the docs. Reports a short plain-language summary of prose that is no longer TRUE, data that should be generated, and text that has outlived its usefulness. Each finding is routed to either a wiki edit or a new task card, and only what the human accepts is applied. Never commits.
---

# Wiki audit

Semi-automatic: **propose → accept → apply**. Every finding is a numbered,
concrete edit the human can accept or reject individually. Nothing is written
before they choose, and nothing is ever committed.

`npm run wiki:check` already catches everything mechanical — stale generated
blocks, dead paths, board integrity, stale hash pins. **Run it first** and fix
what it reports. Do not repeat its work here.

This skill covers the residue no script can verify: whether the *prose* is still
true, and whether it still earns its place.

---

## Phase 1 — Investigate

Audit `docs/wiki/`, `AGENTS.md` and `CLAUDE.md`. Read `README.md` for context but
treat it as the deep-explanation companion, not a target.

1. **Run `npm run wiki:check`.** If it fails, stop and report that — a stale wiki
   makes every judgement below unreliable.

2. **Establish what changed.** `git log --oneline -30` and
   `git diff --stat HEAD~20 -- src/` name the modules that moved. Concentrate
   there; unchanged modules cannot have drifted.

3. **Verify prose against code, claim by claim.** Read the module, then the
   sentence. Never judge a claim by whether it sounds plausible — a doc that
   reads well is exactly how drift survives. Priority order:
   - `AGENTS.md` — agents *act* on this, so a false rule here does damage
   - `docs/wiki/tech/conventions.md` — invariants that may no longer hold
   - `docs/wiki/game/` — rules, scoring, chain behaviour, move legality

4. **Find prose that should be generated.** Any table, list or count restating
   source data by hand is future drift. Name the generator in `scripts/wiki.ts`
   that should own it.

5. **Apply the removal test** to every paragraph in `AGENTS.md` and
   `conventions.md`: *would removing this cause a wrong change?* If not, it is
   noise, and noise dilutes the rules that matter.

6. **Check the pins.** Are the `<!-- pin:path sha=… -->` sections still the
   load-bearing ones? Is there prose that should carry a pin and does not?

---

## Phase 2 — Summarise

**Route every finding before writing it.** There are exactly three destinations,
and a finding that fits none of them is not a finding:

- **`[wiki]`** — the prose is wrong. Fixable here, now, by editing the page.
- **`[task]`** — the fix is in code, the generator or the build. It becomes a
  card in `docs/planning/tasks/`. It is *not* a doc edit and must never be
  applied as one.
- **drop it** — true but inconsequential. Say nothing. A short list that is all
  signal beats a long one that is honest about trivia.

Then write the summary. This is the only thing the human reads, so it is prose,
not a report:

```
3 findings — 1 wiki fix, 2 that belong on the board.

1. The architecture page says the canvas is 960×720 landscape. It is 393×852
   portrait — the iPhone 15 change never reached the docs.              [wiki]

2. The module map shows "—" for 30 modules. 25 of them do have a description;
   the generator only looks above the imports, so it never sees them.   [task]
```

Rules for this phase:

- **Write for someone who has not read the code today.** Two or three lines per
  finding: what the doc claims, what is actually so, why it matters if that is
  not obvious. No line numbers, no regexes, no internal identifiers, no
  `Claim:`/`Code:` scaffolding. Hold the evidence — Phase 3 needs it, and the
  human may ask — but do not print it unasked.
- **Show the replacement text only when it is a sentence or less.** Otherwise
  describe the change and offer the exact wording. A wall of proposed prose is
  the thing that makes an audit unreviewable.
- **At most seven findings.** More than that is a rewrite, not an audit — report
  the top seven and say plainly that the list was cut.
- **One finding, one number**, so the human can take the third and refuse the
  fourth.
- **Rank by consequence.** A false rule in `AGENTS.md` outranks a stale sentence
  in a game page.
- **Say plainly when everything is fine.** An audit that invents findings to look
  thorough is worse than one that reports nothing. Zero findings is a valid and
  common outcome, and one line is the right way to report it.

End with a single question naming the obvious default — typically "apply the
wiki fixes and file the rest as tasks?". Then **wait**. Do not proceed on
silence or on an ambiguous answer.

---

## Phase 3 — Apply

Only for accepted numbers. Nothing else, however obviously right it seemed. Each
one goes to the destination it was routed to in Phase 2 — never the other.

**For a `[wiki]` finding**, edit the page:

1. Make exactly the edit summarised — not an improved version of it. If applying
   one reveals it was wrong, stop and re-propose rather than improvising.
2. Run `npm run wiki` to regenerate blocks and re-pin.
3. Run `npm run wiki:check`. It must pass. If it does not, report and stop.

**For a `[task]` finding**, write a card in `docs/planning/tasks/` — do not fix
the code, and do not edit the doc to describe the bug:

1. Take the next free `T-` id and name the file `T-0NN-short-slug.md`.
2. Frontmatter: `id`, `type: task`, `title`, `status: Todo`, `ordinal`, and
   `labels`. Give it the ordinal of the lane's last card plus 100 — an audit
   finding starts at the back of the queue unless the human says otherwise.
3. Body: a `## Description` explaining what is wrong and how it was found, then
   `## Acceptance criteria` with numbered checkboxes between `<!-- AC:BEGIN -->`
   and `<!-- AC:END -->`. This is where the evidence from Phase 1 goes — file
   paths and the failing case belong in the card, where whoever picks it up
   needs them.
4. **Keep the card the size of the cards already there** — around 25 lines, and
   never more than the largest existing card. Check before writing:
   `wc -c docs/planning/tasks/T-*.md | sort -rn | head -3`.

   You will have just finished a deep verification pass, and the temptation is
   to pour the working notes in. Resist it. What earns its place is the
   diagnosis: what is broken, and enough of why that nobody has to rediscover
   it. What does not is a comparison of possible fixes, a worked example, or
   your recommendation — naming the options in one sentence is enough, and
   whoever works the card will know more than you do by then. An audit-filed
   card that dwarfs its neighbours is a bug in this skill, not thoroughness.
5. **Check the Todo lane first.** It caps at 15. If filing would overflow it,
   say so and ask what to defer rather than filing anyway — `wiki:check` will
   fail the build otherwise.
6. Run `npm run wiki` to regenerate the board.

**Then, for both:** show `git diff --stat`, summarise what changed in one line
per file, and **stop. Do not commit, and do not offer to.** The diff is the
review.

For a rejected finding, the human may say it should never be raised again. In
that case add a short inline marker next to the prose rather than keeping a
separate ignore list:

```markdown
<!-- audit-ok: intentionally simplified, see T-012 -->
```

That marker lives with the text it defends and dies when the text is rewritten,
which a separate ignore file would not. Skip any finding whose paragraph already
carries one.

---

## Rules

- **Never commit**, and never stage selectively to imply a commit.
- If a claim cannot be verified from the code, say so rather than guessing.
- Do not propose *adding* documentation. This wiki is deliberately slim; growth
  is the failure mode, not the goal.
- Do not touch generated blocks, `docs/planning/BOARD.md`, or anything between
  `<!-- generated:… -->` markers. Fix the generator or the source data instead.
