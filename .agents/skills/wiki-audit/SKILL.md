---
name: wiki-audit
description: Use when the wiki may have drifted from the code - after a refactor, a rename, a batch of changes, or when asked to audit, prune or slim the docs. Proposes concrete numbered fixes for prose that is no longer TRUE, data that should be generated, and text that has outlived its usefulness, then applies only what the human accepts. Never commits.
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

## Phase 2 — Propose

Present every finding as a numbered item in this exact shape:

```
A3 · FALSE · docs/wiki/game/scoring-and-chains.md:34
    Claim:    "A swap while a chain is live doubles the multiplier."
    Code:     src/board.ts:451 multiplies by 3 at max chain, not 2.
    Proposed: <the exact replacement text>
    Safety:   mechanical | needs-your-call
```

Rules for this phase:

- **One finding, one number.** Never bundle two edits under one item — the human
  must be able to take the third and refuse the fourth.
- **`Proposed:` must be the literal text you would write.** "Reword this section"
  is not a proposal and cannot be accepted.
- **Mark every finding's safety honestly:**
  - `mechanical` — the target is known and the fix is substitution: a stale path,
    a renamed symbol, a number that disagrees with source, deleting a sentence
    about something that no longer exists.
  - `needs-your-call` — the fix requires deciding what is *true* or what the
    project *intends*. Anything rewriting a rule, or cutting text that might be
    load-bearing, is this. When unsure, it is this.
- **Rank by consequence.** A false rule in `AGENTS.md` outranks a stale sentence
  in a game page.
- **Say plainly when a section is fine.** An audit that invents findings to look
  thorough is worse than one that reports nothing. Zero findings is a valid and
  common outcome.

Then ask the human which to apply, and **wait**. Offer: all, all `mechanical`
only, a specific list of numbers, or none. Do not proceed on silence or on an
ambiguous answer — ask again.

---

## Phase 3 — Apply

Only for accepted numbers. Nothing else, however obviously right it seemed.

1. Make exactly the edits proposed — not improved versions of them. If applying
   one reveals it was wrong, stop and re-propose rather than improvising.
2. Run `npm run wiki` to regenerate blocks and re-pin.
3. Run `npm run wiki:check`. It must pass. If it does not, report and stop.
4. Show `git diff --stat` and summarise what changed in one line per file.
5. **Stop there. Do not commit, and do not offer to.** The diff is the review.

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
