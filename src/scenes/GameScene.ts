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
import type { ColorId } from '../colors'
import { flags } from '../flags'
import { recordWin } from '../progress'
import { mulberry32, takeSeed, type Rng } from '../rng'
import { activeShape, activeTheme } from '../settings'
import { playSfx } from '../sfx'
import { FIRST_STAGE, stageMix, stagePreset, type Stage } from '../stage'
import { STAGES } from '../stages'
import { addText } from '../text'
import { themedDye } from '../themes'
import { TILE_SIZE } from '../tiles/bake'
import { Tile } from '../tiles/Tile'
import type { Shape } from '../tiles/shapes'
import { addButton, addProgressMeter, addSurface } from '../ui/components'
import { ink, resolveVisualProfile } from '../ui/visual-system'
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
  const referenceSkin = resolveVisualProfile().treatment !== 'lab'
  // The margins shrink with the world: on a portrait phone the board is the
  // screen's one job, so it runs nearly edge to edge.
  return {
    top: referenceSkin
      ? Math.min(150, Math.round(GAME_HEIGHT * 0.18))
      : Math.min(110, Math.round(GAME_HEIGHT * 0.14)),
    bottom: GAME_HEIGHT - Math.min(56, Math.round(GAME_HEIGHT * 0.08)),
    marginX: Math.min(40, Math.round(GAME_WIDTH * 0.03)),
  }
}

/** Stagger between columns when the board falls, ms. */
const COLUMN_STAGGER = 14

/** Delay per flood step of the combo ripple, ms — the recolour's travel speed. */
const COMBO_RIPPLE = 70

/** From here down the move counter reads as a warning. */
const LOW_MOVES = 3

/** How the round starts: which authored stage, none meaning the dev board. */
export interface GameStartData {
  /** Index into STAGES; absent = FIRST_STAGE, reachable only via the bridge. */
  stage?: number
  /**
   * Test/console overrides for the win condition — how automation forces a
   * loss (or instant win) without playing twenty honest moves.
   */
  override?: { threshold?: number; moves?: number }
}

/** What the debug bridge reports about the board — see src/debug.ts. */
export interface BoardReport {
  cols: number
  rows: number
  score: number
  /** Index into STAGES, or null on the dev board. */
  stage: number | null
  threshold: number
  /** Moves still in the budget. */
  moves: number
  outcome: 'playing' | 'won' | 'lost'
  /** Masked cells only, with their world-space centres. */
  cells: { index: number; col: number; row: number; color: string | null; x: number; y: number }[]
}

/**
 * The match-3 round. Tiles clear when 3+ of a colour line up; gravity pulls
 * the board down, seed colours refill from above, cascades resolve on their
 * own and score with a rising wave multiplier. Every drop goes through the
 * merge-before-swap order in `resolveMove`: if the pair mixes and the dyed
 * *target* would complete a line (mixing is directional — the dye pours from
 * the dragged tile onto the target), both tiles take the result colour where
 * they stand; otherwise the swap gets its chance; neither clearing means the
 * drop shakes and goes home. Merge-triggered clears pay a bonus — the twist
 * should be worth choosing.
 *
 * On top of the loop sits the stage frame (M4): every legal move spends from
 * the stage's budget, reaching the threshold wins, running dry loses, and
 * both end in an overlay that offers the next step. Wins feed the linear
 * unlock in src/progress.ts.
 *
 * The scene is the animation half of the split with src/board.ts: the model
 * there is authoritative and synchronous, tiles here catch up to it tween by
 * tween, and `resolving` keeps the player out until the two agree again.
 */
export class GameScene extends BaseScene {
  private stage: Stage = FIRST_STAGE
  private stageIndex?: number
  private readonly mix: MixRule = (a, b) => stageMix(this.stage, a, b)

  private grid!: Grid
  private cells!: Cells
  private tiles!: (Tile | undefined)[]
  private rng!: Rng

  private score = 0
  private movesLeft = 0
  private outcome: 'playing' | 'won' | 'lost' = 'playing'
  /** The threshold moment fires once, however far the score climbs past it. */
  private thresholdMet = false

