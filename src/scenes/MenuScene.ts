import type { ColorId } from '../colors'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { activeTheme } from '../settings'
import { addText } from '../text'
import { addButton, addSurface } from '../ui/components'
import { ink, resolveVisualProfile } from '../ui/visual-system'
import { BaseScene } from './BaseScene'

/** Title flourish: the primaries and their mixes, in wheel order. */
const SWATCH_COLORS: ColorId[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

export class MenuScene extends BaseScene {
  constructor() {
    super('Menu')
  }

  create(): void {
    const visual = resolveVisualProfile()
    addText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'DYESTOPIA', {
      fontFamily: visual.type.family,
      fontSize: visual.type.display,
      fontStyle: 'bold',
      letterSpacing: 5,
      color: ink(visual.colors.primaryInk),
    }).setOrigin(0.5)

    // A row of swatches, purely as a title flourish.
    const { values } = activeTheme()
    const swatch = 48
    const gap = 12
    const totalWidth = SWATCH_COLORS.length * swatch + (SWATCH_COLORS.length - 1) * gap
    SWATCH_COLORS.forEach((id, i) => {
      const x = (GAME_WIDTH - totalWidth) / 2 + i * (swatch + gap) + swatch / 2
      const rect = this.add.rectangle(x, GAME_HEIGHT / 2 - 40, swatch, swatch, values[id])
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

    const controlsWidth = Math.min(360, GAME_WIDTH - 48)
    addSurface(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, controlsWidth, 150, 'menu-controls')
    addButton(
      this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, controlsWidth - 32, 'PLAY',
      () => this.fadeTo('StageSelect'), { kind: 'primary', name: 'button-play' },
    )
    addButton(
      this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150, controlsWidth - 32, 'Settings',
      () => this.fadeTo('Settings'), { kind: 'quiet', name: 'button-settings' },
    )

    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('StageSelect'))
    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('StageSelect'))

    addText(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Press space or click', {
      fontFamily: visual.type.family,
      fontSize: visual.type.small,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(0.5)
  }
}
