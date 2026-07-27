import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { DYES, PALETTE, toCss } from '../palette'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'DYESTOPIA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: toCss(PALETTE.ink),
      })
      .setOrigin(0.5)

    // A row of swatches, purely as a title flourish.
    const swatch = 48
    const gap = 12
    const totalWidth = DYES.length * swatch + (DYES.length - 1) * gap
    DYES.forEach((dye, i) => {
      const x = (GAME_WIDTH - totalWidth) / 2 + i * (swatch + gap) + swatch / 2
      const rect = this.add.rectangle(x, GAME_HEIGHT / 2 - 40, swatch, swatch, dye.value)
      this.tweens.add({
        targets: rect,
        y: rect.y - 10,
        duration: 700,
        delay: i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })

    const start = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, 'Spiel starten', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: toCss(PALETTE.accent),
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    start.on('pointerover', () => start.setScale(1.08))
    start.on('pointerout', () => start.setScale(1))
    start.on('pointerup', () => this.scene.start('Game'))

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Game'))
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Game'))

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Leertaste oder klicken', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: toCss(PALETTE.inkMuted),
      })
      .setOrigin(0.5)
  }
}
