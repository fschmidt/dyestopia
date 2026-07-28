import Phaser from 'phaser'

import { backgroundTexture } from '../backgrounds'
import { DPR, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { activeBackground } from '../settings'

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
    const texture = backgroundTexture(activeBackground().id)
    if (!this.textures.exists(texture)) return

    const source = this.textures.get(texture).getSourceImage() as HTMLImageElement
    const scale = Math.max(GAME_WIDTH / source.width, GAME_HEIGHT / source.height)
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, texture)
      .setName('background')
      .setDepth(-1000)
      .setScale(scale)
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
