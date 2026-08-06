import type Phaser from 'phaser'

import { flags } from './flags'
import { progressState, resetProgress, unlockedCount, type ProgressState } from './progress'
import { plantSeed } from './rng'
import type { BoardReport } from './scenes/GameScene'
import { sfxLog } from './sfx'
import { getSettings, updateSettings, type Settings } from './settings'

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
  /** Phaser's object type, e.g. `Container` or `Text`. */
  type: string
  /** The object's `name`, where one was set — `'tile'` for playable tiles. */
  name: string
}

export interface DyestopiaDebug {
  game: Phaser.Game
  /** Keys of every scene currently running. */
  activeScenes(): string[]
  isActive(key: string): boolean
  /** Every Text object's content in a scene, containers included, in creation order. */
  texts(key: string): string[]
  /** World positions of every interactive object in a scene, containers included. */
  hitTargets(key: string): HitTarget[]
  /** Viewport coordinates — what `page.mouse` wants — for a world point. */
  worldToViewport(key: string, x: number, y: number): Point
  /**
   * Stop every running scene and start one. `data` goes to the scene's
   * `create` — `goTo('Game', { stage: 3 })` starts an authored stage, and
   * `{ stage: 0, override: { moves: 1 } }` bends its rules (see
   * GameStartData); no data on 'Game' deals the dev board.
   */
  goTo(key: string, data?: object): void
  /** The player's current shape, colour theme, background and visual style. */
  settings(): Settings
  /**
   * Change a player setting. Scenes read visual settings when they build, so
   * those take effect on the next `goTo` — which is also what makes this useful
   * for screenshotting one scene across every combination.
   */
  setSettings(patch: Partial<Settings>): Settings
  /**
   * Pause tweens and park every animated sprite on `frame`, so two runs of the
   * same scene produce byte-identical screenshots. Tweens can't be rewound, so
   * call this before anything has been clicked if you want a golden image.
   */
  freeze(frame?: number): void
  /**
   * Seed the RNG for the *next* board build, then `goTo('Game')`: the same
   * seed deals the same board, which is what lets a test assert cell contents.
   * One-shot — boards after the seeded one are random again.
   */
  seedRng(seed: number): void
  /** Cells, colours, score and stage state of the running Game scene. */
  board(): BoardReport
  /**
   * Names of the sounds played this page load, oldest first (capped). Logged
   * before the audio stack is touched, so it works in headless browsers with
   * no audio output — which is what makes SFX testable at all.
   */
  sfxLog(): string[]
  /** How many stages are unlocked, and the lever to wind that back. */
  progress(): number
  progressState(): ProgressState
  resetProgress(): void
  /**
   * How many scenes have started this page load.
   *
   * `goTo` stops every scene and starts one, and Phaser processes both in the
   * same pass — so a driver waiting for `isActive('Game')` right after
   * `goTo('Game')` can be satisfied by the scene that was already running, and
   * go on to read the previous round. Comparing this across the call makes the
   * transition observable instead of assumed.
   */
  generation(): number
  /**
   * Toggle the combo-mixing prototype (roadmap M3): after a legal mix, the
   * result colour absorbs adjacent groups of its own ingredients. Pure
   * effect — legality is the target-anchored rule either way. Takes effect
   * on the next drop — mid-round is fine. Also on via `?combo` in the URL,
   * for phones. Returns the current state.
   */
  combo(on?: boolean): boolean
}

declare global {
  interface Window {
    dyestopia?: DyestopiaDebug
  }
}

// Bumped by BaseScene on every scene start — see `generation` above.
let sceneGeneration = 0

export function countSceneStart(): void {
  sceneGeneration++
}

/** GameObject with a position — the base class doesn't declare one. */
type Positioned = Phaser.GameObjects.GameObject & Point

/** Depth-first walk of a display list — sprites that matter live in Containers. */
function flatten(list: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] {
  return list.flatMap((child) => {
    const children = (child as Phaser.GameObjects.Container).list
    return Array.isArray(children) ? [child, ...flatten(children)] : [child]
  })
}

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

    generation: () => sceneGeneration,

    texts: (key) =>
      // Flattened for the same reason as hitTargets: the end-of-round overlay
      // keeps its texts inside a container.
      flatten(requireScene(game, key).children.list)
        .filter((child) => child.type === 'Text')
        .map((child) => (child as Phaser.GameObjects.Text).text),

    hitTargets: (key) =>
      // Flattened, because interactive objects can live inside containers (the
      // end-of-round overlay buttons do) — and those need their coordinates
      // through the parent transform, not their container-relative x/y.
      flatten(requireScene(game, key).children.list)
        .filter((child) => child.input?.enabled === true)
        .map((child) => {
          const obj = child as Positioned & {
            getWorldTransformMatrix?: () => { tx: number; ty: number }
          }
          const world = obj.getWorldTransformMatrix?.()
          return { type: child.type, name: child.name, x: world?.tx ?? obj.x, y: world?.ty ?? obj.y }
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

    goTo: (key, data) => {
      for (const scene of game.scene.getScenes(true)) {
        game.scene.stop(scene.scene.key)
      }
      game.scene.start(key, data)
    },

    settings: () => getSettings(),

    setSettings: (patch) => updateSettings(patch),

    seedRng: (seed) => plantSeed(seed),

    progress: () => unlockedCount(),
    progressState: () => progressState(),

    sfxLog: () => sfxLog(),

    resetProgress: () => resetProgress(),

    combo: (on) => {
      if (on !== undefined) flags.combo = on
      return flags.combo
    },

    board: () => {
      const scene = requireScene(game, 'Game') as unknown as { boardState?: () => BoardReport }
      if (!scene.boardState) throw new Error('The Game scene has no board to report')
      return scene.boardState()
    },

    freeze: (frame = 0) => {
      for (const scene of game.scene.getScenes(true)) {
        scene.tweens.pauseAll()
        for (const child of flatten(scene.children.list)) {
          const sprite = child as Phaser.GameObjects.Sprite
          if (!sprite.anims) continue
          sprite.anims.pause()
          sprite.setFrame(frame)
        }
      }
    },
  }

  window.dyestopia = api
}
