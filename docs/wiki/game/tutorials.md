# Tutorials

Six lessons, each one mechanic, running on real core-stage boards through the
normal game scene and the normal rules. Nothing is faked: a tutorial board is a
prepared deal, not a scripted sequence.

<!-- generated:lessons -->
| # | Lesson | Teaches | Goal | Chain HUD | Score HUD |
| --- | --- | --- | --- | --- | --- |
| 1 | Make a Match | Match | swap | no | no |
| 2 | Mix a Colour | Mix | mix | no | no |
| 3 | Build a Chain | Chain | chain | yes | no |
| 4 | Reach Rainbow | Rainbow Chain | rainbow-chain | yes | no |
| 5 | Break the Chain | Chain Breaker | chain-breaker | yes | yes |
| 6 | Rainbow Chain Breaker | Rainbow Chain Breaker | rainbow-chain-breaker | yes | yes |
<!-- /generated:lessons -->

## Progressive disclosure

The HUD arrives a piece at a time — the two right-hand columns above are the
switches. A first-time player sees a board and nothing else; the score appears
once scoring is the point, and the chain indicator once chains are.

The reasoning is that an indicator you cannot yet influence is noise, and a
player who has not met the Chain has no use for a Chain meter.

## Lesson shape

Every lesson follows the same four beats:

1. **Explanation** — one or more pages of text with a looping visual.
2. **Instruction** — the single action being asked for.
3. **The attempt** — the player plays the real board until the goal fires.
4. **Success** — a line that names the mechanic in canonical terms.

Each lesson also carries a `term`: the one capitalised word it is teaching —
Match, Mix, Chain, and so on. Those terms are the vocabulary the rest of the UI
and this wiki use, listed in the [Glossary](glossary.md).

## Unlocking

Tutorial progress is tracked separately from core-stage progress, so the two
sections advance independently. A **Unlock all stages** setting exists for
testing and skips the gating entirely.

The fuller design notes, including the parts not yet built, are in
[docs/tutorial.md](../../tutorial.md).
