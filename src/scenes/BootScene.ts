import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { addText } from '../text'
import { bakeTiles } from '../tiles/bake'
import { ink, resolveVisualProfile } from '../ui/visual-system'
import { BaseScene } from './BaseScene'

/**
 * Loads visual assets before handing off to the menu. Tile sheets remain
 * procedurally baked in `create`; authored artwork such as tools loads here.
 */
export class BootScene extends BaseScene {
  constructor() {
    super('Boot')
  }

  preload(): void {
    const visual = resolveVisualProfile()
    const barWidth = 320
    const barHeight = 8
    const x = (GAME_WIDTH - barWidth) / 2
    const y = GAME_HEIGHT / 2

    addText(this, GAME_WIDTH / 2, y - 40, 'Dyestopia', {
      fontFamily: visual.type.family,
      fontSize: '32px',
      color: ink(visual.colors.primaryInk),
    }).setOrigin(0.5)

    this.add.rectangle(x, y, barWidth, barHeight, visual.colors.secondaryInk, 0.25).setOrigin(0, 0.5)
    const fill = this.add.rectangle(x, y, 0, barHeight, visual.colors.accent).setOrigin(0, 0.5)

    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value
    })

    for (const background of BACKGROUNDS) {
      this.load.image(backgroundTexture(background.id), background.asset)
    }
    this.load.svg('tool-freeMove', '/tools/free-move-paper-cream.svg')
  }

  create(): void {
    // Cheap enough (single-digit milliseconds) to sit in the boot path rather
    // than behind the loading bar, but it must happen before any scene builds
    // tiles — hence here rather than in whichever scene needs them first.
    bakeTiles(this)
    this.scene.start('Menu')
  }
}
import { BACKGROUNDS, backgroundTexture } from '../backgrounds'
