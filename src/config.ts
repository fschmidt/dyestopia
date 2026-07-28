import Phaser from 'phaser'

import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { SettingsScene } from './scenes/SettingsScene'
import { StageSelectScene } from './scenes/StageSelectScene'

/**
 * The coordinate space scenes are written in. Unchanged by the HiDPI handling
 * below — scenes keep using these numbers directly.
 *
 * On landscape screens (desktop, tests) this is the classic fixed 960×720.
 * On portrait screens — phones, where the fixed landscape world would shrink
 * to a strip — the world adopts the viewport's own CSS-pixel size instead, so
 * one world unit is one CSS pixel, the canvas fills the screen, and the board
 * can use the full width. Decided once at boot: scenes position off these
 * constants when they build, so a rotation mid-session letterboxes until the
 * next reload (the proper resize pass is M5).
 */
const logical = (() => {
  const w = window.innerWidth
  const h = window.innerHeight
  if (!w || !h || w >= h) return { width: 960, height: 720 }
  const width = Math.max(320, Math.min(w, 640))
  // Height follows the true aspect, so the canvas stays full-bleed; the clamp
  // only bites on absurdly tall windows.
  const height = Math.max(480, Math.min(Math.round((h * width) / w), 1400))
  return { width, height }
})()

export const GAME_WIDTH = logical.width
export const GAME_HEIGHT = logical.height

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
  scene: [BootScene, MenuScene, StageSelectScene, SettingsScene, GameScene],
}
