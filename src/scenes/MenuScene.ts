import type { ColorId } from '../colors'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { activeTheme } from '../settings'
import { addText } from '../text'
import { addButton, addSurface } from '../ui/components'
import { ink, resolveVisualProfile } from '../ui/visual-system'
import { BaseScene } from './BaseScene'

/** Title flourish: the primaries and their mixes, in wheel order. */
const SWATCH_COLORS: ColorId[] = ['red', 'orange', 'yellow', 'blue', 'green', 'purple']

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
      () => this.fadeTo('StageSelect', { page: 'modes' }), { kind: 'primary', name: 'button-play' },
    )
    addButton(
      this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150, controlsWidth - 32, 'Settings',
      () => this.fadeTo('Settings'), { kind: 'quiet', name: 'button-settings' },
    )

    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('StageSelect', { page: 'modes' }))
    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('StageSelect', { page: 'modes' }))

    addText(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Press space or click', {
      fontFamily: visual.type.family,
      fontSize: visual.type.small,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(0.5)
  }

  /** The reference composition all expressive skins will subsequently share. */
  private createSprayCan(): void {
    const visual = resolveVisualProfile()
    const contentWidth = GAME_WIDTH * 0.83
    const left = (GAME_WIDTH - contentWidth) / 2
    const compositionX = GAME_WIDTH * 0.512
    const cardTop = GAME_HEIGHT * 0.235
    const cardHeight = GAME_HEIGHT * 0.35
    const cardCenterY = cardTop + cardHeight / 2
    const titleX = left + contentWidth * 0.09
    const titleLocalX = titleX - compositionX
    const titleSize = `${Math.round(contentWidth * 0.19)}px`
    const posterFont = '"Arial Black", Impact, sans-serif'

    this.addMenuColorSheets()

    const card = this.add.container(compositionX, cardCenterY).setName('title-card').setAngle(-0.5)
    const shadow = this.add.rectangle(8, 9, contentWidth, cardHeight, 0x000000, 0.7)
      .setName('title-shadow')
    const paper = this.add.rectangle(0, 0, contentWidth, cardHeight, 0xeee9df)
      .setStrokeStyle(3, 0x191511)
      .setName('title-paper')
    card.add([shadow, paper])

    const dyes = addText(this, titleLocalX, -cardHeight / 2 + cardHeight * 0.095, 'DYES', {
      fontFamily: posterFont,
      fontSize: titleSize,
      fontStyle: 'bold',
      color: ink(0x15110e),
    })
      .setName('title-dyes')
    card.add(dyes)

    const topia = addText(this, titleLocalX, -cardHeight / 2 + cardHeight * 0.325, 'TOPIA', {
      fontFamily: posterFont,
      fontSize: titleSize,
      fontStyle: 'bold',
      color: ink(0x15110e),
    })
      .setName('title-topia')
    card.add(topia)

    const { values } = activeTheme()
    const swatchSize = Math.min(66, (contentWidth * 0.85) / 6.55)
    const gap = (contentWidth * 0.85 - swatchSize * 6) / 5
    const swatchY = -cardHeight / 2 + cardHeight * 0.72
    SWATCH_COLORS.forEach((id, index) => {
      const swatch = this.add
        .rectangle(
          titleLocalX + swatchSize / 2 + index * (swatchSize + gap),
          swatchY,
          swatchSize,
          cardHeight * 0.13,
          values[id],
        )
        .setName('title-swatch')
      card.add(swatch)
    })

    const ruleY = -cardHeight / 2 + cardHeight * 0.82
    const rule = this.add.rectangle(0, ruleY, contentWidth * 0.84, 3, 0x191511).setName('title-rule')
    const tagline = addText(this, titleLocalX, -cardHeight / 2 + cardHeight * 0.9, 'SWAP · MIX · CHAIN', {
      fontFamily: visual.type.family,
      fontSize: `${Math.round(Math.max(13, Math.min(20, contentWidth * 0.035)))}px`,
      fontStyle: 'bold',
      letterSpacing: Math.max(3, Math.round(contentWidth * 0.008)),
      color: ink(0x191511),
    }).setName('title-tagline').setOrigin(0, 0.5)
    card.add([rule, tagline])

    // Retained as a semantic layout group for tests and future accessibility
    // metadata; Spray Can deliberately draws no enclosing rounded panel.
    this.add
      .graphics()
      .setName('menu-controls')
      .setData('surfaceSize', { width: contentWidth, height: 136 })

    const playY = GAME_HEIGHT * 0.67
    const settingsY = GAME_HEIGHT * 0.735
    const playWidth = GAME_WIDTH * 0.48
    addButton(
      this,
      compositionX,
      playY,
      playWidth,
      'PLAY',
      () => this.fadeTo('StageSelect', { page: 'modes' }),
      {
        kind: 'primary',
        name: 'button-play',
        height: GAME_HEIGHT * 0.068,
        fontSize: `${Math.round(GAME_WIDTH * 0.047)}px`,
        fontFamily: posterFont,
      },
    )
    addButton(
      this,
      compositionX,
      settingsY,
      GAME_WIDTH * 0.34,
      'SETTINGS',
      () => this.fadeTo('Settings'),
      {
        kind: 'quiet',
        name: 'button-settings',
        height: GAME_HEIGHT * 0.045,
        fontSize: `${Math.round(GAME_WIDTH * 0.031)}px`,
        fontFamily: posterFont,
        letterSpacing: 3,
      },
    )

    this.input.keyboard?.once('keydown-SPACE', () => this.fadeTo('StageSelect', { page: 'modes' }))
    this.input.keyboard?.once('keydown-ENTER', () => this.fadeTo('StageSelect', { page: 'modes' }))
  }

  private addMenuColorSheets(): void {
    const sheets: Array<{ x: number; y: number; width: number; height: number; color: number; angle: number }> = [
      { x: GAME_WIDTH * 0.04, y: GAME_HEIGHT * 0.25, width: GAME_WIDTH * 0.36, height: GAME_HEIGHT * 0.25, color: 0x3d557c, angle: 7 },
      { x: GAME_WIDTH * 0.8, y: GAME_HEIGHT * 0.11, width: GAME_WIDTH * 0.45, height: GAME_HEIGHT * 0.24, color: 0x89362e, angle: -8 },
      { x: GAME_WIDTH * 0.06, y: GAME_HEIGHT * 0.72, width: GAME_WIDTH * 0.38, height: GAME_HEIGHT * 0.25, color: 0x573c6d, angle: -11 },
      { x: GAME_WIDTH * 0.92, y: GAME_HEIGHT * 0.6, width: GAME_WIDTH * 0.34, height: GAME_HEIGHT * 0.23, color: 0x315f3c, angle: 9 },
    ]
    for (const sheet of sheets) {
      this.add.rectangle(sheet.x + 7, sheet.y + 9, sheet.width, sheet.height, 0x000000, 0.72).setAngle(sheet.angle)
      this.add.rectangle(sheet.x, sheet.y, sheet.width, sheet.height, sheet.color)
        .setAngle(sheet.angle)
        .setName('menu-color-sheet')
    }
  }
}
