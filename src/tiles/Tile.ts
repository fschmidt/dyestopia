import Phaser from 'phaser'

import type { Dye } from '../palette'
import { TILE_SIZE, cellSize, textureKeys } from './bake'
import type { Shape } from './shapes'

/**
 * One playable tile.
 *
 * Work is split by what each technique is actually good at. Anything
 * expressible as a transform — hover lift, press squish, and the drag, swap
 * and merge moves — is a tween or a static property: interruptible, resolution
 * independent, free on the GPU. Only what no transform can express comes from
 * the baked frames, which is why the blob needs 24 of them for its outline and
 * the mosaic uses its own for a glint crossing the glaze.
 *
 * The moves share one skeleton — pick up, travel, settle — and read their
 * numbers from `shape.motion`, so the shapes differ in feel without owning
 * code paths. The reasoning behind the numbers is in docs/tile-motion.md.
 *
 * The two sprites must stay on the same frame or the highlight drifts off the
 * silhouette, so only the base plays the animation and the gloss follows it.
 */

/** Push a colour toward white — the tint overshoot that stands in for a flash. */
function lighten(color: number, amount: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return (
    (Math.round(r + (255 - r) * amount) << 16) |
    (Math.round(g + (255 - g) * amount) << 8) |
    Math.round(b + (255 - b) * amount)
  )
}

/** Depths while tiles cross each other; resting tiles sit at 0. */
const DEPTH_PASSIVE = 5
const DEPTH_ACTIVE = 10

/** Drag velocity, in px per 60fps frame, that produces full stretch. */
const FULL_STRETCH_SPEED = 14

export class Tile extends Phaser.GameObjects.Container {
  private readonly shape: Shape
  /** Logical tile size on this board — hit area, and the drag flow's yardstick. */
  private readonly size: number
  private readonly base: Phaser.GameObjects.Sprite
  private readonly gloss: Phaser.GameObjects.Sprite

  private _dye: Dye
  /** Kept so tweens can return to it — jitter means it isn't always zero. */
  private restAngle: number
  /** Mid-move. Gates the hover lift, taps and re-drags so tweens don't fight. */
  private moving = false
  /** Following the pointer right now. */
  private held = false
  private readonly dragTarget = new Phaser.Math.Vector2()

  // The pick-up pair is tracked so `follow` doesn't write scale and angle
  // underneath it; the counters because `killTweensOf(this)` can't reach them
  // (their target is an internal counter object, not the tile).
  private liftTween?: Phaser.Tweens.Tween
  private straightenTween?: Phaser.Tweens.Tween
  private travelTween?: Phaser.Tweens.Tween
  private tintTween?: Phaser.Tweens.Tween

