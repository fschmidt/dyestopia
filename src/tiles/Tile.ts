import Phaser from 'phaser'

import type { Dye } from '../palette'
import { TILE_SIZE, cellSize, textureKeys } from './bake'
import type { Shape } from './shapes'

/**
 * One playable tile.
 *
 * Work is split by what each technique is actually good at. Anything
 * expressible as a transform — hover lift, press squish, the mosaic's hand-set
 * rotation, and later the merge and swap moves — is a tween or a static
 * property: interruptible, resolution independent, free on the GPU. Only what
 * no transform can express comes from the baked frames, which is why the blob
 * needs 24 of them for its outline and the mosaic uses its own for a glint
 * crossing the glaze.
 *
 * The two sprites must stay on the same frame or the highlight drifts off the
 * silhouette, so only the base plays the animation and the gloss follows it.
 */
export class Tile extends Phaser.GameObjects.Container {
  readonly dye: Dye

  private readonly base: Phaser.GameObjects.Sprite
  private readonly gloss: Phaser.GameObjects.Sprite
  /** Kept so tweens can return to it — jitter means it isn't always zero. */
  private readonly restAngle: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dye: Dye,
    shape: Shape,
    index: number,
  ) {
    super(scene, x, y)
    this.dye = dye
    this.name = 'tile'

    const keys = textureKeys(shape)
    const cell = cellSize(shape)

    this.base = scene.add
      .sprite(0, 0, keys.base)
      .setDisplaySize(cell, cell)
      .setTint(dye.value)

    this.gloss = scene.add.sprite(0, 0, keys.gloss).setDisplaySize(cell, cell)

    this.add([this.base, this.gloss])

    this.restAngle = shape.jitter ? shape.jitter[index % shape.jitter.length] : 0
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
    this.setSize(TILE_SIZE, TILE_SIZE)
    this.setInteractive({ useHandCursor: true })

    this.on('pointerover', () => this.lift(true))
    this.on('pointerout', () => this.lift(false))

    scene.add.existing(this)
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
}
