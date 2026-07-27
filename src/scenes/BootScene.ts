import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { PALETTE, toCss } from '../palette'

/**
 * Loads whatever the game needs before anything is shown, then hands off to the
 * menu. Right now there are no assets — the loading bar is here so adding them
 * later doesn't mean restructuring the boot flow.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload(): void {
    const barWidth = 320
    const barHeight = 8
    const x = (GAME_WIDTH - barWidth) / 2
    const y = GAME_HEIGHT / 2

    this.add
      .text(GAME_WIDTH / 2, y - 40, 'Dyestopia', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: toCss(PALETTE.ink),
      })
      .setOrigin(0.5)

    this.add.rectangle(x, y, barWidth, barHeight, PALETTE.inkMuted, 0.25).setOrigin(0, 0.5)
    const fill = this.add.rectangle(x, y, 0, barHeight, PALETTE.accent).setOrigin(0, 0.5)

    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value
    })

    // this.load.image('...', '...') — assets go here.
  }

  create(): void {
    this.scene.start('Menu')
  }
}
