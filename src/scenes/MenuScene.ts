import Phaser from 'phaser'

import type { ColorId } from '../colors'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { activeTheme } from '../settings'
import { addText } from '../text'
import { addButton, addSurface } from '../ui/components'
import { ink, resolveVisualProfile } from '../ui/visual-system'
import { BaseScene } from './BaseScene'

/** Title flourish: the primaries and their mixes, in wheel order. */
const SWATCH_COLORS: ColorId[] = ['red', 'orange', 'yellow', 'blue', 'green']

export class MenuScene extends BaseScene {
  constructor() {
    super('Menu')
  }

  create(): void {
    const visual = resolveVisualProfile()
    if (visual.treatment === 'spray-can') {
      this.createSprayCan()
      return
    }
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

  /** The reference composition all expressive skins will subsequently share. */
  private createSprayCan(): void {
    const visual = resolveVisualProfile()
    const contentWidth = Math.min(600, GAME_WIDTH - 48)
    const left = (GAME_WIDTH - contentWidth) / 2
    const titleX = left + 4
    const titleSize = `${Math.round(Math.min(72, Math.max(52, GAME_WIDTH * 0.16)))}px`

    addText(this, titleX, Math.max(34, GAME_HEIGHT * 0.06), 'COLOUR LAB · EST. NOW', {
      fontFamily: visual.type.family,
      fontSize: visual.type.label,
      fontStyle: 'bold',
      letterSpacing: 5,
      color: ink(visual.colors.secondaryInk),
    }).setName('lab-mark')

    addText(this, titleX, Math.max(82, GAME_HEIGHT * 0.13), 'DYES', {
      fontFamily: visual.type.family,
      fontSize: titleSize,
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    })
      .setName('title-dyes')
      .setShadow(-8, 8, ink(visual.colors.critical), 10, true, true)

    addText(this, titleX, Math.max(142, GAME_HEIGHT * 0.21), 'TOPIA', {
      fontFamily: visual.type.family,
      fontSize: titleSize,
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    })
      .setName('title-topia')
      .setShadow(-8, 8, ink(visual.colors.critical), 10, true, true)

    const swatchY = Math.max(235, GAME_HEIGHT * 0.34)

    const { values } = activeTheme()
    const swatchSize = Math.min(44, (contentWidth - 20) / 6)
    const gap = Math.min(11, swatchSize * 0.24)
    SWATCH_COLORS.forEach((id, index) => {
      this.add
        .rectangle(
          titleX + swatchSize / 2 + index * (swatchSize + gap),
          swatchY,
          swatchSize,
          swatchSize,
          values[id],
        )
        .setAngle([-4, 2, -1, 3, -2][index])
        .setName('title-swatch')
    })

    // Retained as a semantic layout group for tests and future accessibility
    // metadata; Spray Can deliberately draws no enclosing rounded panel.
    this.add
      .graphics()
      .setName('menu-controls')
      .setData('surfaceSize', { width: contentWidth, height: 136 })

    const playY = GAME_HEIGHT - 205
    const settingsY = GAME_HEIGHT - 132
    addButton(
      this,
      GAME_WIDTH / 2,
      playY,
      contentWidth,
      'PLAY',
      () => this.fadeTo('StageSelect'),
      { kind: 'primary', name: 'button-play', height: 62, fontSize: '26px' },
    )
    addButton(
      this,
      GAME_WIDTH / 2,
      settingsY,
      contentWidth,
      'SETTINGS',
      () => this.fadeTo('Settings'),
      { kind: 'quiet', name: 'button-settings', height: 58, fontSize: '21px' },
    )

    const noteLabel = this.add
      .container(left + 8, GAME_HEIGHT - 54)
      .setName('start-label')
      .setAngle(-1.5)
    const note = addText(this, 14, 0, 'TAP ANYWHERE TO START', {
      fontFamily: visual.type.family,
      fontSize: visual.type.small,
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(0x292621),
    })
      .setOrigin(0, 0.5)
    const paperWidth = note.width + 28
    const paperHeight = note.height + 16
    const plate = this.add.graphics()
    plate.fillStyle(0xe8e4d9, 1)
    plate.fillPoints([
      new Phaser.Math.Vector2(3, -paperHeight / 2),
      new Phaser.Math.Vector2(paperWidth, -paperHeight / 2 + 1),
      new Phaser.Math.Vector2(paperWidth - 2, paperHeight / 2),
      new Phaser.Math.Vector2(0, paperHeight / 2 - 1),
    ], true)
    noteLabel.add([plate, note])

    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('StageSelect'))
    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('StageSelect'))
  }
}
