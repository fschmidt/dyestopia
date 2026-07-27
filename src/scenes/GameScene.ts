import Phaser from 'phaser'

import {
  applyGravity,
  clearScore,
  comboConversions,
  findLegalMove,
  findMatches,
  generateBoard,
  isAdjacent,
  parseMask,
  refill,
  reshuffle,
  resolveMove,
  type Cells,
  type CellMove,
  type Conversion,
  type Grid,
  type MixRule,
  type Spawn,
} from '../board'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { mixResult, type ColorId } from '../colors'
import { flags } from '../flags'
import { PALETTE, toCss } from '../palette'
import { mulberry32, takeSeed, type Rng } from '../rng'
import { activeShape, activeTheme } from '../settings'
import { FIRST_STAGE, stageMix } from '../stage'
import { addText } from '../text'
import { themedDye } from '../themes'
import { TILE_SIZE } from '../tiles/bake'
import { Tile } from '../tiles/Tile'
import type { Shape } from '../tiles/shapes'
import { BaseScene } from './BaseScene'

/** Pointer travel below this is a tap; above it, a drag. */
const DRAG_THRESHOLD = 8

/**
 * The rectangle reserved for the board: room for a BOARD_AREA-sized stage,
 * with the HUD above and space below for what post-MVP puts there (tools).
 * Stages smaller than the area get larger tiles, capped at full size.
 *
 * A function, not module constants: `config.ts` imports the scenes, which
 * reach back for GAME_WIDTH/HEIGHT, so at module-evaluation time those are
 * still in their temporal dead zone (same trap as `bakeDpr` in bake.ts).
 */
function boardArea(): { top: number; bottom: number; marginX: number } {
  // The margins shrink with the world: on a portrait phone the board is the
  // screen's one job, so it runs nearly edge to edge.
  return {
    top: Math.min(110, Math.round(GAME_HEIGHT * 0.14)),
    bottom: GAME_HEIGHT - Math.min(56, Math.round(GAME_HEIGHT * 0.08)),
    marginX: Math.min(40, Math.round(GAME_WIDTH * 0.03)),
  }
}

/** Stagger between columns when the board falls, ms. */
const COLUMN_STAGGER = 14

/** Delay per flood step of the combo ripple, ms — the recolour's travel speed. */
const COMBO_RIPPLE = 70

/** What the debug bridge reports about the board — see src/debug.ts. */
export interface BoardReport {
  cols: number
  rows: number
  score: number
  /** Masked cells only, with their world-space centres. */
  cells: { index: number; col: number; row: number; color: string | null; x: number; y: number }[]
}

/**
 * The match-3 round. Tiles clear when 3+ of a colour line up; gravity pulls
 * the board down, seed colours refill from above, cascades resolve on their
 * own and score with a rising wave multiplier. Every drop goes through the
 * merge-before-swap order in `resolveMove`: if the pair mixes and the merge
 * would clear, both tiles take the result colour where they stand; otherwise
 * the swap gets its chance; neither clearing means the drop shakes and goes
 * home. Merge-triggered clears pay a bonus — the twist should be worth
 * choosing.
 *
 * The scene is the animation half of the split with src/board.ts: the model
 * there is authoritative and synchronous, tiles here catch up to it tween by
 * tween, and `resolving` keeps the player out until the two agree again.
 */
export class GameScene extends BaseScene {
  private readonly stage = FIRST_STAGE
  private readonly mix: MixRule = (a, b) => stageMix(this.stage, a, b)

  private grid!: Grid
  private cells!: Cells
  private tiles!: (Tile | undefined)[]
  private rng!: Rng

  private score = 0
  private scoreText!: Phaser.GameObjects.Text
  /** A move is being resolved — no new moves until the board settles. */
  private resolving = false

  private shape!: Shape
  /** Cell pitch (tile + gap) and the tile size within it, in world units. */
  private pitch = 0
  private tileSize = 0
  private originX = 0
  private originY = 0

