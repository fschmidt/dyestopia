import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { ColorId } from '../colors'
import { PALETTE, toCss, type Dye } from '../palette'
import { activeShape, activeTheme } from '../settings'
import { DEMO_STAGE, stageMix } from '../stage'
import { addText } from '../text'
import { themedDye } from '../themes'
import { TILE_SIZE } from '../tiles/bake'
import { Tile } from '../tiles/Tile'
import { BaseScene } from './BaseScene'

const COLS = 4
const ROWS = 3

/** Pointer travel below this is a tap; above it, a drag. */
const DRAG_THRESHOLD = 8

/**
 * Demo round for the mixing loop. The board seeds the stage's base colours
 * and the HUD names a mix to create. Dragging a tile onto an orthogonal
 * neighbour merges when the stage allows the mixed colour — both tiles stay
 * on their cells and take the result — and swaps otherwise; any other drop
 * returns home. Real level rules replace `DEMO_STAGE` and the scoring here.
 */
export class GameScene extends BaseScene {
  private readonly stage = DEMO_STAGE
  private score = 0
  private scoreText!: Phaser.GameObjects.Text
  private targetText!: Phaser.GameObjects.Text
  private target!: ColorId

  /** Fixed cell centres, row-major — the grid the tiles move around on. */
  private cells: { x: number; y: number }[] = []
  /** What sits on each cell. Merges dye in place, so the board stays full. */
  private tiles: Tile[] = []
  private dragged?: Tile
  private dragOrigin = -1
  /** Where the drag is headed — the tile itself lags behind the pointer. */
  private readonly dragTarget = new Phaser.Math.Vector2()

  constructor() {
    super('Game')
  }

  create(): void {
    this.score = 0

    this.scoreText = addText(this, 24, 20, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: toCss(PALETTE.ink),
    })

    this.targetText = addText(this, GAME_WIDTH / 2, 76, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: toCss(PALETTE.ink),
    }).setOrigin(0.5)

    this.buildGrid()
    this.pickTarget()
    this.updateHud()

    addText(this, GAME_WIDTH - 24, 20, 'ESC = Menu', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: toCss(PALETTE.inkMuted),
    }).setOrigin(1, 0)

    addText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 20,
      'Drag onto a neighbour — mixable colours merge, others swap',
      {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: toCss(PALETTE.inkMuted),
      },
    ).setOrigin(0.5, 1)

    this.input.dragDistanceThreshold = DRAG_THRESHOLD
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) =>
        this.onDragStart(obj),
    )
    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        obj: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number,
      ) => {
        if (obj !== this.dragged || !this.dragged) return
        this.dragTarget.set(dragX, dragY)
        this.dragged.setDragTarget(dragX, dragY)
      },
    )
    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) =>
        this.onDragEnd(obj),
    )

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'))
  }

  update(_time: number, delta: number): void {
    this.dragged?.follow(delta)
  }

  private buildGrid(): void {
    const shape = activeShape()
    const theme = activeTheme()

    this.cells = []
    this.tiles = []
    this.dragged = undefined

    const gridWidth = COLS * TILE_SIZE + (COLS - 1) * shape.gap
    const gridHeight = ROWS * TILE_SIZE + (ROWS - 1) * shape.gap
    const originX = (GAME_WIDTH - gridWidth) / 2
    const originY = (GAME_HEIGHT - gridHeight) / 2 + 40

    // Grout, for shapes that sit in something rather than floating above it.
    // Graphics rather than a Rectangle, which has no corner radius.
    if (shape.board) {
      const { color, alpha, radius, inset } = shape.board
      this.add
        .graphics()
        .setName('board')
        .fillStyle(color, alpha)
        .fillRoundedRect(
          originX - inset,
          originY - inset,
          gridWidth + inset * 2,
          gridHeight + inset * 2,
          radius,
        )
    }

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col
        const dye = this.dye(this.stage.seed[index % this.stage.seed.length], theme)
        const x = originX + col * (TILE_SIZE + shape.gap) + TILE_SIZE / 2
        const y = originY + row * (TILE_SIZE + shape.gap) + TILE_SIZE / 2

        const tile = new Tile(this, x, y, dye, shape, index)
        this.cells.push({ x, y })
        this.tiles.push(tile)
        this.input.setDraggable(tile)
        tile.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (pointer.getDistance() < DRAG_THRESHOLD && !tile.busy) tile.squish()
        })
      }
    }
  }

  private onDragStart(obj: Phaser.GameObjects.GameObject): void {
    if (!(obj instanceof Tile) || obj.busy) return
    const origin = this.tiles.indexOf(obj)
    if (origin === -1) return
    this.dragged = obj
    this.dragOrigin = origin
    this.dragTarget.set(obj.x, obj.y)
    obj.pickUp()
  }

  private onDragEnd(obj: Phaser.GameObjects.GameObject): void {
    if (obj !== this.dragged || !this.dragged) return
    const tile = this.dragged
    this.dragged = undefined
    const origin = this.dragOrigin
    const home = this.cells[origin]

    // Resolve against where the drag was headed, not where the tile is — it
    // lags behind the pointer, and the player's intent is the pointer.
    const cell = this.nearestCell(this.dragTarget.x, this.dragTarget.y)

    if (cell < 0 || cell === origin || !this.adjacent(origin, cell)) {
      tile.drop(home.x, home.y, origin)
      return
    }

    const occupant = this.tiles[cell]
    // A neighbour still travelling from an earlier move would be recoloured
    // mid-flight; wait for it to settle instead.
    if (occupant.busy) {
      tile.drop(home.x, home.y, origin)
      return
    }

    const result = stageMix(this.stage, tile.dye.name, occupant.dye.name)
    if (result) {
      const dye = this.dye(result)
      occupant.mix(dye)
      tile.mergeReturn(home.x, home.y, origin, dye)
      if (result === this.target) {
        this.score += 1
        this.pickTarget()
      }
      this.updateHud()
    } else {
      this.tiles[origin] = occupant
      this.tiles[cell] = tile
      tile.swapTo(this.cells[cell].x, this.cells[cell].y, cell, 'active')
      occupant.swapTo(home.x, home.y, origin, 'passive')
    }
  }

  /** The cell whose centre is nearest, if within grabbing range; -1 otherwise. */
  private nearestCell(x: number, y: number): number {
    let best = -1
    let bestDist = TILE_SIZE * 0.75
    for (let i = 0; i < this.cells.length; i++) {
      const d = Math.hypot(this.cells[i].x - x, this.cells[i].y - y)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return best
  }

  /** Orthogonal neighbours only — diagonal drops don't count. */
  private adjacent(a: number, b: number): boolean {
    const rows = Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS))
    const cols = Math.abs((a % COLS) - (b % COLS))
    return rows + cols === 1
  }

  private dye(id: ColorId, theme = activeTheme()): Dye {
    return themedDye(theme, id)
  }

  private pickTarget(): void {
    this.target = Phaser.Utils.Array.GetRandom(this.stage.goals)
  }

  private updateHud(): void {
    this.scoreText.setText(`Score: ${this.score}`)
    this.targetText.setText(`Mix: ${this.target}`)
    this.targetText.setColor(toCss(activeTheme().values[this.target]))
  }
}