  /** What the score text shows right now — it ticks up toward `score`. */
  private displayScore = 0
  private scoreTween?: Phaser.Tweens.Tween
  private scoreText!: Phaser.GameObjects.Text
  private movesText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private targetFill!: Phaser.GameObjects.Rectangle
  private barX = 0
  private barWidth = 0
  private sprayHud = false

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

  create(data: GameStartData = {}): void {
    this.stageIndex = data.stage
    const authored = data.stage !== undefined ? STAGES[data.stage] : FIRST_STAGE
    this.stage = data.override ? { ...authored, ...data.override } : authored

    this.score = 0
    this.displayScore = 0
    this.movesLeft = this.stage.moves
    this.outcome = 'playing'
    this.thresholdMet = false
    this.resolving = false
    this.dragged = undefined
    this.shape = activeShape()
    this.rng = mulberry32(takeSeed() ?? Math.floor(Math.random() * 0xffffffff))

    this.grid = parseMask(this.stage.board)
    this.layoutBoard()
    this.cells = generateBoard(
      this.grid,
      this.stage.seed,
      this.rng,
      this.mix,
      stagePreset(this.stage.board, this.grid),
    )
    this.tiles = new Array(this.cells.length).fill(undefined)
    for (let index = 0; index < this.cells.length; index++) {
      const color = this.cells[index]
      if (color !== null) {
        const { x, y } = this.cellCenter(index)
        this.tiles[index] = this.makeTile(index, color, x, y)
      }
    }

    this.buildHud()

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

    this.input.keyboard?.once('keydown-ESC', () => this.fadeTo('StageSelect'))
  }

  update(_time: number, delta: number): void {
    this.dragged?.follow(delta)
  }

  /**
   * Rotation mid-round restarts the stage from move one: the board's whole
   * geometry (pitch, origins, every tween in flight) is built for one world
   * size, and a half-resolved cascade can't be rehomed. Losing a round to a
   * rotation is the accepted price; retries are free by design.
   */
  relayout(): void {
    this.scene.restart({ stage: this.stageIndex } satisfies GameStartData)
  }

