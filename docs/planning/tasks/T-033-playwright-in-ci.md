---
id: T-033
type: task
title: Run the Playwright suite in Actions
status: Deferred
ordinal: 1400
labels: [testing, ci]
---

## Description

Put `npm test` behind the same gate as the build, so a pull request cannot merge
with a broken game — only a broken *compile* is caught today.

The work is not the workflow step. It is making the suite trustworthy enough to
block a merge, which is why this is deferred rather than queued:

- **Flakes cost more than the check is worth.** A required check that fails at
  random trains you to merge past red, and then neither check means anything.
  The suite has to be shown stable over repeated runs before it becomes
  required, not after. `playwright.config.ts` already retries twice under CI,
  which hides intermittency rather than reporting it — a run that only passes on
  the retry should be visible.
- **Which projects run.** The config carries three, and the mobile one is the
  one that matters for a game that ships to phones. Running all three on every
  pull request may or may not be worth the minutes; that is a call to make with
  a measured runtime in hand.
- **A failure has to be diagnosable from the run alone.** Traces, screenshots
  and the HTML report uploaded as artefacts, or every CI failure becomes a local
  reproduction attempt.
- **Browsers have to be installed and cached**, or the install dominates the
  run.

Only once it is quiet does the check join `verify` in the required list on
`main`. Adding it before then is the failure mode this card exists to avoid.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 The suite runs on every pull request
- [ ] #2 Browser binaries are cached, and the install is not the bulk of the run
- [ ] #3 Traces and the report are uploaded on failure
- [ ] #4 A pass that needed a retry is reported rather than hidden
- [ ] #5 Stability is demonstrated over repeated runs before the check is
      required
- [ ] #6 The check is added to the required list on `main`
<!-- AC:END -->
