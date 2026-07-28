import Phaser from 'phaser'

import { backgroundTexture } from '../backgrounds'
import { DPR, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { activeBackground } from '../settings'
import { resolveVisualProfile } from '../ui/visual-system'

/**
 * Base for every scene. Reconciles the DPR-sized canvas (see `config.ts`) with
 * the GAME_WIDTH x GAME_HEIGHT coordinate space scenes are actually written in.
 *
 * The canvas is `GAME_WIDTH * DPR` wide, so zooming the camera by DPR and
 * centring it on the logical midpoint makes world coordinates 0..GAME_WIDTH map
 * exactly onto it. Net effect: scenes use plain 960x720 coordinates and get
 * native-resolution rendering for free.
 *
 * Subclasses that override `init` must call `super.init()`.
 */
export class BaseScene extends Phaser.Scene {
  init(): void {
    const camera = this.cameras.main
    camera.setZoom(DPR)
    camera.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    this.events.once(Phaser.Scenes.Events.CREATE, () => this.refreshBackground())
  }

  protected refreshBackground(): void {
    this.children.getByName('background')?.destroy()
    this.children.getByName('skin-atmosphere')?.destroy()
    const texture = backgroundTexture(activeBackground().id)
    if (!this.textures.exists(texture)) return

    const source = this.textures.get(texture).getSourceImage() as HTMLImageElement
    const scale = Math.max(GAME_WIDTH / source.width, GAME_HEIGHT / source.height)
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, texture)
      .setName('background')
      .setDepth(-1000)
      .setScale(scale)

    if (resolveVisualProfile().treatment === 'spray-can') {
      const atmosphere = this.sprayAtmosphereTexture()
      this.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, atmosphere)
        .setName('skin-atmosphere')
        .setDepth(-900)
    }
  }

  /** Responsive, resolution-independent spray-booth atmosphere. */
  private sprayAtmosphereTexture(): string {
    const key = `spray-atmosphere-${GAME_WIDTH}x${GAME_HEIGHT}`
    if (this.textures.exists(key)) return key

    const texture = this.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT)
    if (!texture) return '__WHITE'
    const context = texture.context
    const wash = context.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT)
    wash.addColorStop(0, 'rgba(20, 18, 12, .92)')
    wash.addColorStop(0.46, 'rgba(10, 12, 13, .94)')
    wash.addColorStop(1, 'rgba(24, 19, 14, .9)')
    context.fillStyle = wash
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    const bloom = (
      x: number,
      y: number,
      radius: number,
      color: [number, number, number],
      alpha: number,
    ): void => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(${color.join(',')},${alpha})`)
      gradient.addColorStop(1, `rgba(${color.join(',')},0)`)
      context.fillStyle = gradient
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    bloom(GAME_WIDTH * 0.18, GAME_HEIGHT * 0.16, GAME_WIDTH * 0.75, [255, 196, 42], 0.13)
    bloom(GAME_WIDTH * 0.78, GAME_HEIGHT * 0.72, GAME_WIDTH * 0.85, [228, 49, 116], 0.18)
    bloom(GAME_WIDTH * 0.08, GAME_HEIGHT * 0.95, GAME_WIDTH * 0.7, [52, 184, 211], 0.12)

    context.strokeStyle = 'rgba(255,255,255,.035)'
    context.lineWidth = 1
    for (let x = -GAME_HEIGHT; x < GAME_WIDTH; x += 13) {
      context.beginPath()
      context.moveTo(x, GAME_HEIGHT)
      context.lineTo(x + GAME_HEIGHT * 0.42, 0)
      context.stroke()
    }
    texture.refresh()
    return key
  }

  /**
   * The world was re-measured — a rotation, mostly (see `watchViewport` in
   * config.ts). Scenes position everything off GAME_WIDTH/HEIGHT when they
   * build, so rebuilding *is* the relayout; scenes with state worth carrying
   * across the rebuild override this and pass it through their start data.
   */
  relayout(): void {
    this.scene.restart()
  }

  /**
   * Leave for another scene behind a short fade to the page background — the
   * scene transition every navigation shares. Re-entry ignored while the fade
   * runs, so a double-tap can't start the target scene twice.
   */
  protected fadeTo(key: string, data?: object): void {
    const camera = this.cameras.main
    if (camera.fadeEffect.isRunning) return
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start(key, data),
    )
    camera.fadeOut(140, 0x12, 0x10, 0x1a)
  }
}
