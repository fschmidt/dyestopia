import type Phaser from 'phaser'

/**
 * A handle on the running game, for browser automation and console poking.
 *
 * Everything the game draws lives inside a canvas, so none of it is reachable
 * from the DOM — a driver can't query a swatch or read the score. This exposes
 * the game on `window` along with the few conversions a driver needs. The
 * important one is `worldToViewport`: it turns scene coordinates into viewport
 * coordinates so a click can be sent as a real mouse event and go through
 * Phaser's own hit-testing, rather than being faked by calling a handler.
 *
 * This ships in production deliberately. It's a public game with no secrets,
 * and a console handle on the live site is worth more than hiding it.
 */

export interface Point {
  x: number
  y: number
}

export interface HitTarget extends Point {
  /** Phaser's object type, e.g. `Rectangle` or `Text`. */
  type: string
}

export interface DyestopiaDebug {
  game: Phaser.Game
  /** Keys of every scene currently running. */
  activeScenes(): string[]
  isActive(key: string): boolean
  /** Every Text object's content in a scene, in creation order. */
  texts(key: string): string[]
  /** World-space centres of every interactive object in a scene. */
  hitTargets(key: string): HitTarget[]
  /** Viewport coordinates — what `page.mouse` wants — for a world point. */
  worldToViewport(key: string, x: number, y: number): Point
  /** Stop every running scene and start one. */
  goTo(key: string): void
  /** Pause tweens so a screenshot doesn't catch them mid-flight. */
  freeze(): void
}

declare global {
  interface Window {
    dyestopia?: DyestopiaDebug
  }
}

/** GameObject with a position — the base class doesn't declare one. */
type Positioned = Phaser.GameObjects.GameObject & Point

function requireScene(game: Phaser.Game, key: string): Phaser.Scene {
  const scene = game.scene.getScene(key)
  if (!scene) {
    const running = game.scene
      .getScenes(true)
      .map((s) => s.scene.key)
      .join(', ')
    throw new Error(`No scene "${key}". Running: ${running || 'none'}`)
  }
  return scene
}

export function exposeDebugApi(game: Phaser.Game): void {
  const api: DyestopiaDebug = {
    game,

    activeScenes: () => game.scene.getScenes(true).map((scene) => scene.scene.key),

    isActive: (key) => game.scene.isActive(key),

    texts: (key) =>
      requireScene(game, key)
        .children.list.filter((child) => child.type === 'Text')
        .map((child) => (child as Phaser.GameObjects.Text).text),

    hitTargets: (key) =>
      requireScene(game, key)
        .children.list.filter((child) => child.input?.enabled === true)
        .map((child) => {
          const { x, y } = child as Positioned
          return { type: child.type, x, y }
        }),

    worldToViewport: (key, x, y) => {
      const camera = requireScene(game, key).cameras.main

      // Inverse of Camera.preRender: the visible world rect is `width / zoom`
      // wide, centred on `scroll + width / 2`. Computed rather than read off
      // camera.worldView so this works before the first frame is drawn.
      const left = camera.scrollX + (camera.width - camera.width / camera.zoomX) * 0.5
      const top = camera.scrollY + (camera.height - camera.height / camera.zoomY) * 0.5
      const canvasX = (x - left) * camera.zoomX
      const canvasY = (y - top) * camera.zoomY

      // The backing store (canvas.width, in game pixels) is displayed at
      // whatever CSS size Scale.FIT settled on, so rescale and offset by where
      // the element actually sits.
      const rect = game.canvas.getBoundingClientRect()
      return {
        x: rect.left + canvasX * (rect.width / game.canvas.width),
        y: rect.top + canvasY * (rect.height / game.canvas.height),
      }
    },

    goTo: (key) => {
      for (const scene of game.scene.getScenes(true)) {
        game.scene.stop(scene.scene.key)
      }
      game.scene.start(key)
    },

    freeze: () => {
      for (const scene of game.scene.getScenes(true)) {
        scene.tweens.pauseAll()
      }
    },
  }

  window.dyestopia = api
}
