---
id: T-039
type: task
title: Audit the polls that can miss what they wait for
status: Todo
ordinal: 700
labels: [testing]
---

## Description

**Blocked on nothing. The cheapest part of `C-004`, and the only part that is a
bug rather than a design.**

`expect.poll` is an *eventually* assertion, and it is only sound when what it
waits for is **monotone** — once true, it stays true. A poll on a terminal state
can only ever be late, and late is what a timeout is for. A poll on a state the
game passes *through* can be missed entirely, and missing it is indistinguishable
from the state never happening. No timeout fixes that; a longer one makes it
worse, because it spends longer sampling a window that has already closed.

The suite has both kinds and does not distinguish them. `tests/play/match.spec.ts`
is where to start looking — several of its polls assert a conjunction that must
hold at one sampled instant, and at least one is explicitly documented as a
hand-off between two animation phases:

> The merge pulse hands off into the clear at the old ×1; only after that score
> snapshot is taken does the first result colour raise the chain to ×2.

That is a description of a window, being sampled by a poll. It may well be a
window that stays open — the point of the card is that nobody has checked, and
the checking is reading rather than running.

**What to do about one, once found, is not the same question.** A transient
state that the test genuinely cares about is a job for `T-040`, which can stop
the clock on it. A transient state the test does not care about should be
asserted after the board has settled instead. Both are cheaper than a timeout.

Do not convert anything to a faked clock here. This card reads the suite and
fixes what is wrong on its own terms; `T-040` changes the mechanism.

## Acceptance criteria

<!-- AC:BEGIN -->
- [ ] #1 Every `expect.poll` in the browser specs is classified as waiting on a
      terminal state or a transient one
- [ ] #2 Each transient one is either shown to be safe, rewritten to assert
      after `settled`, or recorded as needing `T-040`
- [ ] #3 The distinction is written down where the next person will meet it —
      `tests/helpers.ts` beside `settle`, not in a card
<!-- AC:END -->
