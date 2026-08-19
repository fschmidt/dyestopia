import type { Stage } from './stage'

/**
 * The ten MVP stages, unlocked linearly.
 *
 * Stages 1–3 are the tutorial — colour sets that force one concept each
 * (match → merge → cascade) — and the rest curve through purple and shaped
 * boards into the tertiaries. Refills only drop `seed` colours, so every
 * secondary a stage plays beyond its opening letters is player-made.
 * A mix is legal only when the dyed target completes a line with two
 * result-coloured tiles already in place, so the letters author *in-line
 * pairs* — each one a made mix away from a clear, once the right primary
 * drifts next door.
 *
 * Those letters are the stage's whole lifetime supply of every colour beyond
 * the primaries. A merge spends three of them — the two in line plus the dyed
 * target — and returns one, the converted dragged tile the cleared line didn't
 * include, so the non-seed pool only ever shrinks. See `C-001`.
 *
 * `threshold` and `moves` are calibrated together rather than forced to rise
 * monotonically, and they are calibrated for *measurement*: on the harness, a
 * chain-building policy clears each stage between 90% and 95% of the time. Any
 * higher and the win rate stops moving when a rule changes, which is what
 * `T-036` ran into and what `T-044` retuned. A primary 3-clear pays 45, while
 * mix chains and their swap cash-ins supply the multiplier inherited by every
 * cascade.
 *
 * The budget carries most of that retune. `T-022` found rounds ending by
 * crossing the target rather than by running out of moves, so six stages keep
 * the target they were authored with and spend the slack instead. The three
 * boards a lesson borrows — `First Splash`, `Mixing Lesson`, `Royal Purple` —
 * are the exception: a lesson hides the target but still spends the budget, so
 * on those the target is the safe knob and the budget is left alone.
 *
 * None of this survives `T-038`. `D-002` decided result-tile supply must
 * regenerate during a round, and every number here was set against an economy
 * where it only ever drained.
 */
export const STAGES: Stage[] = [
  {
    // Pure match-3: no mixable colours in play, so drops can only swap.
    name: 'First Splash',
    hint: 'Drag a tile onto a neighbour to line up 3 of a colour',
    threshold: 1350,
    moves: 8,
    active: ['red', 'yellow', 'blue'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '#####', //
      '#####',
      '#####',
      '#####',
      '#####',
    ],
  },
  {
    // The twist: orange becomes legal, and two waiting pairs teach the rule —
    // dye the tile beside a pair and the line completes.
    name: 'Mixing Lesson',
    hint: 'Drop red on a yellow beside two oranges — the mix completes the line',
    threshold: 2400,
    moves: 8,
    active: ['red', 'yellow', 'blue', 'orange'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '######', //
      '##oo##',
      '######',
      '######',
      '#oo###',
      '######',
    ],
  },
  {
    // A taller board gives falls room to chain.
    name: 'Cascade Lesson',
    hint: 'Falling tiles keep clearing — every extra wave scores more',
    threshold: 1800,
    moves: 5,
    active: ['red', 'yellow', 'blue', 'orange', 'green'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '#######', //
      '##oo###',
      '#######',
      '#######',
      '#gg####',
      '#######',
      '#######',
    ],
  },
  {
    name: 'Royal Purple',
    hint: 'Red and blue make purple',
    threshold: 5500,
    moves: 12,
    active: ['red', 'yellow', 'blue', 'orange', 'green', 'purple'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '########', //
      '###pp###',
      '########',
      '#oo#####',
      '########',
      '#####gg#',
      '########',
      '########',
    ],
  },
  {
    // The first shaped board: single-cell tips, and falls that funnel inward.
    name: 'The Diamond',
    hint: 'Sharp corners — watch where the falls funnel',
    threshold: 1700,
    moves: 7,
    active: ['red', 'yellow', 'blue', 'orange', 'green', 'purple'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '....#....', //
      '...###...',
      '..#####..',
      '.##oo###.',
      '###pp####',
      '.###gg##.',
      '..#####..',
      '...###...',
      '....#....',
    ],
  },
  {
    // Two independent wells over a shared floor — matches cross underneath.
    name: 'Twin Wells',
    hint: 'Two wells share one floor',
    threshold: 2000,
    moves: 10,
    active: ['red', 'yellow', 'blue', 'orange', 'green', 'purple'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '####..####', //
      '#oo#..#gg#',
      '####..####',
      '#gg#..#oo#',
      '####..####',
      '####pp####',
      '##########',
    ],
  },
  {
    // First tertiary: green is player-made from yellow+blue, then dropped on
    // blue for teal — a two-merge chain, with the preset teal as the payoff.
    name: 'Deep Teal',
    hint: 'Blue and green mix into teal',
    threshold: 2500,
    moves: 8,
    active: ['red', 'yellow', 'blue', 'orange', 'green', 'teal'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '########', //
      '##gg####',
      '#####tt#',
      '########',
      '#tt#####',
      '####gg##',
      '########',
      '########',
    ],
  },
  {
    name: 'Amber Glow',
    hint: 'Yellow and orange mix into amber',
    threshold: 3650,
    moves: 10,
    active: ['red', 'yellow', 'blue', 'orange', 'green', 'amber'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '.#######.', //
      '#########',
      '##oo#####',
      '#####aa##',
      '#########',
      '##aa#####',
      '#####oo##',
      '#########',
      '.#######.',
    ],
  },
  {
    name: 'The Hourglass',
    hint: 'Everything runs through the waist — red on purple makes magenta',
    threshold: 2500,
    moves: 18,
    active: ['red', 'yellow', 'blue', 'orange', 'green', 'purple', 'magenta'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '#########', //
      '.##pp###.',
      '..#mm##..',
      '...###...',
      '..##mm#..',
      '.###pp##.',
      '#########',
    ],
  },
  {
    // The full 10×10 area, and the widest palette of the MVP.
    name: 'Full Spectrum',
    hint: 'Every colour is in play — paint the lot',
    threshold: 5700,
    moves: 11,
    active: ['red', 'yellow', 'blue', 'orange', 'green', 'purple', 'teal', 'amber'],
    seed: ['red', 'yellow', 'blue'],
    board: [
      '##########', //
      '###oo#####',
      '#gg####pp#',
      '##########',
      '#####tt###',
      '##aa######',
      '##########',
      '#######gg#',
      '#oo#######',
      '##########',
    ],
  },
]
