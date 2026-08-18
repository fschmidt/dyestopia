---
id: T-043
type: task
title: Let the skill own the board rules
status: Done
ordinal: 900
labels: [docs, tooling]
---

## Description

**Blocked on `T-042`. Do not start it first — trimming the rules while this repo
still owns the mechanism leaves them documented nowhere.**

Two sections of `AGENTS.md` and a paragraph of the conventions page explain what
a card is, what `ordinal` does, why Todo is capped, and why promoting an idea is
a rewrite. Every one of those sentences is now also in the skill that ships with
the package, written for any repo rather than this one.

Two copies of a rule is one copy and one future lie. The skill is the copy that
travels, so this repo keeps only what is true *here*:

- Where the cards are, and that `BOARD.md` is generated.
- The cap, because 15 is this repo's number.
- The command to run, and the phone trick.
- A pointer to where the rules live.

Everything mechanical goes: the frontmatter schema, the id shapes, the ordinal
arithmetic, the drag semantics, the promoting-an-idea rewrite.

**The pointer must name the package, not the plugin.** The skill is installed
per-machine, and someone reading `AGENTS.md` on a fresh clone has not got it.
Point at the dependency in `package.json`; anyone can read its skill from there.

**The concepts and decisions section is not the same case.** Why this repo keeps
concepts and decisions at all is `D-001`, and that reasoning is this repo's. Only
the mechanics — id shapes, statuses, what gets validated — belong to the skill.
Trim those and leave the argument.

Read what remains from cold afterwards. The failure mode of this card is a
section trimmed to a stub that no longer says enough to act on, which is worse
than the duplication it was meant to remove.

## Acceptance criteria

<!-- AC:BEGIN -->
- [x] #1 No board rule is stated both in `AGENTS.md` and in the skill
- [x] #2 What survives is repo-specific: paths, the cap, the commands, a pointer
- [x] #3 The reasoning behind concepts and decisions survives, and `D-001` still
      resolves
- [x] #4 `npm run wiki:check` passes — every path left in the trimmed prose is
      still real
<!-- AC:END -->
