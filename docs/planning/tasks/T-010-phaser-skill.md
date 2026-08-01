---
id: T-010
type: task
title: Phaser / game-development skill
status: Todo
ordinal: 800
labels: [tooling]
---

## Description

A skill capturing the Phaser-specific knowledge that keeps getting re-derived —
the HiDPI dance, tile baking and tinting, scene lifecycle, why text must go
through `addText`.

Author it in `.agents/skills/` so both Claude Code and Codex pick it up, the same
way [wiki-audit](../../../.agents/skills/wiki-audit/SKILL.md) is set up.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Lives in `.agents/skills/`, symlinked into `.claude/skills/`
- [ ] #2 Frontmatter limited to `name` and `description` so both tools read it
<!-- AC:END -->
