import { expect, test } from '@playwright/test'

import { STAGE_SECTIONS } from '../../src/stage-catalog'
import { STAGES } from '../../src/stages'
import { TOOL_STAGES } from '../../src/tool-stages'
import { TUTORIALS } from '../../src/tutorials'

test('stage catalog models every stage in ordered drill-down sections', () => {
  expect(STAGE_SECTIONS.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: 'tutorial', name: 'Tutorial' },
    { id: 'core', name: 'Core' },
    { id: 'tools', name: 'Tools' },
  ])
  expect(STAGE_SECTIONS.map(({ stages }) => stages.length)).toEqual([
    TUTORIALS.length,
    STAGES.length,
    TOOL_STAGES.length,
  ])

  const entries = STAGE_SECTIONS.flatMap(({ stages }) => stages)
  expect(new Set(entries.map(({ id }) => id)).size).toBe(entries.length)
  expect(entries.map(({ id }) => id)).toEqual(
    Array.from({ length: entries.length }, (_, index) => index + 1),
  )
})

test('catalog dependencies are stage IDs and can cross section boundaries', () => {
  const tutorial = STAGE_SECTIONS[0].stages
  const core = STAGE_SECTIONS[1].stages
  const tools = STAGE_SECTIONS[2].stages

  expect(tutorial[0].lockedBy).toBeNull()
  expect(tutorial[1].lockedBy).toBe(tutorial[0].id)
  expect(core[0].lockedBy).toBeNull()
  expect(core[1].lockedBy).toBe(core[0].id)
  expect(tools[0].lockedBy).toBe(core.at(-1)!.id)
})
