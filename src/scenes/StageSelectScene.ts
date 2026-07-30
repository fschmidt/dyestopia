import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import {
  isStageCleared,
  isTutorialCleared,
  naturalStageUnlocked,
  naturalTutorialUnlocked,
  unlockedCount,
} from '../progress'
import { getSettings } from '../settings'
import { STAGES } from '../stages'
import { addText } from '../text'
import { TOOL_STAGES } from '../tool-stages'
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

  create(data: { reveal?: number; page?: 'tools' } = {}): void {
    this.reveal = data.reveal
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

    if (data.page === 'tools') {
      this.buildToolStages()
      return
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
      GAME_WIDTH / 3,
      GAME_HEIGHT - 36,
      Math.min(220, GAME_WIDTH / 2 - 30),
      '‹  Menu',
      () => this.fadeTo('Menu'),
      { kind: 'quiet', name: 'button-back' },
    )
    addButton(
      this,
      (GAME_WIDTH * 2) / 3,
      GAME_HEIGHT - 36,
      Math.min(220, GAME_WIDTH / 2 - 30),
      'Tools  ›',
      () => this.scene.restart({ page: 'tools' }),
      { kind: 'primary', name: 'tool-stages' },
    )

    this.input.keyboard?.once('keydown-ESC', () => this.fadeTo('Menu'))
    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('Game', { stage: frontier }))
    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('Game', { stage: frontier }))
  }

  private buildToolStages(): void {
    const visual = resolveVisualProfile()
    const width = Math.min(620, GAME_WIDTH - 28)
    const top = Math.min(150, GAME_HEIGHT * 0.2)
    addText(this, (GAME_WIDTH - width) / 2 + 12, top, 'TOOLS', {
      fontFamily: visual.type.family,
      fontSize: visual.type.label,
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(visual.colors.secondaryInk),
    })
    addSurface(this, GAME_WIDTH / 2, top + 116, width, 180, 'tool-stage-ledger')

    const size = Math.min(116, width * 0.24)
    TOOL_STAGES.forEach((stage, index) => {
      const x = (GAME_WIDTH - width) / 2 + 28 + size / 2 + index * (size + 20)
      const y = top + 96
      const cell = this.add
        .rectangle(x, y, size, size, visual.colors.accent, 0.88)
        .setStrokeStyle(3, visual.colors.primaryInk, 0.7)
        .setName(`tool-stage-${index}`)
        .setInteractive({ useHandCursor: true })
      addText(this, x, y - 9, `${STAGES.length + index + 1}`, {
        fontFamily: visual.type.family,
        fontSize: `${Math.round(size * 0.4)}px`,
        fontStyle: 'bold',
        color: ink(visual.colors.accentInk),
      }).setOrigin(0.5)
      addText(this, x, y + size * 0.3, stage.name.toUpperCase(), {
        fontFamily: visual.type.family,
        fontSize: '11px',
        fontStyle: 'bold',
        color: ink(visual.colors.accentInk),
      }).setOrigin(0.5)
      cell.on('pointerup', () => this.fadeTo('Game', { toolStage: index }))
    })

    addText(this, GAME_WIDTH / 2, top + 236, 'Tool stages are focused testing grounds for each tool.', {
      fontFamily: visual.type.family,
      fontSize: '16px',
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(0.5)

    addButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 36,
      Math.min(260, GAME_WIDTH - 48),
      '‹  Core stages',
      () => this.scene.restart(),
      { kind: 'quiet', name: 'button-back' },
    )
    this.input.keyboard?.once('keydown-ESC', () => this.scene.restart())
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
