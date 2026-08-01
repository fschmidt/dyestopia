---
name: wiki-audit
description: Use when the wiki may have drifted from the code - after a refactor, a rename, a batch of changes, or when asked to audit, prune or slim the docs. Checks whether prose is still TRUE about the code, finds prose that should have been generated, and flags docs that have outlived their usefulness. Reports only; never commits.
---

# Wiki audit

`npm run wiki:check` already catches everything mechanical: stale generated
blocks, dead paths, board integrity, stale hash pins. **Run it first** and fix
what it reports. Do not duplicate its work here.

This skill covers the residue no script can verify: whether the *prose* is still
true, and whether it still earns its place.

## Scope

Audit `docs/wiki/`, `AGENTS.md` and `CLAUDE.md`. Read `README.md` for context but
treat it as the deep-explanation companion, not a target.

## Procedure

1. **Run `npm run wiki:check`.** If it fails, stop and report that — a stale
   wiki makes every judgement below unreliable.

2. **Establish what changed.** `git log --oneline -30` and
   `git diff --stat HEAD~20 -- src/` give you the modules that moved recently.
   Concentrate there; unchanged modules cannot have drifted.

3. **Verify prose against code, claim by claim.** For each page, extract every
   factual assertion about behaviour and check it against the module it
   describes. Read the code — do not reason from the doc's own plausibility.
   Pay particular attention to:
   - `docs/wiki/game/` — rules, scoring, chain behaviour, what makes a move legal
   - `docs/wiki/tech/conventions.md` — invariants that may no longer hold
   - `AGENTS.md` — commands that no longer exist, rules now enforced elsewhere

4. **Find prose that should be generated.** Any table, list or count that
   restates source data by hand is a future drift. Name it and say which
   generator in `scripts/wiki.ts` should own it.

5. **Apply the removal test.** For every paragraph in `AGENTS.md` and
   `conventions.md`: *would removing this cause a wrong change?* If not, it is
   noise, and noise dilutes the rules that matter. Propose the cut.

6. **Check the pins.** Sections carrying `<!-- pin:path sha=… -->` are the ones
   deemed load-bearing. Are they still the right sections? Is there prose that
   should have a pin and does not?

## Report

Group findings under four headings, each with a file and line reference:

- **False** — states something the code contradicts. Quote both.
- **Stale** — describes something that no longer exists.
- **Should be generated** — hand-written data with a source of truth in `src/`.
- **Should be cut** — true but not load-bearing.

Rank by consequence: a false rule in `AGENTS.md` outranks a stale sentence in a
game page, because agents act on it.

State plainly when a section is fine. An audit that invents findings to look
thorough is worse than one that reports nothing.

## Rules

- **Report; do not edit**, unless the human explicitly asks for fixes.
- **Never commit.**
- If a claim cannot be verified from the code, say so rather than guessing.
- Do not propose *adding* documentation. This wiki is deliberately slim; growth
  is the failure mode, not the goal.
