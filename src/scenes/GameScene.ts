import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { DYES, PALETTE, toCss, type Dye } from '../palette'
import { addText } from '../text'

const COLS = 4
const ROWS = 3
const TILE = 120
const GAP = 16

/**
 * Placeholder round: a target colour is named, the player taps the matching
 * swatch. Enough to prove input, state and scene transitions work — the real
 * game rules replace `pickTarget` / `onSwatchClicked`.
 */
export class GameScene extends Phaser.Scene {
  private score = 0
  private scoreText!: Phaser.GameObjects.Text
  private targetText!: Phaser.GameObjects.Text
  private target!: Dye

  constructor() {
    super('Game')
  }

  create(): void {
    this.score = 0

    this.scoreText = addText(this, 24, 20, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: toCss(PALETTE.ink),
    })

    this.targetText = addText(this, GAME_WIDTH / 2, 76, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: toCss(PALETTE.ink),
    }).setOrigin(0.5)

    this.buildGrid()
    this.pickTarget()
    this.updateHud()

    addText(this, GAME_WIDTH - 24, 20, 'ESC = Menü', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: toCss(PALETTE.inkMuted),
    }).setOrigin(1, 0)

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'))
  }

  private buildGrid(): void {
    const gridWidth = COLS * TILE + (COLS - 1) * GAP
    const gridHeight = ROWS * TILE + (ROWS - 1) * GAP
    const originX = (GAME_WIDTH - gridWidth) / 2
    const originY = (GAME_HEIGHT - gridHeight) / 2 + 40

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dye = DYES[(row * COLS + col) % DYES.length]
        const x = originX + col * (TILE + GAP) + TILE / 2
        const y = originY + row * (TILE + GAP) + TILE / 2

        const tile = this.add
          .rectangle(x, y, TILE, TILE, dye.value)
          .setInteractive({ useHandCursor: true })

        tile.on('pointerover', () => tile.setScale(1.05))
        tile.on('pointerout', () => tile.setScale(1))
        tile.on('pointerup', () => this.onSwatchClicked(dye, tile))
      }
    }
  }

  private pickTarget(): void {
    this.target = Phaser.Utils.Array.GetRandom(DYES)
  }

  private onSwatchClicked(dye: Dye, tile: Phaser.GameObjects.Rectangle): void {
    const correct = dye.name === this.target.name
    this.score += correct ? 1 : -1

    this.tweens.add({
      targets: tile,
      angle: correct ? 360 : 0,
      x: correct ? tile.x : tile.x + 6,
      duration: correct ? 300 : 60,
      yoyo: !correct,
      repeat: correct ? 0 : 2,
      onComplete: () => {
        tile.angle = 0
      },
    })

    if (correct) this.pickTarget()
    this.updateHud()
  }

  private updateHud(): void {
    this.scoreText.setText(`Punkte: ${this.score}`)
    this.targetText.setText(`Finde: ${this.target.name}`)
    this.targetText.setColor(toCss(this.target.value))
  }
}
