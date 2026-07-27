import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { DYES, PALETTE, toCss, type Dye } from '../palette'
import { addText } from '../text'
import { TILE_SIZE } from '../tiles/bake'
import { Tile } from '../tiles/Tile'
import { BaseScene } from './BaseScene'

const COLS = 4
const ROWS = 3
const GAP = 26

/**
 * Placeholder round: a target colour is named, the player taps the matching
 * swatch. Enough to prove input, state and scene transitions work — the real
 * game rules replace `pickTarget` / `onSwatchClicked`.
 */
export class GameScene extends BaseScene {
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

    addText(this, GAME_WIDTH - 24, 20, 'ESC = Menu', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: toCss(PALETTE.inkMuted),
    }).setOrigin(1, 0)

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'))
  }

  private buildGrid(): void {
    const gridWidth = COLS * TILE_SIZE + (COLS - 1) * GAP
    const gridHeight = ROWS * TILE_SIZE + (ROWS - 1) * GAP
    const originX = (GAME_WIDTH - gridWidth) / 2
    const originY = (GAME_HEIGHT - gridHeight) / 2 + 40

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col
        const dye = DYES[index % DYES.length]
        const x = originX + col * (TILE_SIZE + GAP) + TILE_SIZE / 2
        const y = originY + row * (TILE_SIZE + GAP) + TILE_SIZE / 2

        // A prime stride spreads the idle phases so no two neighbours — in
        // either direction — are ever in step.
        const tile = new Tile(this, x, y, dye, index * 7)
        tile.on('pointerup', () => this.onSwatchClicked(dye, tile))
      }
    }
  }

  private pickTarget(): void {
    this.target = Phaser.Utils.Array.GetRandom(DYES)
  }

  private onSwatchClicked(dye: Dye, tile: Tile): void {
    const correct = dye.name === this.target.name
    this.score += correct ? 1 : -1

    tile.squish()
    if (correct) {
      tile.celebrate()
      this.pickTarget()
    } else {
      tile.reject()
    }

    this.updateHud()
  }

  private updateHud(): void {
    this.scoreText.setText(`Score: ${this.score}`)
    this.targetText.setText(`Find: ${this.target.name}`)
    this.targetText.setColor(toCss(this.target.value))
  }
}
