import type { Stage } from './stage'

/**
 * The ten MVP stages, unlocked linearly.
 *
 * Stages 1–3 are the tutorial — tiny thresholds, colour sets that force one
 * concept each (match → merge → cascade) — and the rest curve through purple
 * and shaped boards into the tertiaries. Refills only drop `seed` colours, so
 * every secondary a stage plays beyond its opening letters is player-made.
 * A mix is legal only when the dyed target completes a line with two
 * result-coloured tiles already in place, so the letters author *in-line
 * pairs* — each one a made mix away from a clear, once the right primary
 * drifts next door. Loose result tiles beyond those come only from merge
 * survivors (a converted dragged tile the cleared line didn't include).
 *
 * Thresholds and budgets are tuning numbers, deliberately rough until the
 * playtest: a plain 3-clear pays 30, a merged one 45, cascades multiply.
 */
export const STAGES: Stage[] = [
  {
    // Pure match-3: no mixable colours in play, so drops can only swap.
    name: 'First Splash',
    hint: 'Drag a tile onto a neighbour to line up 3 of a colour',
    threshold: 100,
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
    threshold: 160,
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
    name: 'Chain Reaction',
    hint: 'Falling tiles keep clearing — every extra wave scores more',
    threshold: 300,
    moves: 10,
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
    threshold: 450,
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
    threshold: 550,
    moves: 12,
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
    threshold: 700,
    moves: 14,
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
    threshold: 800,
    moves: 14,
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
    threshold: 950,
    moves: 15,
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
    threshold: 1100,
    moves: 16,
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
    threshold: 1400,
    moves: 18,
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
