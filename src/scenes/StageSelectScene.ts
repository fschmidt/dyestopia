import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { unlockedCount } from '../progress'
import { STAGES } from '../stages'
import { addText } from '../text'
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

  create(data: { reveal?: number } = {}): void {
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
      const text = addText(this, 0, 0, 'STAGE LEDGER', {
        fontFamily: visual.type.family,
        fontSize: '34px',
        fontStyle: 'bold',
        letterSpacing: 3,
        color: ink(0x292621),
      }).setOrigin(0.5)
      title.add([plate, text])
    } else {
      addText(this, GAME_WIDTH / 2, titleY, 'STAGE LEDGER', {
        fontFamily: visual.type.family,
        fontSize: '38px',
        fontStyle: 'bold',
        letterSpacing: 3,
        color: ink(visual.colors.primaryInk),
      }).setOrigin(0.5)
    }

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
    this.buildGrid(unlocked)

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

  /** Cell pitch (cell + gap), sized to the width and capped for desktops. */
  private cellPitch(): number {
    const margin = Math.min(80, Math.round(GAME_WIDTH * 0.08))
    return Math.min((GAME_WIDTH - margin * 2) / COLS, 108)
  }

  private gridTop(): number {
    return Math.min(220, Math.round(GAME_HEIGHT * 0.26))
  }

  private buildGrid(unlocked: number): void {
    const visual = resolveVisualProfile()
    const pitch = this.cellPitch()
    const size = pitch * 0.84
    const originX = (GAME_WIDTH - COLS * pitch) / 2 + pitch / 2

    STAGES.forEach((_, i) => {
      const x = originX + (i % COLS) * pitch
      const y = this.gridTop() + Math.floor(i / COLS) * pitch + pitch / 2
      // The freshly unlocked cell starts asleep and wakes in the reveal.
      const open = i < unlocked && i !== this.reveal
      const played = i < unlocked - 1
      const current = i === unlocked - 1

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
        this.add.rectangle(x, y + size * 0.32, size * 0.3, 3, visual.colors.accent, 0.9)
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