  private dragged?: Tile
  private dragOrigin = -1
  /** Where the drag is headed — the tile itself lags behind the pointer. */
  private readonly dragTarget = new Phaser.Math.Vector2()

  constructor() {
    super('Game')
  }

  create(): void {
    this.score = 0
    this.resolving = false
    this.dragged = undefined
    this.shape = activeShape()
    this.rng = mulberry32(takeSeed() ?? Math.floor(Math.random() * 0xffffffff))

    this.grid = parseMask(this.stage.board)
    this.layoutBoard()
    this.cells = generateBoard(this.grid, this.stage.seed, this.rng, this.mix)
    this.tiles = new Array(this.cells.length).fill(undefined)
    for (let index = 0; index < this.cells.length; index++) {
      const color = this.cells[index]
      if (color !== null) {
        const { x, y } = this.cellCenter(index)
        this.tiles[index] = this.makeTile(index, color, x, y)
      }
    }

    this.scoreText = addText(this, 24, 20, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: toCss(PALETTE.ink),
    })
    this.updateHud()

    addText(this, GAME_WIDTH - 24, 20, 'ESC = Menu', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: toCss(PALETTE.inkMuted),
    }).setOrigin(1, 0)

    addText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 18,
      'Drag a tile onto a neighbour — mix a colour, or line up 3',
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

  /** The board and score as data, for tests and console archaeology. */
  boardState(): BoardReport {
    const cells = []
    for (let index = 0; index < this.grid.mask.length; index++) {
      if (!this.grid.mask[index]) continue
      const { x, y } = this.cellCenter(index)
      cells.push({
        index,
        col: index % this.grid.cols,
        row: Math.floor(index / this.grid.cols),
        color: this.cells[index],
        x,
        y,
      })
    }
    return { cols: this.grid.cols, rows: this.grid.rows, score: this.score, cells }
  }

  /**
   * Fit the stage's mask into the reserved board area: the pitch shrinks
   * until the grid fits, and small boards get full-size tiles rather than
   * ballooning to fill the space.
   */
  private layoutBoard(): void {
    const area = boardArea()
    const areaWidth = GAME_WIDTH - area.marginX * 2
    const areaHeight = area.bottom - area.top
    this.pitch = Math.min(
      areaWidth / this.grid.cols,
      areaHeight / this.grid.rows,
      TILE_SIZE + this.shape.gap,
    )
    this.tileSize = this.pitch * (TILE_SIZE / (TILE_SIZE + this.shape.gap))
    this.originX = (GAME_WIDTH - this.grid.cols * this.pitch) / 2
    this.originY = area.top + (areaHeight - this.grid.rows * this.pitch) / 2

    // Grout, for shapes that sit in something rather than floating above it.
    // Drawn over the mask's bounding box — good enough while masks are
    // rectangular; irregular stages will want per-cell grout.
    if (this.shape.board) {
      const { color, alpha, radius, inset } = this.shape.board
      const scale = this.tileSize / TILE_SIZE
      const pad = (this.pitch - this.tileSize) / 2 - inset * scale
      this.add
        .graphics()
        .setName('board')
        .fillStyle(color, alpha)
        .fillRoundedRect(
          this.originX + pad,
          this.originY + pad,
          this.grid.cols * this.pitch - pad * 2,
          this.grid.rows * this.pitch - pad * 2,
          radius * scale,
        )
    }
  }

  private cellCenter(index: number): { x: number; y: number } {
    return {
      x: this.originX + ((index % this.grid.cols) + 0.5) * this.pitch,
      y: this.originY + (Math.floor(index / this.grid.cols) + 0.5) * this.pitch,
    }
  }

  private makeTile(index: number, color: ColorId, x: number, y: number): Tile {
    const tile = new Tile(
      this,
      x,
      y,
      themedDye(activeTheme(), color),
      this.shape,
      index,
      this.tileSize,
    )
    this.input.setDraggable(tile)
    tile.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() < DRAG_THRESHOLD && !tile.busy) tile.squish()
    })
    return tile
  }

  private onDragStart(obj: Phaser.GameObjects.GameObject): void {
    if (!(obj instanceof Tile) || obj.busy || this.resolving) return
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
    const home = this.cellCenter(origin)

    // Resolve against where the drag was headed, not where the tile is — it
    // lags behind the pointer, and the player's intent is the pointer.
    const cell = this.nearestCell(this.dragTarget.x, this.dragTarget.y)

    if (
      cell < 0 ||
      cell === origin ||
      !isAdjacent(this.grid, origin, cell) ||
      this.resolving ||
      !this.tiles[cell] ||
      this.tiles[cell].busy
    ) {
      // Not a move at all — nothing adjacent under the pointer, or the board
      // is mid-resolution. A plain trip home, no commentary.
      tile.drop(home.x, home.y, origin)
      return
    }

    const other = this.tiles[cell]
    const move = resolveMove(this.grid, this.cells, this.mix, origin, cell)

    if (move.kind === 'illegal') {
      // A real attempt the rules refuse: both tiles say no, so the legality
      // rule teaches itself.
      tile.refuse(home.x, home.y, origin)
      other.reject()
      return
    }

    this.resolving = true

    if (move.kind === 'merge') {
      // Both tiles stay on their cells and come out dyed the result colour;
      // the dragged one glides home while the pair pulses. The pulse hands
      // off into the destruction, so mix → burst reads as cause and effect.
      this.cells[origin] = this.cells[cell] = move.result
      // The combo prototype: the merge's colour change ripples into adjacent
      // mixing groups. Model-wise it happens now, in full; the animation
      // replays it as a travelling wave between the pulse and the burst.
      const conversions = flags.combo
        ? comboConversions(this.grid, this.cells, [origin, cell], mixResult)
        : []
      const dye = themedDye(activeTheme(), move.result)
      void Promise.all([
        new Promise<void>((done) => tile.mergeReturn(home.x, home.y, origin, dye, done)),
        new Promise<void>((done) => other.mix(dye, done)),
      ])
        .then(() => this.animateCombo(conversions))
        .then(() => this.resolve(true))
      return
    }

    ;[this.cells[origin], this.cells[cell]] = [this.cells[cell], this.cells[origin]]
    this.tiles[origin] = other
    this.tiles[cell] = tile
    const target = this.cellCenter(cell)
    void Promise.all([
      new Promise<void>((done) => tile.swapTo(target.x, target.y, cell, 'active', done)),
      new Promise<void>((done) => other.swapTo(home.x, home.y, origin, 'passive', done)),
    ]).then(() => this.resolve())
  }

  /**
   * Settle the board after a move: clear, fall, refill, repeat while new
   * lines keep forming — the cascade loop. Waves cost no move and multiply
   * the score. Ends by reviving a dead board, then hands input back.
   */
  private async resolve(merged = false): Promise<void> {
    this.resolving = true
    for (let wave = 1; ; wave++) {
      const matched = findMatches(this.grid, this.cells)
      if (matched.size === 0) break

      // The merge bonus applies to the clear the merge itself caused; the
      // cascade waves after it score as cascades, whoever started them.
      this.score += clearScore(matched.size, wave, merged && wave === 1)
      this.updateHud()
      await Promise.all(
        [...matched].map(
          (index) =>
            new Promise<void>((done) => {
              const tile = this.tiles[index]
              this.cells[index] = null
              this.tiles[index] = undefined
              tile ? tile.clearOut(0, done) : done()
            }),
        ),
      )

      const falls = applyGravity(this.grid, this.cells)
      const spawns = refill(this.grid, this.cells, this.stage.seed, this.rng)
      await this.animateDescent(falls, spawns)
    }

    if (!findLegalMove(this.grid, this.cells, this.mix)) await this.animateReshuffle()
    this.resolving = false
  }

  /**
   * The combo ripple: every converted tile pulses to its new colour, delayed
   * by its flood distance from the merge — the recolour visibly travels
   * outward before the burst fires.
   */
  private animateCombo(conversions: Conversion[]): Promise<unknown> {
    return Promise.all(
      conversions.map(
        ({ index, color, step }) =>
          new Promise<void>((done) => {
            const tile = this.tiles[index]
            if (!tile) return done()
            this.time.delayedCall((step - 1) * COMBO_RIPPLE, () =>
              tile.convert(themedDye(activeTheme(), color), done),
            )
          }),
      ),
    )
  }

  /** Surviving tiles fall into the gaps; new ones drop in from above the top edge. */
  private animateDescent(falls: CellMove[], spawns: Spawn[]): Promise<unknown> {
    const arrivals: Promise<void>[] = []

    for (const { from, to } of falls) {
      const tile = this.tiles[from]
      if (!tile) continue
      this.tiles[to] = tile
      this.tiles[from] = undefined
      const col = to % this.grid.cols
      const dropped = Math.floor(to / this.grid.cols) - Math.floor(from / this.grid.cols)
      arrivals.push(
        new Promise((done) =>
          tile.fallTo(this.cellCenter(to).y, to, dropped, col * COLUMN_STAGGER, done),
        ),
      )
    }

    // New tiles stack up above the board edge, lowest target nearest it, so a
    // column's refill pours in as one run — and shares the falling tiles'
    // acceleration, so it never catches them up.
    const byColumn = new Map<number, Spawn[]>()
    for (const spawn of spawns) {
      const col = spawn.index % this.grid.cols
      byColumn.set(col, [...(byColumn.get(col) ?? []), spawn])
    }
    for (const [col, column] of byColumn) {
      column.sort((a, b) => a.index - b.index)
      for (let i = 0; i < column.length; i++) {
        const { index, color } = column[i]
        const stack = column.length - i
        const { x, y } = this.cellCenter(index)
        const startY = this.originY - (stack - 0.5) * this.pitch
        const tile = this.makeTile(index, color, x, startY)
        this.tiles[index] = tile
        const dropped = Math.floor(index / this.grid.cols) + stack
        arrivals.push(
          new Promise((done) => tile.fallTo(y, index, dropped, col * COLUMN_STAGGER, done)),
        )
        // Falling in from offscreen-ish; the fade keeps the entry from popping
        // into existence over the HUD.
        tile.setAlpha(0)
        this.tweens.add({ targets: tile, alpha: 1, duration: 130, delay: col * COLUMN_STAGGER })
      }
    }

    return Promise.all(arrivals)
  }

  /**
   * A dead board rearranges itself, at no cost to the player. The scramble is
   * the swap-travel skeleton played board-wide: every moving tile arcs to its
   * new cell in a stagger, so it reads as the board reshuffling itself rather
   * than teleporting.
   */
  private animateReshuffle(): Promise<unknown> {
    const { cells, moves } = reshuffle(this.grid, this.cells, this.rng, this.mix)
    this.cells = cells

    const next = this.tiles.slice()
    const arrivals: Promise<void>[] = []
    moves.forEach(({ from, to }, i) => {
      const tile = this.tiles[from]
      if (!tile) return
      next[to] = tile
      const { x, y } = this.cellCenter(to)
      arrivals.push(
        new Promise((done) =>
          this.time.delayedCall(i * 22, () =>
            tile.swapTo(x, y, to, i % 2 === 0 ? 'active' : 'passive', done),
          ),
        ),
      )
    })
    this.tiles = next
    return Promise.all(arrivals)
  }

  /** The cell whose centre is nearest, if within grabbing range; -1 otherwise. */
  private nearestCell(x: number, y: number): number {
    let best = -1
    let bestDist = this.pitch * 0.75
    for (let index = 0; index < this.grid.mask.length; index++) {
      if (!this.grid.mask[index]) continue
      const centre = this.cellCenter(index)
      const d = Math.hypot(centre.x - x, centre.y - y)
      if (d < bestDist) {
        bestDist = d
        best = index
      }
    }
    return best
  }

  private updateHud(): void {
    this.scoreText.setText(`Score: ${this.score}`)
  }
}
