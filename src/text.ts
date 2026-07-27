import Phaser from 'phaser'

/**
 * Text rendered at native device resolution.
 *
 * Phaser rasterises Text into a texture at its `fontSize`, then draws that
 * texture into the canvas. `setResolution(n)` makes the texture n times bigger —
 * but per Phaser's own docs it "is useful only if you're scaling up this Text
 * object (or an ancestor) or zooming a Camera on it. Otherwise, any extra detail
 * in the Texture would just be lost during rendering."
 *
 * BaseScene zooms the camera by DPR, so that condition now holds: without this,
 * text would be drawn at DPR times its texture size and look worse than before.
 */

/** Past this the texture memory stops buying visible sharpness. */
const MAX_RESOLUTION = 4

/** Scenes that already have a resize listener attached. */
const tracked = new WeakSet<Phaser.Scene>()

/**
 * Total magnification from one texture pixel to one physical screen pixel:
 *
 *   texture px -> world px    camera zoom
 *   world px   -> CSS px      the Scale.FIT stretch
 *   CSS px     -> device px   devicePixelRatio
 */
function currentResolution(scene: Phaser.Scene): number {
  const dpr = window.devicePixelRatio || 1
  const zoom = scene.cameras.main.zoom

  // displayScale is game pixels per CSS pixel, so its inverse is the FIT
  // stretch. It is 0 until the Scale Manager has measured the canvas.
  const perCssPixel = scene.scale.displayScale.x
  const stretch = perCssPixel > 0 ? 1 / perCssPixel : 1

  return Phaser.Math.Clamp(Math.ceil(zoom * stretch * dpr), 1, MAX_RESOLUTION)
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
 * Drop-in replacement for `scene.add.text` that renders at native device
 * resolution and stays sharp across window resizes.
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
