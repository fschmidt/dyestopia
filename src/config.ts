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
 * can use the full width.
 *
 * `let`, not `const`: a rotation re-measures the world (see `watchViewport`),
 * and importers see the new numbers through the live module bindings. Scenes
 * still read them only when they build — the relayout is a scene restart, not
 * anything reactive.
 */
function measure(): { width: number; height: number } {
  const w = window.innerWidth
  const h = window.innerHeight
  if (!w || !h || w >= h) return { width: 960, height: 720 }
  const width = Math.max(320, Math.min(w, 640))
  // Height follows the true aspect, so the canvas stays full-bleed; the clamp
  // only bites on absurdly tall windows.
  const height = Math.max(480, Math.min(Math.round((h * width) / w), 1400))
  return { width, height }
}

const logical = measure()

export let GAME_WIDTH = logical.width
export let GAME_HEIGHT = logical.height

/**
 * The M5 resize pass: when the viewport is reshaped (rotation, a resized
 * window), re-measure the world, resize the canvas and rebuild every running
 * scene, since scenes position everything off GAME_WIDTH/HEIGHT at build time.
 *
 * Only a changed *width* triggers it. On phones the height also moves every
 * time the URL bar breathes, and restarting a scene (which forfeits a running
 * round — see GameScene.relayout) over browser chrome would be absurd;
 * Scale.FIT absorbs pure height changes with a sliver of letterbox instead.
 * On desktop `measure()` returns the same fixed landscape world at any size,
 * so window-dragging never restarts anything either.
 */
export function watchViewport(game: Phaser.Game): void {
  let pending: ReturnType<typeof setTimeout> | undefined
  window.addEventListener('resize', () => {
    clearTimeout(pending)
    pending = setTimeout(() => {
      const next = measure()
      if (next.width === GAME_WIDTH) return
      GAME_WIDTH = next.width
      GAME_HEIGHT = next.height
      game.scale.setGameSize(GAME_WIDTH * DPR, GAME_HEIGHT * DPR)
      for (const scene of game.scene.getScenes(true)) {
        // Scenes carrying state that must survive a rebuild override relayout
        // (BaseScene's default is a bare restart).
        ;(scene as Phaser.Scene & { relayout?: () => void }).relayout?.()
      }
    }, 200)
  })
}

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
