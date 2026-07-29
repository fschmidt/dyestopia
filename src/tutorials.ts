import type { Stage } from './stage'
import { STAGES } from './stages'

export type TutorialGoal =
  | 'swap'
  | 'mix'
  | 'chain'
  | 'rainbow-chain'
  | 'chain-breaker'
  | 'rainbow-chain-breaker'

export type TutorialVisual = 'match' | 'mix' | 'chain' | 'rainbow' | 'chain-breaker' | 'rainbow-breaker'

export interface TutorialExplanationPage {
  text: string
  visual: TutorialVisual
}

export interface Tutorial {
  name: string
  explanation: TutorialExplanationPage[]
  instruction: string
  success: string
  term: string
  stage: Stage
  goal: TutorialGoal
  showChain: boolean
  showScore: boolean
}

export const TUTORIALS: Tutorial[] = [
  {
    name: 'Make a Match',
    explanation: [{ text: 'A Match is three tiles of the same colour in a row.', visual: 'match' }],
    instruction: 'Swap the highlighted tile to make a Match.',
    success: 'Match! Three aligned tiles clear, then the board refills.',
    term: 'Match',
    stage: STAGES[0],
    goal: 'swap',
    showChain: false,
    showScore: false,
  },
  {
    name: 'Mix a Colour',
    explanation: [{ text: 'A Mix combines neighbouring primary colours into a new colour.', visual: 'mix' }],
    instruction: 'Mix red into yellow to make orange and complete a Match.',
    success: 'Mix! Direction matters: the dragged colour dyes its neighbour.',
    term: 'Mix',
    stage: STAGES[1],
    goal: 'mix',
    showChain: false,
    showScore: false,
  },
  {
    name: 'Build a Chain',
    explanation: [{ text: 'The Chain indicator fills when you create different Mix results.', visual: 'chain' }],
    instruction: 'Make two different Mix results to build a Chain.',
    success: 'Chain! Different Mix results raise your multiplier.',
    term: 'Chain',
    stage: STAGES[3],
    goal: 'chain',
    showChain: true,
    showScore: false,
  },
  {
    name: 'Reach Rainbow',
    explanation: [{ text: 'A Rainbow Chain contains every colour shown in the Chain indicator.', visual: 'rainbow' }],
    instruction: 'Make the final colour to complete the Rainbow Chain.',
    success: 'Rainbow Chain! Every required colour is now in the Chain.',
    term: 'Rainbow Chain',
    stage: STAGES[3],
    goal: 'rainbow-chain',
    showChain: true,
    showScore: false,
  },
  {
    name: 'Break the Chain',
    explanation: [{ text: 'A Chain Breaker is a Swap made after filling two Chain colours.', visual: 'chain-breaker' }],
    instruction: 'Build a Chain, then Swap to cash it in.',
    success: 'Chain Breaker! The Swap cashes in and resets the Chain.',
    term: 'Chain Breaker',
    stage: STAGES[3],
    goal: 'chain-breaker',
    showChain: true,
    showScore: true,
  },
  {
    name: 'Rainbow Chain Breaker',
    explanation: [{ text: 'A Rainbow Chain Breaker is a Swap made with a complete Rainbow Chain.', visual: 'rainbow-breaker' }],
    instruction: 'Complete a Rainbow Chain, then Swap to cash it in.',
    success: 'Rainbow Chain Breaker! The Swap cashes in the full Chain and resets it.',
    term: 'Rainbow Chain Breaker',
    stage: STAGES[3],
    goal: 'rainbow-chain-breaker',
    showChain: true,
    showScore: true,
  },
]
