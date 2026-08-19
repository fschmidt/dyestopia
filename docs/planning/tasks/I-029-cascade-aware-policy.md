---
id: I-029
type: idea
title: A policy that can see a cascade coming
ordinal: 2900
labels: [testing, balance]
---

`T-037` measured escalating cascade waves and could not test the lever's own
premise. Escalation is proposed to pay a player for *setting up* a long cascade,
but neither harness policy sets one up: `immediateScore` evaluates a move on its
immediate clear only, because simulating the cascade needs the round's `rng` and
drawing from it to evaluate a move would change the round being played.

So every lever that pays for cascade *depth* is currently measured on the
cascades that happen by luck. `T-037`'s verdict on escalation does not depend on
this — the bot's play did not change and its win rate rose, and a bot that could
see cascades could only widen that. But the claim "escalation rewards setup"
is untested rather than refuted, and it will come back for any future lever
whose payoff is a cascade.

The obstacle is the shared `rng`, not the search. A policy that could fork the
round's random state — evaluate against a copy and discard it — could look a
wave or two ahead without disturbing the round it is playing, and `mulberry32`
is a single integer of state, so forking it is cheap. That is the piece worth
checking before anything is built: whether a forked stream can be evaluated
against and thrown away without the playout ceasing to be reproducible.

Worth weighing against the caveat the harness carries everywhere: greedy bots do
not track human difficulty, and a lookahead bot is still not a person. This
would make one specific class of lever measurable, not the numbers more true.
