import Phaser from 'phaser'

import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { SettingsScene } from './scenes/SettingsScene'

/**
 * The coordinate space scenes are written in. Unchanged by the HiDPI handling
 * below — scenes keep using these numbers directly.
 */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 720

/**
 * Device pixels per CSS pixel, capped.
 *
 * Phaser does no HiDPI handling of its own: `ScaleConfig` has no `resolution`
 * field (removed in 3.16, never restored in v4) and the runtime reads
 * `devicePixelRatio` only into an unused info field. So the canvas backing store
 * is exactly whatever `width`/`height` say, and on a 2x display every one of
 * those pixels gets smeared across four physical ones.
 *
 * The fix is to make the backing store bigger by DPR and zoom the camera by the
 * same factor, which cancels out in world space — see `BaseScene`. Capped at 3
 * because past that the fill-rate cost buys nothing anyone can see.
 */
export const DPR = Math.min(window.devicePixelRatio || 1, 3)

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#12101a',
  scale: {
    mode: Phaser.Scale.FIT,
    // #game already centres the canvas with flexbox. CENTER_BOTH would add a
    // margin of the same size on top, pushing the canvas half that margin off
    // centre — so centring stays in CSS and Phaser keeps its hands off.
    autoCenter: Phaser.Scale.NO_CENTER,
    // Real device pixels. Scenes never see these numbers; the camera zoom in
    // BaseScene maps them back to GAME_WIDTH x GAME_HEIGHT.
    width: GAME_WIDTH * DPR,
    height: GAME_HEIGHT * DPR,
  },
  scene: [BootScene, MenuScene, SettingsScene, GameScene],
}