  // The flow deformation's spring state: how elongated the tile currently is
  // (0 round, 1 fully stretched), its velocity, and the world-space direction
  // of the elongation in radians.
  private flowAmount = 0
  private flowVel = 0
  private flowAngle = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dye: Dye,
    shape: Shape,
    index: number,
    size: number = TILE_SIZE,
  ) {
    super(scene, x, y)
    this._dye = dye
    this.shape = shape
    this.size = size
    this.name = 'tile'

    const keys = textureKeys(shape)
    // Boards size their tiles to the space a stage's mask leaves them, so the
    // baked artwork (drawn at TILE_SIZE) scales to match — pad and all.
    const cell = cellSize(shape) * (size / TILE_SIZE)

    this.base = scene.add
      .sprite(0, 0, keys.base)
      .setDisplaySize(cell, cell)
      .setTint(dye.value)

    this.gloss = scene.add.sprite(0, 0, keys.gloss).setDisplaySize(cell, cell)

    this.add([this.base, this.gloss])

    this.restAngle = this.jitterAngle(index)
    this.setAngle(this.restAngle)

    // Offsetting the start frame per tile keeps the board from breathing in
    // unison, which reads as a pulsing screen rather than as living tiles. A
    // prime stride spreads neighbours in both directions.
    this.base.play({ key: keys.idle, startFrame: (index * 7) % shape.frames })
    this.base.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        this.gloss.setFrame(frame.textureFrame)
      },
    )

    // Hit area is the tile, not the padded cell — the padding is shadow, and
    // clicks should not land on a neighbour's shadow.
    this.setSize(size, size)
    this.setInteractive({ useHandCursor: true })

    this.on('pointerover', () => {
      if (!this.moving) this.lift(true)
    })
    this.on('pointerout', () => {
      if (!this.moving) this.lift(false)
    })

    scene.add.existing(this)
  }

  get dye(): Dye {
    return this._dye
  }

  /** Mid-move — scenes should not tap or re-drag a tile that is. */
  get busy(): boolean {
    return this.moving
  }

  /** The jitter belongs to the cell, so a tile that moves cells re-reads it. */
  private jitterAngle(index: number): number {
    return this.shape.jitter ? this.shape.jitter[index % this.shape.jitter.length] : 0
  }

  private lift(on: boolean): void {
    this.scene.tweens.add({
      targets: this,
      scale: on ? 1.06 : 1,
      duration: 150,
      ease: 'Quad.easeOut',
    })
  }

  /** Squish and rebound, for a tile that was tapped. */
  squish(): void {
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { scale: 0.88, duration: 70, ease: 'Quad.easeOut' },
        { scale: 1, duration: 220, ease: 'Back.easeOut' },
      ],
    })
  }

  /** Spin once, for a correct answer. */
  celebrate(): void {
    this.scene.tweens.add({
      targets: this,
      angle: this.restAngle + 360,
      duration: 420,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.angle = this.restAngle
      },
    })
  }

  /** Shake, for a wrong answer. */
  reject(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 6,
      duration: 60,
      yoyo: true,
      repeat: 2,
    })
  }

  /** Lift off the board and start chasing the pointer. */
  pickUp(): void {
    const m = this.shape.motion
    this.beginMove(DEPTH_ACTIVE)
    this.held = true
    this.dragTarget.set(this.x, this.y)
    this.flowAmount = this.flowVel = this.flowAngle = 0

    this.base.anims.timeScale = m.agitation
    this.liftTween = this.scene.tweens.add({
      targets: this,
      scale: m.lift,
      duration: m.liftDuration,
      ease: 'Back.easeOut',
    })
    if (m.straighten) {
      this.straightenTween = this.scene.tweens.add({
        targets: this,
        angle: 0,
        duration: m.liftDuration,
        ease: 'Quad.easeOut',
      })
    }
  }

  setDragTarget(x: number, y: number): void {
    this.dragTarget.set(x, y)
  }

  /**
   * One frame of pointer chase, driven from the scene's `update` (containers
   * get no `preUpdate`). The lag against the pointer is what sells weight, and
   * the velocity it yields drives the shape's stretch and lean.
   */
  follow(deltaMs: number): void {
    if (!this.held || deltaMs <= 0) return
    const m = this.shape.motion

    // Frame-rate independent form of `pos += (target - pos) * lerp`.
    const frames = deltaMs / (1000 / 60)
    const alpha = 1 - Math.pow(1 - m.followLerp, frames)
    const vx = (this.dragTarget.x - this.x) * alpha
    const vy = (this.dragTarget.y - this.y) * alpha
    this.x += vx
    this.y += vy

    // Let the pick-up tweens finish before writing under them.
    if (this.liftTween?.isPlaying()) return

    if (m.flow) {
      this.flowDeform(frames)
      return
    }

    // Axis-aligned squash-and-stretch: stretch along the dominant velocity
    // axis, squash across it, easing back to round as the pointer slows.
    const nx = Math.min(1, Math.abs(vx / frames) / FULL_STRETCH_SPEED)
    const ny = Math.min(1, Math.abs(vy / frames) / FULL_STRETCH_SPEED)
    const targetX = m.lift * (1 + m.stretch * nx - m.stretch * 0.6 * ny)
    const targetY = m.lift * (1 + m.stretch * ny - m.stretch * 0.6 * nx)
    this.scaleX += (targetX - this.scaleX) * 0.25
    this.scaleY += (targetY - this.scaleY) * 0.25

    if (this.straightenTween?.isPlaying()) return
    const leanTarget = Phaser.Math.Clamp((vx / frames) * 0.9, -m.lean, m.lean)
    const baseAngle = m.straighten ? 0 : this.restAngle
    this.angle += (baseAngle + leanTarget - this.angle) * 0.2
  }

  /**
   * Thick-liquid deformation: the tile elongates toward the pointer, along
   * the actual pull direction rather than a screen axis.
   *
   * No transform can stretch a sprite along an arbitrary axis directly, but a
   * pair can: rotate the container to the pull direction and stretch it along
   * its own x, while the sprites inside counter-rotate so the artwork — and
   * with it the light — stays upright. The net transform is a directional
   * stretch, which shears the silhouette exactly the way slime pulls.
   *
   * The amount is driven by how far the pointer has run ahead (pull harder,
   * stretch further) through a damped spring, so it overshoots and wobbles
   * back to round when the pull stops — the jiggle that sells thick liquid.
   */
  private flowDeform(frames: number): void {
    const m = this.shape.motion
    const f = m.flow!

    const dx = this.dragTarget.x - this.x
    const dy = this.dragTarget.y - this.y
    const gap = Math.hypot(dx, dy)
    const pull = Math.min(1, gap / (this.size * f.range))

    this.flowVel += (pull - this.flowAmount) * f.stiffness * frames
    this.flowVel *= Math.pow(f.damping, frames)
    this.flowAmount = Math.max(-0.5, this.flowAmount + this.flowVel * frames)

    // The direction only follows a meaningful pull — at rest it holds, so the
    // dying wobble doesn't spin the elongation axis through noise.
    if (gap > 2) {
      this.flowAngle = Phaser.Math.Angle.RotateTo(this.flowAngle, Math.atan2(dy, dx), 0.25 * frames)
    }

    this.rotation = this.flowAngle
    this.base.rotation = this.gloss.rotation = -this.flowAngle
    const s = this.flowAmount
    this.setScale(m.lift * (1 + m.stretch * s), m.lift * (1 - m.stretch * 0.55 * s))
  }

  /**
   * Undo the flow wind-up on release. Container rotation and sprite
   * counter-rotation cancel, so snapping both to rest is invisible; the
   * elongation collapses to its average — slime let go of, snapping back.
   */
  private unwindFlow(): void {
    if (this.base.rotation === 0 && this.gloss.rotation === 0) return
    const even = (this.scaleX + this.scaleY) / 2
    this.rotation = Phaser.Math.DegToRad(this.restAngle)
    this.base.rotation = this.gloss.rotation = 0
    this.setScale(even)
    this.flowAmount = this.flowVel = this.flowAngle = 0
  }

  /** Travel to a cell centre and settle — the end of a drag, or a plain move. */
  drop(x: number, y: number, restIndex: number, onArrive?: () => void): void {
    this.beginMove(DEPTH_ACTIVE)
    this.restAngle = this.jitterAngle(restIndex)
    this.unwindFlow()
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.land()
        onArrive?.()
      },
    })
  }

  /**
   * Return home from a drop the rules refused, and say so: the drop settle is
   * followed by a head-shake, so "not allowed" reads differently from a drag
   * that simply missed its cell.
   */
  refuse(x: number, y: number, restIndex: number): void {
    this.drop(x, y, restIndex, () => this.reject())
  }

  /**
   * Fall under gravity. All falls share one constant acceleration — duration
   * grows with the square root of the distance — so tiles dropping down the
   * same column keep their spacing instead of overtaking mid-flight. Arrival
   * is the shared landing splat.
   */
  fallTo(y: number, restIndex: number, cells: number, delay: number, onArrive?: () => void): void {
    this.beginMove(DEPTH_PASSIVE)
    this.restAngle = this.jitterAngle(restIndex)
    this.unwindFlow()
    this.scene.tweens.add({
      targets: this,
      y,
      delay,
      duration: this.shape.motion.fall.unit * Math.sqrt(Math.max(1, cells)),
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.land()
        onArrive?.()
      },
    })
  }

  /**
   * Burst off the board — a matched tile being destroyed. Swell, thrash,
   * vanish, each by the shape's own physics: the blob pops like a bubble of
   * paint, the mosaic glints and cracks out of its grout. The tile destroys
   * itself when the burst is done.
   */
  clearOut(delay: number, onDone?: () => void): void {
    const m = this.shape.motion
    this.beginMove(DEPTH_PASSIVE)

    this.scene.tweens.chain({
      targets: this,
      tweens: [
        {
          scale: m.clear.swell,
          duration: m.clear.rise,
          delay,
          ease: 'Quad.easeOut',
          onStart: () => {
            // The burst starts now, not at the (possibly delayed) chain start.
            this.base.anims.timeScale = m.clear.agitation
            this.glint()
          },
        },
        {
          scale: 0.02,
          alpha: 0,
          angle: this.angle + m.clear.spin,
          duration: m.clear.vanish,
          ease: m.clear.vanishEase,
        },
      ],
      onComplete: () => {
        onDone?.()
        this.destroy()
      },
    })
  }

  /**
   * One half of a swap. The two roles bow to opposite sides of the straight
   * line (when the shape arcs at all) and the passive tile telegraphs with an
   * anticipation pull — the active one is already lifted from being dragged.
   */
  swapTo(
    x: number,
    y: number,
    restIndex: number,
    role: 'active' | 'passive',
    onArrive?: () => void,
  ): void {
    const m = this.shape.motion
    this.beginMove(role === 'active' ? DEPTH_ACTIVE : DEPTH_PASSIVE)
    this.restAngle = this.jitterAngle(restIndex)
    this.unwindFlow()

    const sx = this.x
    const sy = this.y
    const dx = x - sx
    const dy = y - sy
    const dist = Math.hypot(dx, dy) || 1
    const side = role === 'active' ? 1 : -1
    const bowX = (-dy / dist) * side * m.swap.arc * dist
    const bowY = (dx / dist) * side * m.swap.arc * dist

    const travel = () => {
      if (m.swap.stretch > 0) {
        // Stretched along the travel axis for the trip; landing resets it.
        this.scene.tweens.add({
          targets: this,
          scaleX: 1 + m.swap.stretch * (Math.abs(dx) / dist),
          scaleY: 1 + m.swap.stretch * (Math.abs(dy) / dist),
          duration: 120,
          ease: 'Quad.easeOut',
        })
      } else if (role === 'passive') {
        this.scene.tweens.add({
          targets: this,
          scale: m.swap.passiveLift,
          duration: 100,
          ease: 'Quad.easeOut',
        })
      }
      if (m.straighten) {
        this.scene.tweens.add({ targets: this, angle: 0, duration: 120, ease: 'Quad.easeOut' })
      }
      this.travelTween = this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: m.swap.duration,
        ease: m.swap.ease,
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0
          const bow = Math.sin(Math.PI * t)
          this.x = sx + dx * t + bowX * bow
          this.y = sy + dy * t + bowY * bow
        },
        onComplete: () => {
          this.land()
          onArrive?.()
        },
      })
    }

    if (role === 'passive') {
      this.scene.tweens.add({
        targets: this,
        scale: 0.95,
        duration: 70,
        ease: 'Quad.easeOut',
        onComplete: travel,
      })
    } else {
      travel()
    }
  }

  /**
   * Take a merge result in place: both tiles of a merge stay on their cells
   * and come out dyed. The pulse swells while the colours combine — the
   * mixing moment — then settles, with the tint crossfading to the result.
   */
  mix(result: Dye, onDone?: () => void): void {
    const from = this._dye.value
    this._dye = result
    this.killMotion()
    this.moving = true
    this.mixPulse(from, onDone)
  }

  /**
   * The dragged half of a merge: glide back to the home cell while taking the
   * result. Position and pulse ride on different properties, so the two tweens
   * coexist and the mix visibly starts at the drop, not after the return.
   */
  mergeReturn(x: number, y: number, restIndex: number, result: Dye, onDone?: () => void): void {
    const from = this._dye.value
    this._dye = result
    this.beginMove(DEPTH_ACTIVE)
    this.restAngle = this.jitterAngle(restIndex)
    this.unwindFlow()
    this.scene.tweens.add({ targets: this, x, y, duration: 180, ease: 'Quad.easeOut' })
    this.scene.tweens.add({
      targets: this,
      angle: this.restAngle,
      duration: 120,
      ease: 'Quad.easeOut',
    })
    this.mixPulse(from, onDone)
  }

  /**
   * The mixing pulse: swell, settle, idle-loop thrash-and-calm, and the tint
   * crossfade. The gloss can't exceed alpha 1, so the flash is the tint's
   * job — an overshoot toward white at the peak, landing on the result.
   */
  private mixPulse(from: number, onDone?: () => void): void {
    const m = this.shape.motion

    this.base.anims.timeScale = m.merge.agitation
    this.scene.tweens.add({
      targets: this.base.anims,
      timeScale: 1,
      duration: m.merge.rise + m.merge.settle,
    })

    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { scale: m.merge.swell, duration: m.merge.rise, ease: 'Quad.easeOut' },
        { scale: 1, duration: m.merge.settle, ease: m.merge.settleEase },
      ],
      onComplete: () => {
        this.setDepth(0)
        this.moving = false
        this.glint()
        onDone?.()
      },
    })

    const peak = lighten(this._dye.value, 0.35)
    this.tintTo(from, peak, m.merge.tint * 0.45, () =>
      this.tintTo(peak, this._dye.value, m.merge.tint * 0.55),
    )
  }

  private beginMove(depth: number): void {
    this.killMotion()
    this.moving = true
    this.held = false
    this.setDepth(depth)
  }

  private killMotion(): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.base.anims)
    this.travelTween?.remove()
    this.tintTween?.remove()
    this.liftTween = this.straightenTween = this.travelTween = this.tintTween = undefined
  }

  /** The settle every arrival shares: impact pose, rebound, angle to rest. */
  private land(): void {
    const m = this.shape.motion
    this.setScale(m.drop.squashX, m.drop.squashY)
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: m.drop.duration,
      ease: m.drop.ease,
      onComplete: () => {
        this.setDepth(0)
        this.moving = false
      },
    })
    this.scene.tweens.add({
      targets: this,
      angle: this.restAngle,
      duration: 120,
      ease: 'Quad.easeOut',
    })
    // Agitation from being held calms down after the tile is back on a cell.
    this.scene.tweens.add({ targets: this.base.anims, timeScale: 1, duration: 400 })
    this.glint()
  }

  /** Jump the idle to the glint window — the light crosses the settling tile. */
  private glint(): void {
    const frame = this.shape.motion.glintFrame
    if (frame === undefined) return
    const anim = this.base.anims.currentAnim
    if (!anim) return
    this.base.anims.setCurrentFrame(anim.frames[frame])
    this.gloss.setFrame(anim.frames[frame].textureFrame)
  }

  private tintTo(from: number, to: number, duration: number, onComplete?: () => void): void {
    const a = Phaser.Display.Color.ValueToColor(from)
    const b = Phaser.Display.Color.ValueToColor(to)
    this.tintTween = this.scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration,
      onUpdate: (tween) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, tween.getValue() ?? 0)
        this.base.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b))
      },
      onComplete,
    })
  }
}
