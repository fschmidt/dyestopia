import type { ColorId } from '../colors'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { PALETTE, toCss } from '../palette'
import { activeShape, activeTheme, getSettings, updateSettings } from '../settings'
import { playSfx } from '../sfx'
import { addText } from '../text'
import { THEMES, themedDye } from '../themes'
import { TILE_SIZE } from '../tiles/bake'
import { SHAPES } from '../tiles/shapes'
import { Tile } from '../tiles/Tile'
import { BaseScene } from './BaseScene'

const ROW_Y = { shape: 170, theme: 310, sound: 450 }
const PREVIEW_Y = 580

/** A representative slice of the wheel: the primaries and their mixes. */
const PREVIEW_COLORS: ColorId[] = ['red', 'yellow', 'blue', 'orange', 'green', 'purple']

/**
 * Shape and theme are picked independently, because they are independent in the
 * renderer: artwork is baked white and coloured with a tint, so every
 * combination already works without rebaking anything.
 *
 * The preview underneath is live — the same `Tile` class the board uses, so
 * what's on screen here is what the game will look like, animation included.
 */
export class SettingsScene extends BaseScene {
  private preview: Tile[] = []

  constructor() {
    super('Settings')
  }

  create(): void {
    addText(this, GAME_WIDTH / 2, 90, 'Settings', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: toCss(PALETTE.ink),
    }).setOrigin(0.5)

    this.buildRow(
      'Shape',
      ROW_Y.shape,
      SHAPES.map((shape) => ({ id: shape.id, label: shape.label, blurb: shape.blurb })),
      () => activeShape().id,
      (id) => updateSettings({ shape: id }),
    )

    this.buildRow(
      'Colours',
      ROW_Y.theme,
      THEMES.map((theme) => ({ id: theme.id, label: theme.label, blurb: theme.blurb })),
      () => activeTheme().id,
      (id) => updateSettings({ theme: id }),
    )

    this.buildRow(
      'Sound',
      ROW_Y.sound,
      [
        { id: 'on', label: 'On', blurb: 'Plops, chimes and the odd fanfare.' },
        { id: 'off', label: 'Off', blurb: 'The game keeps it to itself.' },
      ],
      () => (getSettings().sound ? 'on' : 'off'),
      (id) => {
        updateSettings({ sound: id === 'on' })
        // Turning it on answers immediately — and the click that got us here
        // is the user gesture that unlocks the audio context.
        if (id === 'on') playSfx('merge')
      },
    )

    this.buildPreview()

    const back = addText(this, GAME_WIDTH / 2, GAME_HEIGHT - 56, 'Back', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      color: toCss(PALETTE.accent),
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    back.on('pointerover', () => back.setScale(1.08))
    back.on('pointerout', () => back.setScale(1))
    back.on('pointerup', () => this.scene.start('Menu'))

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'))
  }

  /** Left edge of the rows — hugs the screen when the world is phone-narrow. */
  private marginX(): number {
    return Math.min(120, Math.round(GAME_WIDTH * 0.08))
  }

  private buildRow(
    title: string,
    y: number,
    options: { id: string; label: string; blurb: string }[],
    selected: () => string,
    choose: (id: string) => void,
  ): void {
    addText(this, this.marginX(), y - 44, title.toUpperCase(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: toCss(PALETTE.inkMuted),
    })

    const labels: { id: string; text: Phaser.GameObjects.Text }[] = []

    const repaint = (): void => {
      for (const { id, text } of labels) {
        const active = id === selected()
        text.setColor(toCss(active ? PALETTE.accent : PALETTE.inkMuted))
      }
      const current = options.find((option) => option.id === selected())
      blurb.setText(current?.blurb ?? '')
    }

    let x = this.marginX()
    for (const option of options) {
      const text = addText(this, x, y, option.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: toCss(PALETTE.inkMuted),
      })
        .setName(`option-${option.id}`)
        .setInteractive({ useHandCursor: true })

      text.on('pointerup', () => {
        choose(option.id)
        repaint()
        this.buildPreview()
      })

      labels.push({ id: option.id, text })
      x += text.width + 40
    }

    const blurb = addText(this, this.marginX(), y + 42, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: toCss(PALETTE.inkMuted),
    })

    repaint()
  }

  /** Rebuilt from scratch on every change — a handful of sprites. */
  private buildPreview(): void {
    for (const tile of this.preview) tile.destroy()
    this.preview = []

    const shape = activeShape()
    const theme = activeTheme()
    // Full-size tiles when the row fits; scaled to the width when it doesn't
    // (portrait phones) — same size parameter the board uses.
    const full = PREVIEW_COLORS.length * TILE_SIZE + (PREVIEW_COLORS.length - 1) * shape.gap
    const scale = Math.min(1, (GAME_WIDTH - 32) / full)
    const originX = (GAME_WIDTH - full * scale) / 2

    PREVIEW_COLORS.forEach((id, i) => {
      const x = originX + (i * (TILE_SIZE + shape.gap) + TILE_SIZE / 2) * scale
      this.preview.push(
        new Tile(this, x, PREVIEW_Y, themedDye(theme, id), shape, i, TILE_SIZE * scale),
      )
    })
  }
}
