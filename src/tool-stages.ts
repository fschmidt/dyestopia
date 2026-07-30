import type { Stage } from './stage'

/**
 * Tool introduction stages continue the global numbering after the ten core
 * stages, but live in their own stage-select page. They use the normal game
 * loop and win condition: no tutorial overlays or special reset semantics.
 */
export const TOOL_STAGES: Stage[] = [
  {
    name: 'Free Move',
    hint: 'Activate Free Move, then make one legal Mix or Swap anywhere on the board',
    threshold: 1800,
    moves: 10,
    active: ['red', 'yellow', 'blue', 'orange', 'green'],
    seed: ['red', 'yellow', 'blue'],
    tools: { freeMove: 3 },
    board: [
      '#######',
      '##oo###',
      '#######',
      '#######',
      '#gg####',
      '#######',
      '#######',
    ],
  },
]
