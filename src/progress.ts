import {
  stageEntry,
  stageSection,
  type StageCatalogEntry,
  type StageSectionId,
} from './stage-catalog'
import { STAGES } from './stages'

const STORAGE_KEY = 'dyestopia:progress'

/** Legacy projection retained for the debug bridge and existing consumers. */
export interface ProgressState {
  clearedStages: number[]
  clearedTutorials: number[]
}

interface StoredProgress extends Partial<ProgressState> {
  clearedStageIds?: number[]
  unlocked?: number
}

let clearedStageIds = load()

function validIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value)]
    .filter((id): id is number => Number.isInteger(id) && stageEntry(id) !== undefined)
    .sort((a, b) => a - b)
}

function idsFromIndices(sectionId: StageSectionId, value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const section = stageSection(sectionId)
  return [...new Set(value)]
    .filter((index): index is number =>
      Number.isInteger(index) && index >= 0 && index < section.stages.length)
    .map((index) => section.stages[index].id)
}

function load(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredProgress
    if (parsed.clearedStageIds) return validIds(parsed.clearedStageIds)

    // Migrate both historical formats to stable catalog IDs.
    const migratedCore = Number.isInteger(parsed.unlocked)
      ? Array.from(
          { length: Math.max(0, Math.min(STAGES.length, parsed.unlocked! - 1)) },
          (_, index) => index,
        )
      : parsed.clearedStages
    return validIds([
      ...idsFromIndices('core', migratedCore),
      ...idsFromIndices('tutorial', parsed.clearedTutorials),
    ])
  } catch {
    return []
  }
}

function indicesFor(sectionId: StageSectionId): number[] {
  return stageSection(sectionId).stages
    .filter(({ id }) => clearedStageIds.includes(id))
    .map(({ index }) => index)
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      clearedStageIds,
      // Keep legacy projections so older builds can still read this save.
      clearedStages: indicesFor('core'),
      clearedTutorials: indicesFor('tutorial'),
    }))
  } catch {
    // Session progress remains usable when storage is unavailable.
  }
}

export function progressState(): ProgressState {
  return {
    clearedStages: indicesFor('core'),
    clearedTutorials: indicesFor('tutorial'),
  }
}

export function clearedIds(): number[] {
  return [...clearedStageIds]
}

export function isCatalogStageCleared(stage: StageCatalogEntry | number): boolean {
  const id = typeof stage === 'number' ? stage : stage.id
  return clearedStageIds.includes(id)
}

export function catalogStageUnlocked(stage: StageCatalogEntry | number): boolean {
  const entry = typeof stage === 'number' ? stageEntry(stage) : stage
  if (!entry) return false
  return entry.lockedBy === null ||
    clearedStageIds.includes(entry.lockedBy) ||
    clearedStageIds.includes(entry.id)
}

export function sectionClearedCount(sectionId: StageSectionId): number {
  return indicesFor(sectionId).length
}

export function isStageCleared(index: number): boolean {
  const entry = stageSection('core').stages[index]
  return entry ? isCatalogStageCleared(entry) : false
}

export function isTutorialCleared(index: number): boolean {
  const entry = stageSection('tutorial').stages[index]
  return entry ? isCatalogStageCleared(entry) : false
}

export function naturalStageUnlocked(index: number): boolean {
  const entry = stageSection('core').stages[index]
  return entry ? catalogStageUnlocked(entry) : false
}

export function naturalTutorialUnlocked(index: number): boolean {
  const entry = stageSection('tutorial').stages[index]
  return entry ? catalogStageUnlocked(entry) : false
}

export function unlockedCount(): number {
  return stageSection('core').stages.filter(({ id }) => catalogStageUnlocked(id)).length
}

function recordSectionClear(sectionId: StageSectionId, index: number): boolean {
  const section = stageSection(sectionId)
  const entry = section.stages[index]
  if (!entry || isCatalogStageCleared(entry)) return false
  clearedStageIds.push(entry.id)
  clearedStageIds.sort((a, b) => a - b)
  save()
  return index + 1 < section.stages.length
}

export function recordWin(index: number): boolean {
  return recordSectionClear('core', index)
}

export function recordTutorialClear(index: number): boolean {
  return recordSectionClear('tutorial', index)
}

export function recordToolClear(index: number): boolean {
  return recordSectionClear('tools', index)
}

export function resetProgress(): void {
  clearedStageIds = []
  save()
}
