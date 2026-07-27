import Phaser from 'phaser'

import { DPR, GAME_HEIGHT, GAME_WIDTH } from '../config'

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
  }
}
