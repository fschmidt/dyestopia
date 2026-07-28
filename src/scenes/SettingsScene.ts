import type { ColorId } from '../colors'
import { BACKGROUNDS } from '../backgrounds'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import {
  activeBackground,
  activeShape,
  activeTheme,
  getSettings,
  updateSettings,
} from '../settings'
import { playSfx } from '../sfx'
import { addText } from '../text'
import { THEMES, themedDye } from '../themes'
import { TILE_SIZE } from '../tiles/bake'
import { SHAPES } from '../tiles/shapes'
import { Tile } from '../tiles/Tile'
import { addButton, addSegmentedControl, addSurface, addSwitch } from '../ui/components'
import { ink, resolveVisualProfile, VISUAL_PROFILES } from '../ui/visual-system'
import { BaseScene } from './BaseScene'

const PREVIEW_COLORS: ColorId[] = ['red', 'yellow', 'blue', 'orange', 'green', 'purple']

export class SettingsScene extends BaseScene {
  private preview: Tile[] = []
  private previewY = 560
  private backgroundPage = 0

  constructor() {
    super('Settings')
  }

  create(): void {
    const visual = resolveVisualProfile()
    const width = Math.min(620, GAME_WIDTH - 28)
    const left = (GAME_WIDTH - width) / 2
    const compact = GAME_HEIGHT < 760
    const titleY = compact ? 42 : 50
    const rowStart = compact ? 128 : 125
    const rowGap = compact ? 86 : 96

    addText(this, GAME_WIDTH / 2, titleY, 'SETTINGS', {
      fontFamily: visual.type.family,
      fontSize: compact ? '32px' : '38px',
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(visual.colors.primaryInk),
    }).setOrigin(0.5)

    addSurface(this, GAME_WIDTH / 2, rowStart + rowGap * 1.5, width, rowGap * 4.1, 'settings-panel')
    this.addLabel(left + 18, rowStart - 42, 'TILE SHAPE')
    addSegmentedControl(
      this,
      GAME_WIDTH / 2,
      rowStart,
      width - 36,
      SHAPES.map(({ id, label }) => ({ id, label })),
      () => activeShape().id,
      (id) => {
        updateSettings({ shape: id })
        this.buildPreview()
      },
    )

    this.addLabel(left + 18, rowStart + rowGap - 42, 'COLOUR RECIPE')
    addSegmentedControl(
      this,
      GAME_WIDTH / 2,
      rowStart + rowGap,
      width - 36,
      THEMES.map(({ id, label }) => ({ id, label })),
      () => activeTheme().id,
      (id) => {
        updateSettings({ theme: id })
        this.buildPreview()
      },
    )

    this.addBackgroundPager(left + 18, rowStart + rowGap * 2)

    const utilityY = rowStart + rowGap * 3 + 8
    const styleWidth = width - 132
    this.addLabel(left + 18, rowStart + rowGap * 3 - 24, 'VISUAL STYLE')
    this.addLabel(left + width - 94, rowStart + rowGap * 3 - 24, 'SOUND')
    addSegmentedControl(
      this,
      left + 18 + styleWidth / 2,
      utilityY,
      styleWidth,
      VISUAL_PROFILES.map(({ id, label }) => ({ id, label })),
      () => getSettings().visualStyle,
      (visualStyle) => {
        updateSettings({ visualStyle })
        // Profiles are read as objects are built. Rebuilding this presentation
        // scene applies the new skin without changing any of its coordinates.
        this.scene.restart()
      },
    )
    addSwitch(
      this,
      left + width - 54,
      utilityY,
      () => getSettings().sound,
      (sound) => {
        updateSettings({ sound })
        if (sound) playSfx('merge')
      },
    )

    this.previewY = Math.min(GAME_HEIGHT - 124, rowStart + rowGap * 4 + 54)
    addSurface(this, GAME_WIDTH / 2, this.previewY, width, 118, 'preview-shelf', true)
    this.buildPreview()

    addButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 34,
      Math.min(220, width),
      '‹  Menu',
      () => this.fadeTo('Menu'),
      { kind: 'quiet', name: 'button-back' },
    )
    this.input.keyboard?.once('keydown-ESC', () => this.fadeTo('Menu'))
  }

  private addLabel(x: number, y: number, label: string): void {
    const visual = resolveVisualProfile()
    addText(this, x, y, label, {
      fontFamily: visual.type.family,
      fontSize: visual.type.label,
      fontStyle: 'bold',
      letterSpacing: 1,
      color: ink(visual.colors.secondaryInk),
    }).setDepth(5)
  }

  private addBackgroundPager(x: number, y: number): void {
    const visual = resolveVisualProfile()
    const width = Math.min(620, GAME_WIDTH - 28)
    const rowY = y + 12
    this.backgroundPage = Math.max(
      0,
      BACKGROUNDS.findIndex((background) => background.id === activeBackground().id),
    )
    this.addLabel(x, y - 34, 'BACKGROUND')

    const thumbnail = this.add
      .image(x + 54, rowY, `background-${activeBackground().id}`)
      .setDisplaySize(96, 56)
      .setName('background-thumbnail')
    const title = addText(this, x + 118, rowY - 12, '', {
      fontFamily: visual.type.family,
      fontSize: visual.type.body,
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    })
    const count = addText(this, x + 118, rowY + 14, '', {
      fontFamily: visual.type.family,
      fontSize: visual.type.small,
      color: ink(visual.colors.secondaryInk),
    })
    const repaint = (): void => {
      const background = BACKGROUNDS[this.backgroundPage]
      thumbnail.setTexture(`background-${background.id}`)
      title.setText(background.label)
      count.setText(`${this.backgroundPage + 1} / ${BACKGROUNDS.length}`)
      updateSettings({ background: background.id })
      this.refreshBackground()
    }
    const step = (direction: number): void => {
      this.backgroundPage =
        (this.backgroundPage + direction + BACKGROUNDS.length) % BACKGROUNDS.length
      repaint()
    }
    addButton(this, x + width - 116, rowY, 48, '‹', () => step(-1), {
      kind: 'quiet',
      name: 'background-prev',
    })
    addButton(this, x + width - 54, rowY, 48, '›', () => step(1), {
      kind: 'quiet',
      name: 'background-next',
    })
    repaint()
  }

  private buildPreview(): void {
    for (const tile of this.preview) tile.destroy()
    this.preview = []
    const shape = activeShape()
    const theme = activeTheme()
    const full = PREVIEW_COLORS.length * TILE_SIZE + (PREVIEW_COLORS.length - 1) * shape.gap
    const scale = Math.min(0.56, (GAME_WIDTH - 48) / full)
    const originX = (GAME_WIDTH - full * scale) / 2
    PREVIEW_COLORS.forEach((id, i) => {
      const x = originX + (i * (TILE_SIZE + shape.gap) + TILE_SIZE / 2) * scale
      this.preview.push(
        new Tile(this, x, this.previewY, themedDye(theme, id), shape, i, TILE_SIZE * scale),
      )
    })
  }
}
