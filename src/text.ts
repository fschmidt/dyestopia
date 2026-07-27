import Phaser from 'phaser'

/**
 * STOPGAP — HiDPI text.
 *
 * Phaser does no device-pixel-ratio handling: `ScaleConfig` has no `resolution`
 * field (removed in 3.16, never restored in v4) and the runtime reads
 * `devicePixelRatio` exactly once, into an unused `OS.pixelRatio` info field.
 * So the canvas backing store is literally GAME_WIDTH × GAME_HEIGHT device
 * pixels and `Scale.FIT` stretches it up with CSS. Text, which Phaser rasterises
 * to a texture at its `fontSize`, goes soft as a result.
 *
 * `Text.setResolution()` supersamples that one texture, which fixes text without
 * touching layout or the scale mode. It does nothing for sprites or shapes — the
 * real fix is a DPR-aware canvas size or Scale.RESIZE, deliberately deferred.
 *
 * When that decision is made, this whole file goes away and `addText` reverts to
 * a plain `scene.add.text`.
 */

/** Beyond this the texture cost stops buying visible sharpness. */
const MAX_RESOLUTION = 4

/** Scenes that already have a resize listener attached. */
const tracked = new WeakSet<Phaser.Scene>()

/**
 * How far the canvas is being stretched on screen right now, in real device
 * pixels — i.e. how much supersampling text needs to come out sharp.
 */
function currentResolution(scene: Phaser.Scene): number {
  const dpr = window.devicePixelRatio || 1

  // displayScale is game pixels per CSS pixel, so its inverse is the FIT stretch.
  // It is 0 until the Scale Manager has measured the canvas; fall back to DPR.
  const perCssPixel = scene.scale.displayScale.x
  const stretch = perCssPixel > 0 ? 1 / perCssPixel : 1

  return Phaser.Math.Clamp(Math.ceil(dpr * stretch), 1, MAX_RESOLUTION)
}

/** Re-supersample every Text in the scene after the canvas changes size. */
function trackResizes(scene: Phaser.Scene): void {
  if (tracked.has(scene)) return
  tracked.add(scene)

  const apply = (): void => {
    const resolution = currentResolution(scene)
    for (const child of scene.children.list) {
      if (child instanceof Phaser.GameObjects.Text) {
        child.setResolution(resolution)
      }
    }
  }

  scene.scale.on('resize', apply)
  scene.events.once('shutdown', () => {
    scene.scale.off('resize', apply)
    tracked.delete(scene)
  })
}

/**
 * Drop-in replacement for `scene.add.text` that stays crisp on HiDPI displays
 * and across window resizes.
 */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, content, style)
  text.setResolution(currentResolution(scene))
  trackResizes(scene)
  return text
}