  /** The board and stage state as data, for tests and console archaeology. */
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
    return {
      cols: this.grid.cols,
      rows: this.grid.rows,
      score: this.score,
      stage: this.stageIndex ?? null,
      threshold: this.stage.threshold,
      moves: this.movesLeft,
      outcome: this.outcome,
      cells,
    }
  }

  /**
   * The stage frame around the board: name and way out on top, then the
   * score/moves row, the threshold bar, and the stage's one hint line at the
   * bottom where the old generic instruction sat.
   */
  private buildHud(): void {
    const area = boardArea()
    const visual = resolveVisualProfile()
    const label =
      this.stageIndex !== undefined
        ? `Stage ${this.stageIndex + 1} — ${this.stage.name}`
        : this.stage.name
    this.sprayHud = visual.treatment === 'spray-can'
    if (this.sprayHud) {
      this.buildSprayHud(area, label)
      return
    }

    addSurface(this, GAME_WIDTH / 2, area.top / 2 - 3, GAME_WIDTH - 16, area.top - 12, 'game-hud', true)
    addText(this, area.marginX + 8, 11, label.toUpperCase(), {
      fontFamily: visual.type.family,
      fontSize: visual.type.label,
      fontStyle: 'bold',
      letterSpacing: 1,
      color: ink(visual.colors.secondaryInk),
    })
    addButton(
      this,
      GAME_WIDTH - area.marginX - 52,
      28,
      88,
      '‹ Stages',
      () => this.fadeTo('StageSelect'),
      { kind: 'quiet', name: 'back', height: 34, fontSize: '14px' },
    )

    this.scoreText = addText(this, area.marginX, area.top - 66, 'Score: 0', {
      fontFamily: visual.type.family,
      fontSize: '20px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    })

    this.movesText = addText(this, GAME_WIDTH - area.marginX, area.top - 51, '', {
      fontFamily: visual.type.family,
      fontSize: '20px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    }).setOrigin(1, 0)

    // The threshold bar: filling it is winning. The label rides its right end.
    this.barX = area.marginX
    this.barWidth = GAME_WIDTH - area.marginX * 2
    addText(this, GAME_WIDTH / 2, area.top - 26, `Target ${this.stage.threshold}`, {
      fontFamily: visual.type.family,
      fontSize: '12px',
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(0.5, 1)
    const meter = addProgressMeter(this, this.barX, area.top - 20, this.barWidth)
    this.targetFill = meter.fill

    addSurface(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH - 20, 48, 'hint-strip')
    this.hintText = addText(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, this.stage.hint, {
      fontFamily: visual.type.family,
      fontSize: '14px',
      color: ink(visual.colors.secondaryInk),
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 32 },
    }).setOrigin(0.5)

    this.updateHud()
  }

  private buildSprayHud(
    area: ReturnType<typeof boardArea>,
    label: string,
  ): void {
    const visual = resolveVisualProfile()
    const hud = this.add
      .graphics()
      .setName('game-hud')
      .setData('surfaceSize', { width: GAME_WIDTH - 16, height: area.top - 12 })
    hud.setPosition(GAME_WIDTH / 2, area.top / 2 - 3)

    const backWidth = 86
    const paperWidth = Math.max(150, GAME_WIDTH - area.marginX * 2 - backWidth - 16)
    const paper = this.add.container(area.marginX + paperWidth / 2, 24).setName('stage-label')
    const paperPlate = this.add.graphics()
    paperPlate.fillStyle(0xe8e4d9, 1)
    paperPlate.fillPoints([
      new Phaser.Math.Vector2(-paperWidth / 2 + 3, -16),
      new Phaser.Math.Vector2(paperWidth / 2, -17),
      new Phaser.Math.Vector2(paperWidth / 2 - 2, 16),
      new Phaser.Math.Vector2(-paperWidth / 2, 15),
    ], true)
    const paperText = addText(this, 0, 0, label.toUpperCase(), {
      fontFamily: visual.type.family,
      fontSize: visual.type.label,
      fontStyle: 'bold',
      letterSpacing: 1,
      color: ink(0x292621),
    }).setOrigin(0.5)
    paper.add([paperPlate, paperText]).setAngle(-1)

    addButton(
      this,
      GAME_WIDTH - area.marginX - backWidth / 2,
      28,
      backWidth,
      '‹ STAGES',
      () => this.fadeTo('StageSelect'),
      { kind: 'quiet', name: 'back', height: 34, fontSize: '13px' },
    )

    const scoreBlock = this.add.container(area.marginX, area.top - 60).setName('score-block')
    const scoreLabel = addText(this, 0, -14, 'SCORE', {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(visual.colors.secondaryInk),
    })
    this.scoreText = addText(this, 0, -2, '0', {
      fontFamily: visual.type.family,
      fontSize: '30px',
      fontStyle: 'bold',
      color: ink(visual.colors.accent),
    })
    scoreBlock.add([scoreLabel, this.scoreText])

    const movesBlock = this.add
      .container(GAME_WIDTH - area.marginX, area.top - 60)
      .setName('moves-block')
    const movesLabel = addText(this, 0, -14, 'MOVES', {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(1, 0)
    this.movesText = addText(this, 0, -2, '', {
      fontFamily: visual.type.family,
      fontSize: '30px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    }).setOrigin(1, 0)
    movesBlock.add([movesLabel, this.movesText])

    this.barX = area.marginX
    this.barWidth = GAME_WIDTH - area.marginX * 2
    addText(this, this.barX, area.top - 20, `TARGET ${this.stage.threshold}`, {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(0, 1)
    const meter = addProgressMeter(this, this.barX, area.top - 14, this.barWidth)
    this.targetFill = meter.fill

    const hintWidth = GAME_WIDTH - 24
    const hintPlate = this.add
      .graphics({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 30 })
      .setName('hint-strip')
      .setData('surfaceSize', { width: hintWidth, height: 48 })
    hintPlate.fillStyle(0xe8e4d9, 0.98)
    hintPlate.fillPoints([
      new Phaser.Math.Vector2(-hintWidth / 2 + 4, -20),
      new Phaser.Math.Vector2(hintWidth / 2, -18),
      new Phaser.Math.Vector2(hintWidth / 2 - 3, 20),
      new Phaser.Math.Vector2(-hintWidth / 2, 18),
    ], true)
    this.hintText = addText(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, this.stage.hint, {
      fontFamily: visual.type.family,
      fontSize: '14px',
      fontStyle: 'bold',
      color: ink(0x37332d),
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 38 },
    }).setOrigin(0.5)

    this.updateHud()
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
    playSfx('pick')
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
      playSfx('illegal')
      tile.refuse(home.x, home.y, origin)
      other.reject()
      return
    }

    this.resolving = true
    this.spendMove()

    if (move.kind === 'merge') {
      // Both tiles stay on their cells and come out dyed the result colour;
      // the dragged one glides home while the pair pulses. The pulse hands
      // off into the destruction, so mix → burst reads as cause and effect.
      playSfx('merge')
      this.cells[origin] = this.cells[cell] = move.result
      // The combo prototype: the fresh colour absorbs adjacent groups of its
      // own ingredients. Model-wise it happens now, in full; the animation
      // replays it as a travelling wave between the pulse and the burst.
      const conversions = flags.combo
        ? comboConversions(this.grid, this.cells, [origin, cell])
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
   * the score. Ends by settling the stage's fate: threshold reached wins,
   * an exhausted budget loses, and anything else revives a dead board if it
   * must and hands input back.
   */
  private async resolve(merged = false): Promise<void> {
    this.resolving = true
    for (let wave = 1; ; wave++) {
      const matched = findMatches(this.grid, this.cells)
      if (matched.size === 0) break

      // The merge bonus applies to the clear the merge itself caused; the
      // cascade waves after it score as cascades, whoever started them.
      const points = clearScore(matched.size, wave, merged && wave === 1)
      this.score += points
      // The wave pitches the plop up — the cascade multiplier, audible.
      playSfx('match', wave)
      this.floatScore(points, wave, matched)
      this.updateHud(wave)
      if (!this.thresholdMet && this.score >= this.stage.threshold) {
        this.thresholdMet = true
        this.celebrateThreshold()
      }
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

    if (this.score >= this.stage.threshold) {
      await this.win()
      return
    }

    if (!findLegalMove(this.grid, this.cells, this.mix)) {
      await this.animateReshuffle()
    }

    if (this.movesLeft <= 0) {
      this.lose()
      return
    }
    this.resolving = false
  }

  /** A legal move leaves the budget; the last few leave it loudly. */
  private spendMove(): void {
    this.movesLeft--
    this.hintText.setAlpha(0.42)
    this.updateHud()
    if (this.movesLeft <= LOW_MOVES) {
      this.movesText.setScale(1)
      this.tweens.chain({
        targets: this.movesText,
        tweens: [
          { scale: 1.3, duration: 100, ease: 'Quad.easeOut' },
          { scale: 1, duration: 220, ease: 'Back.easeOut' },
        ],
      })
    }
  }

  /**
   * Catch the HUD up to the model. The score ticks rather than jumps — the
   * counter chases `score`, and the threshold bar rides along. Cascade waves
   * give the score text a pulse that grows with the wave, so the multiplier
   * is felt in the counter, not just printed by the floats.
   */
  private updateHud(wave = 0): void {
    const visual = resolveVisualProfile()
    this.movesText
      .setText(this.sprayHud ? `${this.movesLeft}` : `Moves: ${this.movesLeft}`)
      .setColor(ink(
        this.movesLeft <= 1
          ? visual.colors.critical
          : this.movesLeft <= LOW_MOVES
            ? visual.colors.warning
            : visual.colors.primaryInk,
      ))

    this.scoreTween?.remove()
    const from = this.displayScore
    const to = this.score
    if (from === to) {
      this.renderScore()
    } else {
      this.scoreTween = this.tweens.addCounter({
        from,
        to,
        duration: 320,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          this.displayScore = tween.getValue() ?? to
          this.renderScore()
        },
        onComplete: () => {
          this.displayScore = to
          this.renderScore()
        },
      })
    }

    if (wave > 1) {
      this.scoreText.setScale(1)
      this.tweens.chain({
        targets: this.scoreText,
        tweens: [
          { scale: Math.min(1.35, 1.08 + wave * 0.06), duration: 110, ease: 'Quad.easeOut' },
          { scale: 1, duration: 240, ease: 'Back.easeOut' },
        ],
      })
    }
  }

  private renderScore(): void {
    this.scoreText.setText(
      this.sprayHud
        ? `${Math.round(this.displayScore)}`
        : `Score: ${Math.round(this.displayScore)}`,
    )
    const share = Math.min(1, this.displayScore / this.stage.threshold)
    this.targetFill.width = this.barWidth * share
  }

  /** Floating "+N" over the clear — bigger, hotter, and suffixed per wave. */
  private floatScore(points: number, wave: number, matched: Set<number>): void {
    const visual = resolveVisualProfile()
    let sx = 0
    let sy = 0
    for (const index of matched) {
      const { x, y } = this.cellCenter(index)
      sx += x
      sy += y
    }
    const x = sx / matched.size
    const y = sy / matched.size

    const text = addText(this, x, y, wave > 1 ? `+${points} ×${wave}` : `+${points}`, {
      fontFamily: visual.type.family,
      fontSize: `${Math.min(34, 18 + (wave - 1) * 5)}px`,
      fontStyle: 'bold',
      color: ink(wave > 1 ? visual.colors.accent : visual.colors.primaryInk),
    })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0)

    this.tweens.chain({
      targets: text,
      tweens: [
        { alpha: 1, y: y - 16, duration: 130, ease: 'Quad.easeOut' },
        { alpha: 0, y: y - 54, duration: 520, ease: 'Quad.easeIn' },
      ],
      onComplete: () => text.destroy(),
    })
  }

  /**
   * The moment the threshold is crossed — once per round. The bar flashes
   * bright and overshoots, and says so in words above it; the round still
   * ends on its own terms when the board settles.
   */
  private celebrateThreshold(): void {
    const visual = resolveVisualProfile()
    playSfx('threshold')
    const flash = this.add
      .rectangle(this.barX, this.targetFill.y, this.barWidth, 4, visual.colors.primaryInk, 0.9)
      .setOrigin(0, 0.5)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleY: 5,
      duration: 480,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    })

    const note = addText(this, GAME_WIDTH / 2, this.targetFill.y - 16, 'Target reached!', {
      fontFamily: visual.type.family,
      fontSize: '18px',
      fontStyle: 'bold',
      color: ink(visual.colors.accent),
    })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setAlpha(0)
    this.tweens.chain({
      targets: note,
      tweens: [
        { alpha: 1, scale: 1.15, duration: 160, ease: 'Back.easeOut' },
        { scale: 1, duration: 160 },
        { alpha: 0, duration: 500, delay: 600 },
      ],
      onComplete: () => note.destroy(),
    })
  }

  /**
   * The stage is won: bank the unlock, burst the whole board outward from
   * its centre — the celebration is the clear animation played tutti — then
   * tally up over an overlay that offers the next stage.
   */
  private async win(): Promise<void> {
    this.outcome = 'won'
    playSfx('win')
    const opened = this.stageIndex !== undefined && recordWin(this.stageIndex)

    const cx = this.originX + (this.grid.cols * this.pitch) / 2
    const cy = this.originY + (this.grid.rows * this.pitch) / 2
    const bursts: Promise<void>[] = []
    for (let index = 0; index < this.tiles.length; index++) {
      const tile = this.tiles[index]
      if (!tile) continue
      this.tiles[index] = undefined
      const delay = (Math.hypot(tile.x - cx, tile.y - cy) / this.pitch) * 46
      bursts.push(new Promise((done) => tile.clearOut(delay, done)))
    }
    await Promise.all(bursts)

    const next = this.stageIndex !== undefined ? this.stageIndex + 1 : undefined
    const hasNext = next !== undefined && next < STAGES.length
    const [tally] = this.buildOverlay('Stage clear!', ['Score: 0'], [
      hasNext
        ? {
            label: 'Next stage',
            name: 'next',
            primary: true,
            action: () => this.fadeTo('Game', { stage: next }),
          }
        : {
            label: 'Replay',
            name: 'retry',
            primary: true,
            action: () => this.fadeTo('Game', { stage: this.stageIndex }),
          },
      {
        label: 'Stages',
        name: 'stages',
        action: () => this.fadeTo('StageSelect', opened ? { reveal: next } : {}),
      },
    ])

    this.tweens.addCounter({
      from: 0,
      to: this.score,
      duration: 700,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => tally.setText(`Score: ${Math.round(tween.getValue() ?? 0)}`),
      onComplete: () => tally.setText(`Score: ${this.score}`),
    })
  }

  /**
   * Out of moves. Kind but deflating: the board dims rather than explodes,
   * and the overlay states the distance without rubbing it in. Retries are
   * free by design.
   */
  private lose(): void {
    const visual = resolveVisualProfile()
    this.outcome = 'lost'
    playSfx('lose')

    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, visual.colors.surfaceStrong)
      .setDepth(40)
      .setAlpha(0)
    this.tweens.add({ targets: dim, alpha: 0.55, duration: 450, ease: 'Quad.easeOut' })

    this.buildOverlay(
      'Out of moves',
      [`Score ${this.score} of ${this.stage.threshold}`, 'Retries are free.'],
      [
        {
          label: 'Retry',
          name: 'retry',
          primary: true,
          action: () => this.fadeTo('Game', { stage: this.stageIndex }),
        },
        { label: 'Stages', name: 'stages', action: () => this.fadeTo('StageSelect') },
      ],
    )
  }

  /**
   * The end-of-round panel: title, a few lines, a row of buttons. Returns the
   * line texts so a caller can animate one (the win tally). Input stays dead
   * beneath it — `resolving` never hands back after a win or loss.
   */
  private buildOverlay(
    title: string,
    lines: string[],
    buttons: { label: string; name: string; primary?: boolean; action: () => void }[],
  ): Phaser.GameObjects.Text[] {
    const visual = resolveVisualProfile()
    const width = Math.min(GAME_WIDTH - 48, 440)
    const height = 150 + lines.length * 30
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.42).setDepth(50)

    const box = this.add.graphics().setName('round-overlay')
    box.fillStyle(visual.colors.surfaceStrong, visual.alpha.surfaceStrong)
    box.lineStyle(2, visual.colors.accent, 0.5)
    if (visual.treatment === 'spray-can') {
      const points = [
        new Phaser.Math.Vector2(-width / 2 + 8, -height / 2),
        new Phaser.Math.Vector2(width / 2, -height / 2 + 5),
        new Phaser.Math.Vector2(width / 2 - 5, height / 2),
        new Phaser.Math.Vector2(-width / 2, height / 2 - 3),
      ]
      box.fillPoints(points, true)
      box.strokePoints(points, true)
      box.lineStyle(1, visual.colors.primaryInk, 0.04)
      for (let stripe = -width / 2; stripe < width / 2 + height; stripe += 14) {
        box.lineBetween(
          Math.max(-width / 2, stripe - height),
          height / 2,
          Math.min(width / 2, stripe),
          -height / 2,
        )
      }
    } else {
      box.fillRoundedRect(-width / 2, -height / 2, width, height, visual.radii.lg)
      box.strokeRoundedRect(-width / 2, -height / 2, width, height, visual.radii.lg)
    }
    panel.add(box)

    const titleText = addText(this, 0, -height / 2 + 40, title, {
      fontFamily: visual.type.family,
      fontSize: '32px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    }).setOrigin(0.5)
    panel.add(titleText)

    const lineTexts = lines.map((line, i) => {
      const text = addText(this, 0, -height / 2 + 84 + i * 30, line, {
        fontFamily: visual.type.family,
        fontSize: '19px',
        color: ink(visual.colors.secondaryInk),
      }).setOrigin(0.5)
      panel.add(text)
      return text
    })

    const y = height / 2 - 36
    const slot = width / buttons.length
    buttons.forEach((button, i) => {
      const control = addButton(this, 0, 0, slot - 16, button.label, button.action, {
        kind: button.primary ? 'primary' : 'quiet',
        name: button.name,
      }).setPosition(-width / 2 + slot * (i + 0.5), y)
      panel.add(control)
    })

    panel.setScale(0.92).setAlpha(0)
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: 'Back.easeOut',
    })
    return lineTexts
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
    playSfx('reshuffle')
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
}
