import type { Stage } from './stage'
import { STAGES } from './stages'
import { TOOL_STAGES } from './tool-stages'
import { TUTORIALS, type Tutorial } from './tutorials'

export type StageSectionId = 'tutorial' | 'core' | 'tools'

export interface StageCatalogEntry {
  /** Stable, globally unique progress and dependency key. */
  id: number
  name: string
  /** The stage that must be cleared first, including across sections. */
  lockedBy: number | null
  sectionId: StageSectionId
  index: number
  stage: Stage
  tutorial?: Tutorial
}

export interface StageCatalogSection {
  id: StageSectionId
  name: string
  stages: StageCatalogEntry[]
}

export type StageStartData =
  | { tutorial: number }
  | { stage: number }
  | { toolStage: number }

let nextId = 1

function entries(
  sectionId: StageSectionId,
  sources: Array<Stage | Tutorial>,
  firstLockedBy: number | null,
): StageCatalogEntry[] {
  return sources.map((source, index) => {
    const tutorial = 'stage' in source ? source : undefined
    const id = nextId++
    return {
      id,
      name: source.name,
      lockedBy: index === 0 ? firstLockedBy : id - 1,
      sectionId,
      index,
      stage: tutorial?.stage ?? source as Stage,
      tutorial,
    }
  })
}

const tutorialStages = entries('tutorial', TUTORIALS, null)
const coreStages = entries('core', STAGES, null)
const toolStages = entries('tools', TOOL_STAGES, coreStages.at(-1)?.id ?? null)

export const STAGE_SECTIONS: StageCatalogSection[] = [
  { id: 'tutorial', name: 'Tutorial', stages: tutorialStages },
  { id: 'core', name: 'Core', stages: coreStages },
  { id: 'tools', name: 'Tools', stages: toolStages },
]

const entriesById = new Map(
  STAGE_SECTIONS.flatMap(({ stages }) => stages).map((entry) => [entry.id, entry]),
)

export function stageSection(id: StageSectionId): StageCatalogSection {
  return STAGE_SECTIONS.find((section) => section.id === id)!
}

export function stageEntry(id: number): StageCatalogEntry | undefined {
  return entriesById.get(id)
}

export function stageStartData(entry: StageCatalogEntry): StageStartData {
  if (entry.sectionId === 'tutorial') return { tutorial: entry.index }
  if (entry.sectionId === 'tools') return { toolStage: entry.index }
  return { stage: entry.index }
}
