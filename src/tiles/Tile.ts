import Phaser from 'phaser'

import type { Dye } from '../palette'
import { CELL_SIZE, IDLE_ANIM, TILE_SIZE, TILE_TEXTURES } from './bake'

/**
 * One playable tile.
 *
 * Work is split by what each technique is actually good at. Anything
 * expressible as a transform — hover lift, press squish, and later the merge
 * and swap moves — is a tween: interruptible mid-flight, resolution
 * independent, free on the GPU. Only the deformation of the outline itself,
 * which no transform can express, comes from the baked frames.
 *
 * The two sprites must stay on the same frame or the highlight drifts off the
 * silhouette, so only the base plays the animation and the gloss follows it.
 */
export class Tile extends Phaser.GameObjects.Container {
  readonly dye: Dye

  private readonly base: Phaser.GameObjects.Sprite
  private readonly gloss: Phaser.GameObjects.Sprite

  constructor(scene: Phaser.Scene, x: number, y: number, dye: Dye, phase: number) {
    super(scene, x, y)
    this.dye = dye
    this.name = 'tile'

    this.base = scene.add
      .sprite(0, 0, TILE_TEXTURES.base)
      .setDisplaySize(CELL_SIZE, CELL_SIZE)
      .setTint(dye.value)

    this.gloss = scene.add.sprite(0, 0, TILE_TEXTURES.gloss).setDisplaySize(CELL_SIZE, CELL_SIZE)

    this.add([this.base, this.gloss])

    // Offsetting the start frame per tile keeps the board from breathing in
    // unison, which reads as a pulsing screen rather than as living tiles.
    this.base.play({ key: IDLE_ANIM, startFrame: phase % TILE_TEXTURES.frames })
    this.base.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        this.gloss.setFrame(frame.textureFrame)
      },
    )

    // Hit area is the blob, not the padded cell — the padding is shadow, and
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
      angle: 360,
      duration: 420,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.angle = 0
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
