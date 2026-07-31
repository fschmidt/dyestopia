import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import {
  catalogStageUnlocked,
  isCatalogStageCleared,
  isStageCleared,
  isTutorialCleared,
  naturalStageUnlocked,
  naturalTutorialUnlocked,
  sectionClearedCount,
  unlockedCount,
} from '../progress'
import { getSettings } from '../settings'
import {
  STAGE_SECTIONS,
  stageSection,
  stageStartData,
  type StageCatalogEntry,
  type StageSectionId,
} from '../stage-catalog'
import { STAGES } from '../stages'
import { addText } from '../text'
import { TUTORIALS } from '../tutorials'
import { addButton, addSurface } from '../ui/components'
import { ink, resolveVisualProfile } from '../ui/visual-system'
import { BaseScene } from './BaseScene'

/** Stage cells per row — 10 stages read as two rows of five. */
const COLS = 5

/**
 * The stage map: linear unlock, replay anything already open. Each stage is
 * a numbered cell — played ones dimly satisfied, the frontier bright, locked
 * ones asleep — and the line under the grid names the frontier, since the
 * cells are too small to carry names on a phone.
 *
 * Arriving with `{ reveal: n }` (a win just opened stage n) plays the unlock
 * reveal: the cell wakes up a beat after the scene builds, so the player sees
 * the new stage open rather than finding it already there.
 */
export class StageSelectScene extends BaseScene {
  private reveal?: number

  constructor() {
    super('StageSelect')
  }

  create(data: {
    reveal?: number
    page?: 'modes' | StageSectionId
    selected?: number
  } = {}): void {
    this.reveal = data.reveal
    if (data.page === 'modes') {
      this.buildModeSelect()
      return
    }
    if (data.page === 'core' || data.page === 'tutorial' || data.page === 'tools') {
      this.buildRedesignedStages(data.page, data.selected)
      return
    }
    const visual = resolveVisualProfile()

    const titleY = Math.min(74, GAME_HEIGHT * 0.09)
    if (visual.treatment === 'spray-can') {
      const width = Math.min(420, GAME_WIDTH - 48)
      const title = this.add
        .container(GAME_WIDTH / 2, titleY)
        .setName('stage-title-label')
        .setAngle(-1)
      const plate = this.add.graphics()
      plate.fillStyle(0xe8e4d9, 1)
      plate.fillPoints([
        new Phaser.Math.Vector2(-width / 2 + 4, -28),
        new Phaser.Math.Vector2(width / 2, -27),
        new Phaser.Math.Vector2(width / 2 - 3, 28),
        new Phaser.Math.Vector2(-width / 2, 26),
      ], true)
      const text = addText(this, 0, 0, 'SELECT A STAGE', {
        fontFamily: visual.type.family,
        fontSize: '34px',
        fontStyle: 'bold',
        letterSpacing: 3,
        color: ink(0x292621),
      }).setOrigin(0.5)
      title.add([plate, text])
    } else {
      addText(this, GAME_WIDTH / 2, titleY, 'SELECT A STAGE', {
        fontFamily: visual.type.family,
        fontSize: '38px',
        fontStyle: 'bold',
        letterSpacing: 3,
        color: ink(visual.colors.primaryInk),
      }).setOrigin(0.5)
    }

    this.buildTutorials()
    const unlocked = unlockedCount()
    const rows = Math.ceil(STAGES.length / COLS)
    const panelHeight = this.cellPitch() * rows + 112
    addSurface(
      this,
      GAME_WIDTH / 2,
      this.gridTop() + (this.cellPitch() * rows) / 2,
      Math.min(620, GAME_WIDTH - 28),
      panelHeight,
      'stage-ledger',
    )
    this.buildGrid()

    const frontier = Math.min(unlocked, STAGES.length) - 1
    const frontierY =
      this.gridTop() + this.cellPitch() * Math.ceil(STAGES.length / COLS) + 36
    if (visual.treatment === 'spray-can') {
      const width = Math.min(360, GAME_WIDTH - 64)
      const plate = this.add
        .graphics({ x: GAME_WIDTH / 2, y: frontierY })
        .setName('frontier-label')
        .setAngle(1)
      plate.fillStyle(0xe8e4d9, 0.96)
      plate.fillPoints([
        new Phaser.Math.Vector2(-width / 2 + 3, -20),
        new Phaser.Math.Vector2(width / 2, -19),
        new Phaser.Math.Vector2(width / 2 - 2, 20),
        new Phaser.Math.Vector2(-width / 2, 19),
      ], true)
    }
    addText(
      this,
      GAME_WIDTH / 2,
      frontierY,
      `Next: ${frontier + 1} — ${STAGES[frontier].name}`,
      {
        fontFamily: visual.type.family,
        fontSize: '18px',
        fontStyle: visual.treatment === 'spray-can' ? 'bold' : 'normal',
        color: ink(
          visual.treatment === 'spray-can'
            ? 0x37332d
            : visual.colors.secondaryInk,
        ),
      },
    )
      .setOrigin(0.5)
      .setName('frontier')

    addButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 36,
      Math.min(220, GAME_WIDTH - 48),
      '‹  Menu',
      () => this.fadeTo('Menu'),
      { kind: 'quiet', name: 'button-back' },
    )

