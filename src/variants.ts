/**
 * Rule variants the harness can select.
 *
 * `C-001` §4 lists the levers that are *branches* rather than values: no
 * parameter set reaches them, so the only way to weigh one is to build a second
 * form of the rule and play both. This module names those forms. It is the seam
 * `T-031` built for the combo wave, generalised — that axis was one rule's
 * private enum, and `D-004` deleted it along with the wave. `T-036` needs the
 * same shape again and `T-037` needs it twice more, so it lives here now.
 *
 * **Nothing here is reachable by a player.** `GameScene` never asks for a
 * variant, no stage authors one and no flag selects one; `BASELINE` is what the
 * game is, and every other entry exists so a number can be put beside it. A
 * variant that turns out to be worth shipping gets decided by a `D-` record and
 * then stops being a variant.
 */

/**
 * When a mix is allowed to happen.
 *
 * `must-clear` is the game as it ships: `mergeClears` requires the dyed target
 * alone to complete a line, so **no merge can resolve without clearing**. That
 * single rule is what welds building to spending — the pitch is *mix to build,
 * swap to cash in*, but a mix must clear to be legal, so mixing **is** cashing
 * in.
 *
 * `any-mix` gives the rule its second form (`T-036`): a mix that clears nothing
 * is still a legal drop. It costs a move and leaves two result-coloured tiles
 * standing, which turns the merge arithmetic from −2 non-seed tiles into +2 and
 * is the reason `C-001` names mix legality the largest single influence on how
 * available chain play is.
 */
export type MixLegality = 'must-clear' | 'any-mix'

/**
 * What a cascade wave is worth.
 *
 * `inherit` is the game as it ships: `resolveCascade` scores every wave at the
 * multiplier the move arrived with, so a five-wave cascade pays exactly five
 * times what its first wave did. The move is the unit that is paid for; the
 * cascade it sets off is free.
 *
 * `escalate` gives waves the standard match-3 treatment (`T-037`): each wave
 * after the first adds one to the move's multiplier, so wave *i* scores at
 * `multiplier + i`. Additive rather than multiplicative on purpose — it hands
 * the same absolute bonus to a chain of one and a chain of five, which is the
 * conservative form. If the reading is flat, the multiplicative form is the
 * next thing to try, not the conclusion.
 */
export type CascadeScoring = 'inherit' | 'escalate'

/**
 * When a merge's own result reaches the chain.
 *
 * `after-clear` is the game as it ships: `playMove` scores the merge at the
 * chain it *arrived* with and only then advances it, so the chain a player
 * builds pays out on the move after the one that built it.
 *
 * `own-clear` advances first (`T-037`), so a merge that grows the chain clears
 * at the multiplier it just earned. It is the cheapest way to make the
 * multiplier visible at the moment it is earned, and it changes no legality —
 * the same drops are legal, they are worth more.
 */
export type MergeScoring = 'after-clear' | 'own-clear'

/** Which form of each branching rule a round is played under. */
export interface RuleSet {
  mixLegality: MixLegality
  cascadeScoring: CascadeScoring
  mergeScoring: MergeScoring
}

/** The game as it ships. Every measured row is read against this one. */
export const BASELINE_RULES: RuleSet = {
  mixLegality: 'must-clear',
  cascadeScoring: 'inherit',
  mergeScoring: 'after-clear',
}

/** A named rule set the command line can select and a table can label. */
export interface Variant {
  id: string
  label: string
  rules: RuleSet
}

export const BASELINE: Variant = {
  id: 'baseline',
  label: 'the game as it ships',
  rules: BASELINE_RULES,
}

export const VARIANTS: readonly Variant[] = [
  BASELINE,
  {
    id: 'any-mix',
    label: 'a mix need not clear',
    rules: { ...BASELINE_RULES, mixLegality: 'any-mix' },
  },
  {
    id: 'escalate',
    label: 'each cascade wave adds one to the multiplier',
    rules: { ...BASELINE_RULES, cascadeScoring: 'escalate' },
  },
  {
    id: 'own-clear',
    label: 'a merge clears at the chain it just raised',
    rules: { ...BASELINE_RULES, mergeScoring: 'own-clear' },
  },
]
