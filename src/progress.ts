import { STAGES } from './stages'
import { TUTORIALS } from './tutorials'

const STORAGE_KEY = 'dyestopia:progress'

export interface ProgressState {
  clearedStages: number[]
  clearedTutorials: number[]
}

let state = load()

function validIndices(value: unknown, length: number): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value)]
    .filter((index): index is number => Number.isInteger(index) && index >= 0 && index < length)
    .sort((a, b) => a - b)
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { clearedStages: [], clearedTutorials: [] }
    const parsed = JSON.parse(raw) as Partial<ProgressState> & { unlocked?: number }
    // Migrate the old frontier-only format by treating stages behind it as cleared.
    const migrated = Number.isInteger(parsed.unlocked)
      ? Array.from({ length: Math.max(0, Math.min(STAGES.length, parsed.unlocked! - 1)) }, (_, i) => i)
      : []
    return {
      clearedStages: validIndices(parsed.clearedStages ?? migrated, STAGES.length),
      clearedTutorials: validIndices(parsed.clearedTutorials, TUTORIALS.length),
    }
  } catch {
    return { clearedStages: [], clearedTutorials: [] }
  }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Session progress remains usable when storage is unavailable.
  }
}

export function progressState(): ProgressState {
  return {
    clearedStages: [...state.clearedStages],
    clearedTutorials: [...state.clearedTutorials],
  }
}

export function isStageCleared(index: number): boolean {
  return state.clearedStages.includes(index)
}

export function isTutorialCleared(index: number): boolean {
  return state.clearedTutorials.includes(index)
}

export function naturalStageUnlocked(index: number): boolean {
  return index === 0 || state.clearedStages.includes(index - 1) || isStageCleared(index)
}

export function naturalTutorialUnlocked(index: number): boolean {
  return index === 0 || state.clearedTutorials.includes(index - 1) || isTutorialCleared(index)
}

export function unlockedCount(): number {
  let count = 0
  while (count < STAGES.length && naturalStageUnlocked(count)) count++
  return count
}

export function recordWin(index: number): boolean {
  if (isStageCleared(index)) return false
  state.clearedStages.push(index)
  state.clearedStages.sort((a, b) => a - b)
  save()
  return index + 1 < STAGES.length
}

export function recordTutorialClear(index: number): boolean {
  if (isTutorialCleared(index)) return false
  state.clearedTutorials.push(index)
  state.clearedTutorials.sort((a, b) => a - b)
  save()
  return index + 1 < TUTORIALS.length
}

export function resetProgress(): void {
  state = { clearedStages: [], clearedTutorials: [] }
  save()
}