    this.input.keyboard?.once('keydown-ESC', () => this.fadeTo('Menu'))
    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('Game', { stage: frontier }))
    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('Game', { stage: frontier }))
  }

  private designText(
    x: number,
    y: number,
    value: string,
    size: number,
    color: number,
    weight: 'normal' | 'bold' = 'bold',
  ): Phaser.GameObjects.Text {
    return addText(this, x, y, value, {
      fontFamily: 'Archivo, sans-serif',
      fontSize: `${size}px`,
      fontStyle: weight,
      color: ink(color),
    })
  }

  private buildPaperTitle(label: string): void {
    const width = Math.min(330, Math.max(230, label.length * 23 + 72))
    const y = 62
    this.add.rectangle(GAME_WIDTH / 2, y + 3, width, 58, 0x000000, 0.4)
    this.add.rectangle(GAME_WIDTH / 2, y, width, 58, 0xece8dd)
    this.designText(GAME_WIDTH / 2, y, label, 26, 0x1c1712)
      .setOrigin(0.5)
      .setLetterSpacing(6)
  }

  private buildModeSelect(): void {
    this.buildPaperTitle('STAGES')
    const width = Math.min(520, GAME_WIDTH - 48)
    const top = Math.max(154, GAME_HEIGHT * 0.22)
    const unlockAll = getSettings().unlockAllStages
    STAGE_SECTIONS.forEach((section, index) => {
      const sectionOpen = unlockAll ||
        section.stages[0] === undefined ||
        catalogStageUnlocked(section.stages[0])
      this.buildModeCard(
        section.name.toUpperCase(),
        top + index * 142,
        width,
        section.stages.length,
        sectionClearedCount(section.id),
        section.id,
        !sectionOpen,
      )
    })

    addButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 42,
      Math.min(230, GAME_WIDTH - 48),
      '‹  Title',
      () => this.fadeTo('Menu'),
      { kind: 'quiet', name: 'button-back' },
    )
    this.input.keyboard?.once('keydown-ESC', () => this.fadeTo('Menu'))
  }

  private buildModeCard(
    label: string,
    y: number,
    width: number,
    total: number,
    cleared: number,
    mode: StageSectionId,
    locked: boolean,
  ): void {
    const height = 112
    const active = !locked && cleared < total
    const card = this.add
      .rectangle(GAME_WIDTH / 2, y, width, height, 0x161411)
      .setStrokeStyle(1, active ? 0xedc22e : 0x3a342c)
      .setName(`mode-${mode}`)
    if (!locked) {
      card.setInteractive({ useHandCursor: true })
      card.on('pointerup', () => this.scene.restart({ page: mode }))
    }
    const left = GAME_WIDTH / 2 - width / 2 + 24
    this.designText(left, y - 30, label, 24, locked ? 0x57534a : 0xf0ead8).setOrigin(0, 0.5).setLetterSpacing(2)
    const status = cleared === total ? 'CLEARED' : `${cleared} / ${total}`
    const statusColor = cleared === total && !locked ? 0x1c1712 : 0x8a8478
    if (cleared === total && !locked) this.add.rectangle(GAME_WIDTH / 2 + width / 2 - 58, y - 30, 84, 25, 0xedc22e).setAngle(-4)
    if (locked) {
      this.addLock(GAME_WIDTH / 2 + width / 2 - 58, y - 30)
        .setName(`section-lock-${mode}`)
    } else {
      this.designText(GAME_WIDTH / 2 + width / 2 - 58, y - 30, status, cleared === total ? 11 : 13, statusColor)
        .setOrigin(0.5)
        .setLetterSpacing(cleared === total ? 2 : 1)
    }

    const gap = 6
    const segmentWidth = (width - 48 - gap * (total - 1)) / total
    const startX = left + segmentWidth / 2
    for (let index = 0; index < total; index++) {
      this.add.rectangle(
        startX + index * (segmentWidth + gap),
        y + 28,
        segmentWidth,
        10,
        index < cleared ? 0xedc22e : 0x33302a,
      )
    }
  }

  private buildRedesignedStages(mode: StageSectionId, requested?: number): void {
    const section = stageSection(mode)
    const entries = section.stages
    const unlockAll = getSettings().unlockAllStages
    const cleared = (index: number): boolean => isCatalogStageCleared(entries[index])
    const open = (index: number): boolean => unlockAll || catalogStageUnlocked(entries[index])
    let selected = requested
    if (selected === undefined || !open(selected)) {
      selected = entries.findIndex((_, index) => open(index) && !cleared(index))
      if (selected < 0) selected = entries.length - 1
    }

    this.buildPaperTitle(section.name.toUpperCase())
    const width = Math.min(520, GAME_WIDTH - 48)
    const left = GAME_WIDTH / 2 - width / 2
    const gridTop = 112
    const compact = GAME_HEIGHT < 760
    const gap = compact ? 6 : 10
    const cols = 2
    const cellWidth = (width - 28 - gap) / cols
    const cellHeight = compact ? 42 : 54
    const rows = Math.ceil(entries.length / cols)
    const panelHeight = rows * cellHeight + (rows - 1) * gap + 28
    this.add.rectangle(GAME_WIDTH / 2, gridTop + panelHeight / 2, width, panelHeight, 0x161411)
      .setStrokeStyle(1, 0x3a342c)

    entries.forEach((entry, index) => {
      const x = left + 14 + cellWidth / 2 + (index % cols) * (cellWidth + gap)
      const y = gridTop + 14 + cellHeight / 2 + Math.floor(index / cols) * (cellHeight + gap)
      const isOpen = open(index)
      const isCleared = cleared(index)
      const isSelected = index === selected
      const fill = isSelected ? (isCleared ? 0xece8dd : 0xedc22e) : isCleared ? 0x25211a : isOpen ? 0xedc22e : 0x1b1815
      const border = isSelected ? (isCleared ? 0xffffff : 0xf5d75c) : isCleared ? 0x7d6a2e : isOpen ? 0xf5d75c : 0x33302a
      const tile = this.add.rectangle(x, y, cellWidth, cellHeight, fill).setStrokeStyle(1, border)
      const hitName = `${mode === 'tutorial' ? 'tutorial' : mode === 'tools' ? 'tool-stage' : 'stage'}-${index}`
      tile.setName(hitName)
      if (isOpen) {
        tile.setInteractive({ useHandCursor: true })
        tile.on('pointerup', () => this.scene.restart({ page: mode, selected: index }))
      }
      const inkColor = isSelected || (!isCleared && isOpen) ? 0x1c1712 : isCleared ? 0xedc22e : 0x57534a
      this.designText(x - cellWidth / 2 + 12, y - 10, `${entry.id}`, 20, inkColor).setOrigin(0, 0.5)
      this.designText(
        x - cellWidth / 2 + 12,
        y + 13,
        entry.name.toUpperCase(),
        12,
        isSelected || (!isCleared && isOpen) ? 0x1c1712 : isCleared ? 0xc9c2b2 : 0x57534a,
      ).setOrigin(0, 0.5).setLetterSpacing(1)
      if (isCleared) this.addDesignStamp(x + cellWidth / 2 - 43, y - 10, isSelected)
      if (!isOpen) this.addLock(x + cellWidth / 2 - 23, y - 9)
    })

    const detailTop = gridTop + panelHeight + 14
    this.buildStageDetail(entries[selected], detailTop, width, cleared(selected), open(selected))
    addButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 37,
      Math.min(220, GAME_WIDTH - 48),
      '‹  Stages',
      () => this.scene.restart({ page: 'modes' }),
      { kind: 'quiet', name: 'button-back' },
    )
    this.input.keyboard?.once('keydown-ESC', () => this.scene.restart({ page: 'modes' }))
  }

  private buildStageDetail(
    entry: StageCatalogEntry,
    top: number,
    width: number,
    cleared: boolean,
    open: boolean,
  ): void {
    const name = entry.name.toUpperCase()
    const description = entry.tutorial?.explanation.map(({ text }) => text).join(' ') ?? entry.stage.hint
    const height = Math.min(166, GAME_HEIGHT - top - 88)
    const centerY = top + height / 2
    this.add.rectangle(GAME_WIDTH / 2, centerY, width, height, 0x1d1b17)
      .setStrokeStyle(1, 0x4a4335)
    this.add.rectangle(GAME_WIDTH / 2, top + 1, width, 2, cleared ? 0xece8dd : 0xedc22e)
    const left = GAME_WIDTH / 2 - width / 2 + 20
    this.designText(left, top + 25, `${entry.id}`, 30, cleared ? 0xece8dd : open ? 0xedc22e : 0x57534a).setOrigin(0, 0.5)
    this.designText(left + 46, top + 25, name, 19, 0xf0ead8).setOrigin(0, 0.5).setLetterSpacing(2)
    if (cleared) this.addDesignStamp(GAME_WIDTH / 2 + width / 2 - 47, top + 25, false)
    else this.designText(GAME_WIDTH / 2 + width / 2 - 20, top + 25, open ? 'NEXT UP' : 'LOCKED', 12, 0x8a8478).setOrigin(1, 0.5).setLetterSpacing(2)
    this.designText(left, top + 55, description, 14, 0xb5afa3, 'normal')
      .setWordWrapWidth(width - 40)
      .setLineSpacing(3)

    const ctaY = top + height - 30
    const button = this.add.rectangle(
      GAME_WIDTH / 2,
      ctaY,
      width - 40,
      48,
      !open || cleared ? 0x1d1b17 : 0xedc22e,
    ).setStrokeStyle(cleared || !open ? 1 : 0, open ? 0xedc22e : 0x4a4335).setName('stage-cta')
    this.designText(GAME_WIDTH / 2, ctaY, !open ? 'LOCKED' : cleared ? 'REPLAY  ›' : 'PLAY  ›', 17, !open ? 0x57534a : cleared ? 0xedc22e : 0x1c1712)
      .setOrigin(0.5)
      .setLetterSpacing(3)
    if (open) {
      button.setInteractive({ useHandCursor: true })
      button.on('pointerup', () => this.fadeTo('Game', stageStartData(entry)))
    }
  }

  private addDesignStamp(x: number, y: number, inverted: boolean): void {
    this.add.rectangle(x, y, 74, 22, inverted ? 0x1c1712 : 0xedc22e).setAngle(-4)
    this.designText(x, y, 'CLEARED', 9, inverted ? 0xedc22e : 0x1c1712).setOrigin(0.5).setAngle(-4).setLetterSpacing(1.5)
  }

  private addLock(x: number, y: number): Phaser.GameObjects.Graphics {
    const lock = this.add.graphics({ x, y }).setAngle(-8)
    lock.lineStyle(3, 0x57534a)
    lock.beginPath()
    lock.arc(0, -5, 7, Math.PI, 0)
    lock.strokePath()
    lock.fillStyle(0x57534a)
    lock.fillRect(-9, -4, 18, 14)
    lock.fillStyle(0x1b1815)
    lock.fillRect(-1.5, 1, 3, 6)
    return lock
  }

  /** Cell pitch (cell + gap), sized to the width and capped for desktops. */
  private cellPitch(): number {
    const margin = Math.min(80, Math.round(GAME_WIDTH * 0.08))
    return Math.min((GAME_WIDTH - margin * 2) / COLS, 108)
  }

  private gridTop(): number {
    return Math.min(330, Math.round(GAME_HEIGHT * 0.44))
  }

  private buildTutorials(): void {
    const visual = resolveVisualProfile()
    const unlockAll = getSettings().unlockAllStages
    const width = Math.min(620, GAME_WIDTH - 28)
    const top = Math.min(122, GAME_HEIGHT * 0.16)
    addText(this, (GAME_WIDTH - width) / 2 + 12, top, 'TUTORIAL', {
      fontFamily: visual.type.family,
      fontSize: visual.type.label,
      fontStyle: 'bold',
      letterSpacing: 2,
      color: ink(visual.colors.secondaryInk),
    })
    addSurface(this, GAME_WIDTH / 2, top + 62, width, 98, 'tutorial-ledger')
    const pitch = Math.min((width - 34) / TUTORIALS.length, 92)
    const startX = GAME_WIDTH / 2 - (pitch * (TUTORIALS.length - 1)) / 2
    TUTORIALS.forEach((tutorial, index) => {
      const x = startX + index * pitch
      const y = top + 62
      const open = unlockAll || naturalTutorialUnlocked(index)
      const cell = this.add
        .rectangle(x, y, pitch * 0.72, 62, open ? visual.colors.accent : visual.colors.secondaryInk, open ? 0.18 : 0.06)
        .setStrokeStyle(2, open ? visual.colors.accent : visual.colors.secondaryInk, open ? 0.8 : 0.2)
        .setName(`tutorial-cell-${index}`)
      addText(this, x, y - 5, `${index + 1}`, {
        fontFamily: visual.type.family,
        fontSize: '22px',
        fontStyle: 'bold',
        color: ink(open ? visual.colors.primaryInk : visual.colors.secondaryInk),
      }).setOrigin(0.5)
      if (isTutorialCleared(index)) this.addClearedStamp(x, y + 20, pitch * 0.62)
      if (open) {
        cell.setInteractive({ useHandCursor: true }).setName(`tutorial-${index}`)
        cell.on('pointerup', () => this.fadeTo('Game', { tutorial: index }))
      }
      cell.setData('label', tutorial.name)
    })
  }

  private buildGrid(): void {
    const visual = resolveVisualProfile()
    const unlockAll = getSettings().unlockAllStages
    const pitch = this.cellPitch()
    const size = pitch * 0.84
    const originX = (GAME_WIDTH - COLS * pitch) / 2 + pitch / 2

    STAGES.forEach((_, i) => {
      const x = originX + (i % COLS) * pitch
      const y = this.gridTop() + Math.floor(i / COLS) * pitch + pitch / 2
      // The freshly unlocked cell starts asleep and wakes in the reveal.
      const naturallyOpen = naturalStageUnlocked(i)
      const open = (unlockAll || naturallyOpen) && i !== this.reveal
      const played = isStageCleared(i)
      const current = naturallyOpen && !played

      const cell = this.add
        .rectangle(x, y, size, size, open ? visual.colors.accent : visual.colors.secondaryInk, open ? 0.2 : 0.08)
        .setStrokeStyle(2, open ? visual.colors.accent : visual.colors.secondaryInk, open ? 0.9 : 0.25)
        .setName(`stage-${i}`)
      if (visual.treatment === 'spray-can' && open) {
        cell
          .setFillStyle(
            current ? visual.colors.accent : visual.colors.surfaceStrong,
            current ? 0.88 : 0.72,
          )
          .setStrokeStyle(
            current ? 3 : 2,
            current ? visual.colors.primaryInk : visual.colors.accent,
            current ? 0.72 : 0.9,
          )
      }

      const number = addText(this, x, y, `${i + 1}`, {
        fontFamily: visual.type.family,
        fontSize: `${Math.round(size * 0.42)}px`,
        fontStyle: 'bold',
        color: ink(
          visual.treatment === 'spray-can' && current
            ? visual.colors.accentInk
            : open
              ? visual.colors.primaryInk
              : visual.colors.secondaryInk,
        ),
      })
        .setOrigin(0.5)
        .setAlpha(open ? 1 : 0.5)

      // A quiet tick under stages already beaten.
      if (played) {
        this.addClearedStamp(x, y + size * 0.3, size * 0.72)
      }

      if (open || i === this.reveal) {
        const arm = (): void => {
          cell.setInteractive({ useHandCursor: true })
          cell.on('pointerover', () => this.tweens.add({ targets: [cell, number], scale: 1.07, duration: 120 }))
          cell.on('pointerout', () => this.tweens.add({ targets: [cell, number], scale: 1, duration: 120 }))
          cell.on('pointerup', () => this.fadeTo('Game', { stage: i }))
        }
        if (i === this.reveal) {
          this.playReveal(cell, number, arm)
        } else {
          arm()
        }
      }
    })
  }

  private addClearedStamp(x: number, y: number, width: number): void {
    const visual = resolveVisualProfile()
    const stamp = addText(this, x, y, 'CLEARED', {
      fontFamily: visual.type.family,
      fontSize: '10px',
      fontStyle: 'bold',
      letterSpacing: 1,
      color: ink(visual.colors.accent),
    }).setOrigin(0.5).setAngle(visual.treatment === 'spray-can' ? -4 : 0)
    stamp.setName('cleared-stamp')
    this.add.rectangle(x, y, width, 16).setStrokeStyle(1, visual.colors.accent, 0.72).setAngle(stamp.angle)
  }

  /**
   * The unlock reveal: the cell wakes — colours come on, a pop, and a ring
   * that swells off it — then becomes tappable like the rest.
   */
  private playReveal(
    cell: Phaser.GameObjects.Rectangle,
    number: Phaser.GameObjects.Text,
    onDone: () => void,
  ): void {
    const visual = resolveVisualProfile()
    this.time.delayedCall(420, () => {
      cell.setFillStyle(visual.colors.accent, 0.18).setStrokeStyle(2, visual.colors.accent, 0.9)
      number.setColor(ink(visual.colors.primaryInk)).setAlpha(1)

      const ring = this.add
        .rectangle(cell.x, cell.y, cell.width, cell.height)
        .setStrokeStyle(3, visual.colors.accent, 1)
      this.tweens.add({
        targets: ring,
        scale: 1.7,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      })
      this.tweens.chain({
        targets: [cell, number],
        tweens: [
          { scale: 1.22, duration: 140, ease: 'Quad.easeOut' },
          { scale: 1, duration: 260, ease: 'Back.easeOut' },
        ],
        onComplete: onDone,
      })
    })
  }
}
