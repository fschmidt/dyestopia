import Phaser from 'phaser'

import {
  isAdjacent,
  resolveMove,
  type Cells,
  type CellMove,
  type ColorChain,
  type Conversion,
  type Grid,
  type MixRule,
  type ScoreResolution,
  type Spawn,
} from '../board'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { ColorId } from '../colors'
import { flags } from '../flags'
import { recordToolClear, recordTutorialClear, recordWin } from '../progress'
import { takeSeed } from '../rng'
import {
  isWon,
  playMove,
  settleRound,
  startRound,
  type MoveReport,
  type Outcome,
  type RoundState,
} from '../round'
import { activeShape, activeTheme } from '../settings'
import { playSfx } from '../sfx'
import { FIRST_STAGE, stageMixes, type Stage, type ToolId } from '../stage'
import { STAGES } from '../stages'
import { TOOL_STAGES } from '../tool-stages'
import { TUTORIALS, type TutorialGoal, type TutorialVisual } from '../tutorials'
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
function boardArea(reserveTools = false): { top: number; bottom: number; marginX: number } {
  const sprayCan = resolveVisualProfile().treatment === 'spray-can'
  // The margins shrink with the world: on a portrait phone the board is the
  // screen's one job, so it runs nearly edge to edge.
  return {
    top: sprayCan
      ? Math.min(272, Math.round(GAME_HEIGHT * 0.28))
      : Math.min(110, Math.round(GAME_HEIGHT * 0.14)),
    bottom: Math.min(GAME_HEIGHT - (sprayCan
      ? Math.min(160, Math.round(GAME_HEIGHT * 0.16))
      : Math.min(56, Math.round(GAME_HEIGHT * 0.08))), reserveTools ? GAME_HEIGHT - 130 : GAME_HEIGHT),
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
  /** Index into TOOL_STAGES; these continue numbering at stage 11. */
  toolStage?: number
  /** Index into TUTORIALS; runs its authored board through the normal game loop. */
  tutorial?: number
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
  multiplier: number
  maxMultiplier: number
  effectiveMultiplier: number
  resolution: ScoreResolution['kind']
  chainResults: ColorId[]
  /** Index into STAGES, or null on the dev board. */
  stage: number | null
  toolStage: number | null
  tutorial: number | null
  tools: Record<ToolId, number>
  activeTool: ToolId | null
  threshold: number
  /** Moves still in the budget. */
  moves: number
  /**
   * Nothing is in flight: no cascade resolving, no tile mid-tween. The board
   * cannot change again without new input, which is what lets a driver assert
   * that a refused drop cost nothing without guessing how long the refusal
   * takes to play out.
   */
  settled: boolean
  /** Stage 10 has crossed its target and the player chose unlimited play. */
  endless: boolean
  outcome: 'playing' | 'won' | 'lost'
  /** Masked cells only, with their world-space centres. */
  cells: { index: number; col: number; row: number; color: string | null; x: number; y: number }[]
}

interface TutorialMoveDemo {
  from: number
  to: number
  kind: 'swap' | 'merge'
}

/**
 * The match-3 round. Tiles clear when 3+ of a colour line up; gravity pulls
 * the board down, seed colours refill from above, cascades resolve on their
 * own and score with the current player-built colour multiplier. Every drop
 * goes through the merge-before-swap order in `resolveMove`: if the pair
 * mixes and the dyed
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
 * The scene is the animation half of the split with src/round.ts: the round
 * there is authoritative and synchronous — a drop is played out in full, budget
 * and all, before a tile has moved — and everything here replays the recording
 * it hands back. `resolving` keeps the player out until the two agree again.
 */
export class GameScene extends BaseScene {
  /**
   * The round the scene is drawing. Everything the rules decide lives in here
   * (src/round.ts); the scene owns only the tiles that catch up to it. The
   * readers below are the seam — the scene reads freely, and the few places
   * that write go through `this.round` on purpose, so a write is visible.
   */
  private round!: RoundState
  private stageIndex?: number
  private toolStageIndex?: number
  private tutorialIndex?: number

  private tiles!: (Tile | undefined)[]

  private get stage(): Stage { return this.round.stage }
  private get mix(): MixRule { return this.round.mix }
  private get grid(): Grid { return this.round.grid }
  private get cells(): Cells { return this.round.cells }
  private get colorChain(): ColorChain { return this.round.colorChain }
  private get maxMultiplier(): number { return this.round.maxMultiplier }
  private get scoreResolution(): ScoreResolution { return this.round.resolution }
  private get movesLeft(): number { return this.round.movesLeft }
  private get endless(): boolean { return this.round.endless }
  private get outcome(): Outcome { return this.round.outcome }

  /**
   * How far the *replay* has got, which is behind the model on purpose: a move
   * resolves in full before a tile has moved, so the score arrives all at once
   * and a swap's chain has already broken. The HUD and the debug bridge read
   * from here instead, so the player (and a test) still sees the climb and the
   * chain-breaker window rather than the settled answer.
   *
   * `cells` is the exception, and always was — the board has been reported
   * settled-ahead since `resolveCascade`. `T-039` audits the tests that sample
   * this window.
   */
  private shown: { score: number; chain: ColorChain; resolution: ScoreResolution } = {
    score: 0,
    chain: { results: [], multiplier: 1 },
    resolution: { kind: 'normal', multiplier: 1, rainbow: false },
  }

  /** What the score text shows right now — it ticks up toward `score`. */
  private displayScore = 0
  private scoreTween?: Phaser.Tweens.Tween
  private scoreText!: Phaser.GameObjects.Text
  private multiplierText!: Phaser.GameObjects.Text
  private chainRing!: Phaser.GameObjects.Container
  private chainComplete = false
  private movesText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private targetFill!: Phaser.GameObjects.Rectangle
  private barX = 0
  private barWidth = 0
  private sprayHud = false
  private objectivePanel?: Phaser.GameObjects.Container
  private pauseDialog?: Phaser.GameObjects.Container
  private paused = false
  private tools: Record<ToolId, number> = { freeMove: 0 }
  private activeTool: ToolId | null = null
  private toolTray?: Phaser.GameObjects.Container
  private tutorialDemoTimer?: Phaser.Time.TimerEvent
  private tutorialDemoGeneration = 0
  private tutorialDemoDragged?: Tile
  private tutorialDemoGhosts: Tile[] = []
  private tutorialDemoOriginals: Tile[] = []

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
    this.toolStageIndex = data.toolStage
    this.tutorialIndex = data.tutorial
    const authored =
      data.tutorial !== undefined
        ? TUTORIALS[data.tutorial]?.stage ?? TUTORIALS[0].stage
        : data.toolStage !== undefined
          ? TOOL_STAGES[data.toolStage] ?? TOOL_STAGES[0]
        : data.stage !== undefined
          ? STAGES[data.stage]
          : FIRST_STAGE
    const stage = data.override ? { ...authored, ...data.override } : authored
    const plantedSeed = takeSeed()
    const seed =
      this.tutorialIndex !== undefined
        ? 0x7a110000 + this.tutorialIndex
        : plantedSeed ?? Math.floor(Math.random() * 0xffffffff)
    // Dealt first: everything below reads the stage through the round.
    this.round = startRound(stage, { seed, combo: flags.combo ? 'full' : 'off' })

    this.displayScore = 0
    this.chainComplete = false
    this.resolving = false
    this.paused = false
    this.tools = { freeMove: this.stage.tools?.freeMove ?? 0 }
    this.activeTool = null
    this.toolTray = undefined
    this.objectivePanel = undefined
    this.pauseDialog = undefined
    this.tutorialDemoTimer = undefined
    this.tutorialDemoGeneration = 0
    this.tutorialDemoDragged = undefined
    this.tutorialDemoGhosts = []
    this.tutorialDemoOriginals = []
    this.dragged = undefined
    this.shape = activeShape()
    this.layoutBoard()
    this.prepareTutorialChain()
    this.shown = {
      score: this.round.score,
      chain: this.round.colorChain,
      resolution: this.round.resolution,
    }
    this.tiles = new Array(this.cells.length).fill(undefined)
    for (let index = 0; index < this.cells.length; index++) {
      const color = this.cells[index]
      if (color !== null) {
        const { x, y } = this.cellCenter(index)
        this.tiles[index] = this.makeTile(index, color, x, y)
      }
    }

    this.buildHud()
    if (this.stage.tools) this.buildToolTray()
    if (this.tutorialIndex !== undefined) this.buildTutorialPresentation()

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

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.outcome !== 'playing') return
      if (this.pauseDialog?.name === 'endless-dialog') return
      if (this.paused) this.closePause()
      else this.openPause()
    })
  }

  /**
   * Rainbow lessons teach the final step, so their prepared board arrives at
   * 2/3. Fill every recipe except the distinct Mix that is actually legal on
   * this deterministic opening board; performing the demonstrated move then
   * completes the ring without depending on random refills.
   */
  private prepareTutorialChain(): void {
    if (this.tutorialIndex === undefined) return
    const goal = TUTORIALS[this.tutorialIndex].goal
    if (goal !== 'rainbow-chain' && goal !== 'rainbow-chain-breaker') return

    for (let from = 0; from < this.cells.length; from++) {
      for (let to = 0; to < this.cells.length; to++) {
        const move = resolveMove(this.grid, this.cells, this.mix, from, to)
        if (move.kind !== 'merge') continue
        const results = stageMixes(this.stage)
          .map(({ result }) => result)
          .filter((result) => result !== move.result)
        this.round.colorChain = { results, multiplier: results.length + 1 }
        return
      }
    }
  }

  update(_time: number, delta: number): void {
    ;(this.dragged ?? this.tutorialDemoDragged)?.follow(delta)
  }

  /**
   * Rotation mid-round restarts the stage from move one: the board's whole
   * geometry (pitch, origins, every tween in flight) is built for one world
   * size, and a half-resolved cascade can't be rehomed. Losing a round to a
   * rotation is the accepted price; retries are free by design.
   */
  relayout(): void {
    this.scene.restart(this.currentStartData())
  }

  private currentStartData(): GameStartData {
    if (this.tutorialIndex !== undefined) return { tutorial: this.tutorialIndex }
    if (this.toolStageIndex !== undefined) return { toolStage: this.toolStageIndex }
    return { stage: this.stageIndex }
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
      score: this.shown.score,
      multiplier: this.shown.chain.multiplier,
      maxMultiplier: this.maxMultiplier,
      effectiveMultiplier: this.shown.resolution.multiplier,
      resolution: this.shown.resolution.kind,
      chainResults: [...this.shown.chain.results],
      stage: this.stageIndex ?? null,
      toolStage: this.toolStageIndex ?? null,
      tutorial: this.tutorialIndex ?? null,
      tools: { ...this.tools },
      activeTool: this.activeTool,
      threshold: this.stage.threshold,
      moves: this.movesLeft,
      settled: !this.resolving && this.tiles.every((tile) => !tile?.busy),
      endless: this.endless,
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
    const area = boardArea(Boolean(this.stage.tools))
    const visual = resolveVisualProfile()
    const label =
      this.tutorialIndex !== undefined
        ? `Tutorial ${this.tutorialIndex + 1} — ${TUTORIALS[this.tutorialIndex].name}`
        : this.toolStageIndex !== undefined
          ? `Stage ${STAGES.length + this.toolStageIndex + 1} — ${this.stage.name}`
        : this.stageIndex !== undefined
        ? `Stage ${this.stageIndex + 1} — ${this.stage.name}`
        : this.stage.name
    this.sprayHud = visual.treatment === 'spray-can'
    if (this.sprayHud) {
      this.buildSprayHud(area)
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
      () => this.fadeTo(
        'StageSelect',
        this.toolStageIndex !== undefined
          ? { page: 'tools', selected: this.toolStageIndex }
          : this.tutorialIndex !== undefined
            ? { page: 'tutorial', selected: this.tutorialIndex }
            : { page: 'core', selected: this.stageIndex },
      ),
      { kind: 'quiet', name: 'back', height: 34, fontSize: '14px' },
    )

    this.scoreText = addText(this, area.marginX, area.top - 66, 'Score: 0', {
      fontFamily: visual.type.family,
      fontSize: '20px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    }).setName('score')

    const multiplierBlock = this.add
      .container(GAME_WIDTH / 2, area.top - 66)
      .setName('multiplier-block')
    this.multiplierText = addText(this, 0, 8, '×1', {
      fontFamily: visual.type.family,
      fontSize: '20px',
      fontStyle: 'bold',
      color: ink(visual.colors.accent),
    }).setOrigin(0.5)
    this.chainRing = this.addChainRing(multiplierBlock, 8, 25)
    multiplierBlock.add(this.multiplierText)

    this.movesText = addText(this, GAME_WIDTH - area.marginX, area.top - 51, '', {
      fontFamily: visual.type.family,
      fontSize: '20px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    }).setOrigin(1, 0).setName('moves')

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

  /** Bottom tool tray. Free Move follows the supplied stacked-card reference. */
  private buildToolTray(): void {
    const visual = resolveVisualProfile()
    const size = Math.min(82, Math.max(66, GAME_HEIGHT * 0.1))
    const tray = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT - size / 2 - 10)
      .setName('tool-tray')
      .setDepth(18)
    const button = this.add
      .container(0, 0)
      .setName('tool-freeMove')
      .setSize(size, size)
      .setInteractive({ useHandCursor: true })
    const activeFrame = this.add.graphics().setName('tool-active-frame')
    const art = this.add
      .image(0, 0, 'tool-freeMove')
      .setDisplaySize(size * 1.08, size * 1.08)
      .setName('tool-art')
    const count = addText(this, size * 0.37, -size * 0.39, `${this.tools.freeMove}`, {
      fontFamily: visual.type.family,
      fontSize: `${Math.round(size * 0.25)}px`,
      fontStyle: 'bold',
      color: ink(0x17150d),
    }).setOrigin(0.5).setName('tool-count')
    button.add([activeFrame, art, count])
    tray.add(button)
    this.toolTray = tray

    const paint = (): void => {
      const active = this.activeTool === 'freeMove'
      const available = this.tools.freeMove > 0
      activeFrame.clear()
      if (active) {
        activeFrame.lineStyle(5, visual.colors.focus, 1)
        activeFrame.strokePoints([
          new Phaser.Math.Vector2(-size * 0.43, -size * 0.41),
          new Phaser.Math.Vector2(size * 0.36, -size * 0.39),
          new Phaser.Math.Vector2(size * 0.35, size * 0.4),
          new Phaser.Math.Vector2(-size * 0.44, size * 0.37),
        ], true)
      }
      count.setText(`${this.tools.freeMove}`)
      button.setAlpha(available ? 1 : 0.6)
      button.setScale(active ? 1.06 : 1)
      button.setData('active', active)
      button.setData('remaining', this.tools.freeMove)
    }
    button.on('pointerup', () => {
      if (this.resolving || this.paused || this.tools.freeMove <= 0) return
      this.activeTool = this.activeTool === 'freeMove' ? null : 'freeMove'
      paint()
    })
    button.setData('repaint', paint)
    paint()
  }

  private repaintTools(): void {
    const button = this.toolTray?.getByName('tool-freeMove') as Phaser.GameObjects.Container | null
    const repaint = button?.getData('repaint') as (() => void) | undefined
    repaint?.()
  }

  private buildTutorialPresentation(): void {
    const tutorial = TUTORIALS[this.tutorialIndex!]
    const visual = resolveVisualProfile()
    const area = boardArea()
    ;(this.movesText.parentContainer ?? this.movesText).setVisible(false)
    ;(this.scoreText.parentContainer ?? this.scoreText).setVisible(tutorial.showScore)
    this.chainRing.parentContainer?.setVisible(tutorial.showChain)
    ;(this.children.getByName('target-block') as Phaser.GameObjects.Container | null)?.setVisible(false)
    ;(this.children.getByName('progress-meter') as Phaser.GameObjects.Rectangle | null)?.setVisible(false)
    this.targetFill.setVisible(false)
    this.hintText.setVisible(false)

    addText(this, GAME_WIDTH / 2, area.top - 96, tutorial.name.toUpperCase(), {
      fontFamily: visual.type.family,
      fontSize: '17px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
      align: 'center',
    })
      .setOrigin(0.5)
      .setDepth(32)
      .setName('tutorial-concept')

    const instruction = addText(
      this,
      GAME_WIDTH / 2,
      area.top - 20,
      tutorial.instruction,
      {
        fontFamily: visual.type.family,
        fontSize: '17px',
        fontStyle: 'bold',
        color: ink(visual.colors.primaryInk),
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 150 },
      },
    )
      .setOrigin(0.5, 1)
      .setDepth(32)
      .setName('tutorial-instruction')
      .setInteractive({ useHandCursor: true })
    instruction.on('pointerup', () => this.showTutorialMove())
    this.openTutorialExplanation()
  }

  private openTutorialExplanation(pageIndex = 0): void {
    const tutorial = TUTORIALS[this.tutorialIndex!]
    const page = tutorial.explanation[pageIndex]
    const visual = resolveVisualProfile()
    const width = Math.min(GAME_WIDTH - 32, 520)
    const height = Math.min(GAME_HEIGHT - 40, 560)
    this.paused = true

    const panel = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setName('tutorial-explanation-dialog')
      .setDepth(100)
    const blocker = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050706, 0.82)
      .setInteractive()
    const plate = addSurface(this, 0, 0, width, height, 'tutorial-explanation-panel', true)
    const kicker = addText(this, -width / 2 + 26, -height / 2 + 24, `TUTORIAL ${String(this.tutorialIndex! + 1).padStart(2, '0')}`, {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(visual.colors.secondaryInk),
    })
    const title = addText(this, -width / 2 + 26, -height / 2 + 50, tutorial.name.toUpperCase(), {
      fontFamily: visual.type.family,
      fontSize: '28px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    })
    const screenshot = this.buildTutorialScreenshot(page.visual, width - 52, 220)
      .setPosition(0, -50)
      .setName('tutorial-explanation-screenshot')
    const copy = addText(this, 0, 91, page.text, {
      fontFamily: visual.type.family,
      fontSize: '17px',
      color: ink(visual.colors.primaryInk),
      align: 'center',
      wordWrap: { width: width - 70 },
    }).setOrigin(0.5).setName('tutorial-introduction')
    const chain = this.add.container(-width / 2 + 50, 91)
      .setName('tutorial-introduction-chain')
      .setData({ radius: 19 })
      .setVisible(tutorial.showChain)
    if (tutorial.showChain) this.paintChainRing(chain, [])

    const lastPage = pageIndex === tutorial.explanation.length - 1
    const button = addButton(this, 0, height / 2 - 48, width - 52, lastPage ? 'CONTINUE' : 'NEXT', () => {
      panel.destroy(true)
      this.pauseDialog = undefined
      if (!lastPage) {
        this.openTutorialExplanation(pageIndex + 1)
        return
      }
      this.paused = false
      this.showTutorialMove()
    }, {
      kind: 'primary',
      name: 'tutorial-explanation-continue',
      height: 58,
      fontSize: '20px',
    })
    panel.add([blocker, plate, kicker, title, screenshot, copy, chain, button])
    this.pauseDialog = panel
    panel.setAlpha(0).setScale(0.96)
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: visual.motion.standard,
      ease: 'Back.easeOut',
    })
  }

  private buildTutorialScreenshot(kind: TutorialVisual, width: number, height: number): Phaser.GameObjects.Container {
    const visual = resolveVisualProfile()
    const frame = this.add.container()
    const background = this.add.graphics()
    background.fillStyle(0x111513, 0.94)
    background.fillRect(-width / 2, -height / 2, width, height)
    background.lineStyle(2, visual.colors.secondaryInk, 0.55)
    background.strokeRect(-width / 2, -height / 2, width, height)
    frame.add(background)

    const colours: ColorId[] =
      kind === 'match' ? ['red', 'red', 'red']
        : kind === 'mix' ? ['red', 'yellow', 'orange']
          : ['orange', 'green', 'purple']
    const filled = kind === 'chain' || kind === 'chain-breaker' ? 2 : colours.length
    const dotRadius = Math.min(25, width / 12)
    colours.forEach((colour, index) => {
      const x = (index - 1) * (dotRadius * 2.8)
      const dot = this.add.circle(x, 12, dotRadius, themedDye(activeTheme(), colour).value)
      dot.setAlpha(index < filled ? 1 : 0.22)
      frame.add(dot)
    })
    const caption = addText(this, 0, -height / 2 + 24, kind.includes('breaker') ? 'CHAIN → SWAP' : 'IN PLAY', {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(0.5)
    frame.add(caption)
    return frame
  }

  private showTutorialMove(): void {
    this.cancelTutorialDemo()
    const wanted = this.tutorialWantsSwap() ? 'swap' : 'merge'
    for (let from = 0; from < this.cells.length; from++) {
      if (!this.cells[from]) continue
      for (let to = 0; to < this.cells.length; to++) {
        if (!this.cells[to] || !isAdjacent(this.grid, from, to)) continue
        if (resolveMove(this.grid, this.cells, this.mix, from, to).kind !== wanted) continue
        this.scheduleTutorialMoveDemo({ from, to, kind: wanted })
        return
      }
    }
  }

  /**
   * Repeatedly demonstrate the exact move the current lesson expects. Both
   * variants borrow the real interaction motion: swaps use the paired travel,
   * while mixes use the lifted, deforming pointer chase. Neither touches the
   * board model, so every demonstration returns to the authored starting state.
   */
  private scheduleTutorialMoveDemo(move: TutorialMoveDemo, delay = 450): void {
    const generation = this.tutorialDemoGeneration
    this.tutorialDemoTimer = this.time.delayedCall(delay, () => {
      void this.playTutorialMoveDemo(move, generation)
    })
  }

  private async playTutorialMoveDemo(
    move: TutorialMoveDemo,
    generation: number,
  ): Promise<void> {
    const { from, to, kind } = move
    const tile = this.tiles[from]
    const other = this.tiles[to]
    if (
      generation !== this.tutorialDemoGeneration
      || this.resolving
      || this.outcome !== 'playing'
      || !tile
      || !other
      || tile.busy
      || other.busy
    ) return

    const a = this.cellCenter(from)
    const b = this.cellCenter(to)
    const demoTile = new Tile(
      this,
      a.x,
      a.y,
      tile.dye,
      this.shape,
      from,
      this.tileSize,
    ).disableInteractive().setData('tutorialDemo', 'from').setDepth(30)
    const demoOther = new Tile(
      this,
      b.x,
      b.y,
      other.dye,
      this.shape,
      to,
      this.tileSize,
    ).disableInteractive().setData('tutorialDemo', 'to').setDepth(29)
    this.tutorialDemoGhosts = [demoTile, demoOther]
    this.tutorialDemoOriginals = [tile, other]
    tile.setAlpha(0.22)
    other.setAlpha(0.22)

    if (kind === 'swap') {
      await Promise.all([
        new Promise<void>((done) => demoTile.swapTo(b.x, b.y, to, 'active', done)),
        new Promise<void>((done) => demoOther.swapTo(a.x, a.y, from, 'passive', done)),
      ])
      await new Promise<void>((done) => this.time.delayedCall(180, done))
      await Promise.all([
        new Promise<void>((done) => demoTile.swapTo(a.x, a.y, from, 'active', done)),
        new Promise<void>((done) => demoOther.swapTo(b.x, b.y, to, 'passive', done)),
      ])
    } else {
      demoTile.pickUp()
      this.tutorialDemoDragged = demoTile
      demoTile.setDragTarget(b.x, b.y)
      await new Promise<void>((done) => this.time.delayedCall(420, done))
      if (generation !== this.tutorialDemoGeneration) return
      this.tutorialDemoDragged = undefined
      demoOther.squish()
      await new Promise<void>((done) => demoTile.drop(a.x, a.y, from, done))
    }

    if (generation === this.tutorialDemoGeneration) {
      this.clearTutorialDemoVisuals()
      this.scheduleTutorialMoveDemo(move, 1_200)
    }
  }

  private clearTutorialDemoVisuals(): void {
    for (const tile of this.tutorialDemoOriginals) tile.setAlpha(1)
    for (const ghost of this.tutorialDemoGhosts) ghost.destroy(true)
    this.tutorialDemoOriginals = []
    this.tutorialDemoGhosts = []
    this.tutorialDemoDragged = undefined
  }

  private cancelTutorialDemo(): void {
    this.tutorialDemoGeneration++
    this.tutorialDemoTimer?.remove(false)
    this.tutorialDemoTimer = undefined
    this.clearTutorialDemoVisuals()
  }

  private tutorialWantsSwap(): boolean {
    if (this.tutorialIndex === undefined) return false
    const goal = TUTORIALS[this.tutorialIndex].goal
    if (goal === 'swap') return true
    if (goal === 'chain-breaker') return this.colorChain.results.length >= 2
    if (goal === 'rainbow-chain-breaker') return this.colorChain.multiplier >= this.maxMultiplier
    return false
  }

  private tutorialMoveAllowed(kind: 'swap' | 'merge'): boolean {
    return this.tutorialIndex === undefined || kind === (this.tutorialWantsSwap() ? 'swap' : 'merge')
  }

  private tutorialGoalMet(goal: TutorialGoal, report: MoveReport): boolean {
    // The chain as the move left it, before a swap spends it: a swap breaks
    // the chain inside `playMove`, so the live one is already back to 1.
    const multiplier = report.chainBreak?.previousMultiplier ?? this.colorChain.multiplier
    if (goal === 'swap') return report.kind === 'swap'
    if (goal === 'mix') return report.kind === 'merge'
    if (goal === 'chain') return multiplier >= 3
    if (goal === 'rainbow-chain') return multiplier >= this.maxMultiplier
    if (goal === 'chain-breaker') return report.resolution.kind === 'chain-breaker'
    return report.resolution.kind === 'rainbow-chain-breaker'
  }

  private buildSprayHud(area: ReturnType<typeof boardArea>): void {
    const visual = resolveVisualProfile()
    const hud = this.add
      .graphics()
      .setName('game-hud')
      .setData('surfaceSize', { width: GAME_WIDTH - 16, height: area.top - 12 })
    hud.setPosition(GAME_WIDTH / 2, area.top / 2 - 3)

    const pauseSize = 56
    const paperWidth = Math.max(170, GAME_WIDTH - area.marginX * 2 - pauseSize - 20)
    const paperHeight = 62
    const paper = this.add
      .container(area.marginX + paperWidth / 2, 42)
      .setName('stage-label')
      .setSize(paperWidth, paperHeight)
    const paperPlate = this.add.graphics()
    paperPlate.fillStyle(0xe8e4d9, 1)
    paperPlate.fillPoints([
      new Phaser.Math.Vector2(-paperWidth / 2 + 3, -paperHeight / 2),
      new Phaser.Math.Vector2(paperWidth / 2, -paperHeight / 2 - 2),
      new Phaser.Math.Vector2(paperWidth / 2 - 2, paperHeight / 2),
      new Phaser.Math.Vector2(-paperWidth / 2, paperHeight / 2 - 1),
    ], true)
    const stageNumber =
      this.toolStageIndex !== undefined
        ? STAGES.length + this.toolStageIndex + 1
        : this.stageIndex !== undefined
          ? this.stageIndex + 1
          : 0
    const paperKicker = addText(
      this,
      -paperWidth / 2 + 18,
      -18,
      this.tutorialIndex !== undefined
        ? `TUTORIAL ${String(this.tutorialIndex + 1).padStart(2, '0')}`
        : `STAGE ${String(stageNumber).padStart(2, '0')}`,
      {
        fontFamily: visual.type.family,
        fontSize: '11px',
        fontStyle: 'bold',
        letterSpacing: 3,
        color: ink(0x74736e),
      },
    )
    const paperText = addText(
      this,
      -paperWidth / 2 + 18,
      -2,
      (this.tutorialIndex !== undefined
        ? TUTORIALS[this.tutorialIndex].name
        : this.stage.name
      ).toUpperCase(),
      {
      fontFamily: visual.type.family,
      fontSize: GAME_WIDTH < 500 ? '22px' : '25px',
      fontStyle: 'bold',
      color: ink(0x171815),
      },
    )
    paper.add([paperPlate, paperKicker, paperText]).setAngle(-1)
    paper.setInteractive({ useHandCursor: true }).on('pointerup', () => this.toggleObjective())

    addButton(
      this,
      GAME_WIDTH - area.marginX - pauseSize / 2 - 4,
      42,
      pauseSize,
      'Ⅱ',
      () => this.openPause(),
      { kind: 'quiet', name: 'pause', height: pauseSize, fontSize: '24px' },
    )

    const metricY = area.top - 86
    const scoreBlock = this.add.container(area.marginX, metricY).setName('score-block')
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
    }).setName('score')
    scoreBlock.add([scoreLabel, this.scoreText])

    const multiplierX = area.marginX + (GAME_WIDTH - area.marginX * 2) / 3
    const multiplierBlock = this.add.container(multiplierX, metricY).setName('multiplier-block')
    const chainY = 12
    const chainRadius = 16
    this.multiplierText = addText(this, 0, chainY, '×1', {
      fontFamily: visual.type.family,
      fontSize: '20px',
      fontStyle: 'bold',
      color: ink(visual.colors.accent),
    }).setOrigin(0.5)
    this.chainRing = this.addChainRing(multiplierBlock, chainY, chainRadius)
    multiplierBlock.add(this.multiplierText)

    const targetBlock = this.add
      .container(area.marginX + ((GAME_WIDTH - area.marginX * 2) * 2) / 3, metricY)
      .setName('target-block')
    const targetLabel = addText(this, 0, -14, 'TARGET', {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(0.5, 0)
    const targetText = addText(this, 0, -2, `${this.stage.threshold}`, {
      fontFamily: visual.type.family,
      fontSize: '30px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    }).setOrigin(0.5, 0)
    targetBlock.add([targetLabel, targetText])

    const movesBlock = this.add
      .container(GAME_WIDTH - area.marginX, metricY)
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
    }).setOrigin(1, 0).setName('moves')
    movesBlock.add([movesLabel, this.movesText])

    this.barX = area.marginX
    this.barWidth = GAME_WIDTH - area.marginX * 2
    const meter = addProgressMeter(this, this.barX, area.top - 38, this.barWidth)
    this.targetFill = meter.fill

    this.add.graphics().setName('hint-strip').setVisible(false)
      .setData('surfaceSize', { width: 0, height: 0 })
    this.hintText = addText(this, 0, 0, this.stage.hint, {
      fontFamily: visual.type.family,
      fontSize: '1px',
      color: ink(visual.colors.secondaryInk),
    }).setVisible(false)

    this.updateHud()
  }

  private toggleObjective(): void {
    if (this.paused || this.outcome !== 'playing') return
    if (this.objectivePanel) {
      this.objectivePanel.destroy(true)
      this.objectivePanel = undefined
      return
    }

    const visual = resolveVisualProfile()
    const width = GAME_WIDTH - boardArea().marginX * 2
    const panel = this.add
      .container(GAME_WIDTH / 2, boardArea().top - 5)
      .setName('objective-panel')
      .setDepth(20)
    const plate = this.add.graphics()
    plate.fillStyle(0xe8e4d9, 1)
    plate.fillRect(-width / 2, -42, width, 84)
    const kicker = addText(this, -width / 2 + 18, -28, 'OBJECTIVE', {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(0x74736e),
    })
    const copy = addText(this, -width / 2 + 18, -6, this.stage.hint, {
      fontFamily: visual.type.family,
      fontSize: GAME_WIDTH < 500 ? '15px' : '17px',
      fontStyle: 'bold',
      color: ink(0x171815),
      wordWrap: { width: width - 36 },
    })
    panel.add([plate, kicker, copy]).setAlpha(0).setScale(0.98)
    this.objectivePanel = panel
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: visual.motion.standard,
      ease: 'Quad.easeOut',
    })
  }

  private openPause(): void {
    if (this.paused || this.outcome !== 'playing') return
    this.paused = true
    const visual = resolveVisualProfile()
    const width = Math.min(GAME_WIDTH - 48, 520)
    const height = 550
    const panel = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setName('pause-dialog')
      .setDepth(100)
    const blocker = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050706, 0.82)
      .setInteractive()
    const plate = this.add.graphics()
    plate.fillStyle(visual.colors.surface, 1)
    plate.lineStyle(2, visual.colors.secondaryInk, 0.62)
    plate.fillRect(-width / 2, -height / 2, width, height)
    plate.strokeRect(-width / 2, -height / 2, width, height)
    plate.lineStyle(1, visual.colors.secondaryInk, 0.24)
    plate.lineBetween(-width / 2, -height / 2 + 78, width / 2, -height / 2 + 78)
    const title = addText(this, -width / 2 + 28, -height / 2 + 30, 'PAUSED', {
      fontFamily: visual.type.family,
      fontSize: '30px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    })
    const stage = addText(
      this,
      width / 2 - 28,
      -height / 2 + 42,
      `STAGE ${String((this.stageIndex ?? -1) + 1).padStart(2, '0')}`,
      {
        fontFamily: visual.type.family,
        fontSize: '11px',
        fontStyle: 'bold',
        letterSpacing: 3,
        color: ink(visual.colors.secondaryInk),
      },
    ).setOrigin(1, 0)
    panel.add([blocker, plate, title, stage])

    const buttonWidth = width - 56
    const actions = [
      { label: 'RESUME', name: 'resume', kind: 'primary' as const, action: () => this.closePause() },
      { label: 'HELP', name: 'pause-help', kind: 'secondary' as const, action: () => this.openMixHelp() },
      {
        label: 'SELECT STAGE',
        name: 'pause-stage-select',
        kind: 'secondary' as const,
        action: () => this.fadeTo('StageSelect', { page: 'modes' }),
      },
      { label: 'SETTINGS', name: 'pause-settings', kind: 'secondary' as const, action: () => this.fadeTo('Settings') },
      { label: 'MAIN MENU', name: 'pause-menu', kind: 'secondary' as const, action: () => this.fadeTo('Menu') },
    ]
    actions.forEach((action, index) => {
      const button = addButton(this, 0, -145 + index * 76, buttonWidth, action.label, action.action, {
        kind: action.kind,
        name: action.name,
        height: 56,
        fontSize: '20px',
      })
      panel.add(button)
    })
    panel.setAlpha(0).setScale(0.96)
    this.pauseDialog = panel
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: visual.motion.standard,
      ease: 'Back.easeOut',
    })
  }

  private openMixHelp(): void {
    this.pauseDialog?.destroy(true)
    const visual = resolveVisualProfile()
    const theme = activeTheme()
    const mixes = stageMixes(this.stage)
    const width = Math.min(GAME_WIDTH - 32, 570)
    const rowHeight = 68
    const height = Math.min(GAME_HEIGHT - 28, 188 + Math.max(1, mixes.length) * rowHeight)
    const panel = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setName('mix-help')
      .setData('mixes', mixes)
      .setDepth(100)
    const blocker = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050706, 0.86)
      .setInteractive()
    const plate = this.add.graphics()
    plate.fillStyle(visual.colors.surface, 1)
    plate.lineStyle(2, visual.colors.accent, 0.72)
    plate.fillRect(-width / 2, -height / 2, width, height)
    plate.strokeRect(-width / 2, -height / 2, width, height)
    plate.lineStyle(1, visual.colors.secondaryInk, 0.24)
    plate.lineBetween(-width / 2, -height / 2 + 72, width / 2, -height / 2 + 72)
    const title = addText(this, -width / 2 + 26, -height / 2 + 25, 'MIX HELP', {
      fontFamily: visual.type.family,
      fontSize: '28px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: ink(visual.colors.primaryInk),
    })
    const subtitle = addText(this, width / 2 - 26, -height / 2 + 34, this.stage.name.toUpperCase(), {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(1, 0)
    panel.add([blocker, plate, title, subtitle])

    if (mixes.length === 0) {
      panel.add(
        addText(this, 0, -10, 'NO MIXES IN THIS STAGE', {
          fontFamily: visual.type.family,
          fontSize: '17px',
          fontStyle: 'bold',
          letterSpacing: 2,
          color: ink(visual.colors.secondaryInk),
        }).setOrigin(0.5),
      )
    } else {
      const startY = -height / 2 + 104
      mixes.forEach(({ result, ingredients }, index) => {
        const y = startY + index * rowHeight
        const [left, right] = ingredients
        const tileSize = Math.min(48, rowHeight * 0.72)
        const colors = [left, right, result] as const
        const positions = [-125, -55, 105]
        const tiles = colors.map((color, tileIndex) => {
          const tile = new Tile(
            this,
            positions[tileIndex],
            y,
            themedDye(theme, color),
            this.shape,
            index * 3 + tileIndex,
            tileSize,
          )
            .setName('help-mix-tile')
            .setData('recipe', index)
            .setData('role', tileIndex === 2 ? 'result' : 'ingredient')
            .setData('color', color)
            .disableInteractive()
          return tile
        })
        const plus = addText(this, -90, y, '+', {
          fontFamily: visual.type.family,
          fontSize: '24px',
          fontStyle: 'bold',
          color: ink(visual.colors.secondaryInk),
        }).setOrigin(0.5)
        const equals = addText(this, 25, y, '=', {
          fontFamily: visual.type.family,
          fontSize: '24px',
          fontStyle: 'bold',
          color: ink(visual.colors.secondaryInk),
        }).setOrigin(0.5)
        panel.add([...tiles, plus, equals])
      })
    }

    const back = addButton(this, 0, height / 2 - 35, width - 52, '‹  BACK', () => {
      panel.destroy(true)
      this.pauseDialog = undefined
      this.paused = false
      this.openPause()
    }, { kind: 'quiet', name: 'help-back', height: 50, fontSize: '18px' })
    panel.add(back)
    panel.setAlpha(0).setScale(0.97)
    this.pauseDialog = panel
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: visual.motion.standard,
      ease: 'Back.easeOut',
    })
  }

  private closePause(): void {
    if (!this.pauseDialog) return
    this.pauseDialog.destroy(true)
    this.pauseDialog = undefined
    this.paused = false
  }

  /**
   * Stage 10's finish line is a fork rather than a hard stop. The modal uses
   * the pause panel's paper, rule and button language so the interruption
   * feels like part of the same game shell.
   */
  private openEndlessChoice(): void {
    this.paused = true
    const visual = resolveVisualProfile()
    const width = Math.min(GAME_WIDTH - 48, 520)
    const height = 350
    const panel = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setName('endless-dialog')
      .setDepth(100)
    const blocker = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050706, 0.82)
      .setInteractive()
    const plate = this.add.graphics()
    plate.fillStyle(visual.colors.surface, 1)
    plate.lineStyle(2, visual.colors.secondaryInk, 0.62)
    plate.fillRect(-width / 2, -height / 2, width, height)
    plate.strokeRect(-width / 2, -height / 2, width, height)
    plate.lineStyle(1, visual.colors.secondaryInk, 0.24)
    plate.lineBetween(-width / 2, -height / 2 + 78, width / 2, -height / 2 + 78)
    const title = addText(this, -width / 2 + 28, -height / 2 + 30, 'KEEP PAINTING?', {
      fontFamily: visual.type.family,
      fontSize: '30px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
    })
    const stage = addText(this, width / 2 - 28, -height / 2 + 42, 'TARGET REACHED', {
      fontFamily: visual.type.family,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 3,
      color: ink(visual.colors.secondaryInk),
    }).setOrigin(1, 0)
    const copy = addText(
      this,
      0,
      -45,
      'Continue this board with unlimited moves?',
      {
        fontFamily: visual.type.family,
        fontSize: '18px',
        color: ink(visual.colors.secondaryInk),
        align: 'center',
        wordWrap: { width: width - 72 },
      },
    ).setOrigin(0.5)

    const continueButton = addButton(
      this,
      0,
      35,
      width - 56,
      'CONTINUE ENDLESSLY',
      () => void this.continueEndless(panel),
      { kind: 'primary', name: 'continue-endless', height: 62, fontSize: '21px' },
    )
    const finishButton = addButton(
      this,
      0,
      112,
      width - 56,
      'FINISH STAGE',
      () => {
        panel.destroy(true)
        this.pauseDialog = undefined
        this.paused = false
        void this.win()
      },
      { kind: 'secondary', name: 'finish-stage', height: 58, fontSize: '20px' },
    )
    panel.add([blocker, plate, title, stage, copy, continueButton, finishButton])
    panel.setAlpha(0).setScale(0.96)
    this.pauseDialog = panel
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: visual.motion.standard,
      ease: 'Back.easeOut',
    })
  }

  private async continueEndless(panel: Phaser.GameObjects.Container): Promise<void> {
    recordWin(STAGES.length - 1)
    this.round.endless = true
    panel.destroy(true)
    this.pauseDialog = undefined
    this.paused = false
    this.updateHud()
    // Endless has no threshold and no budget, so settling can only revive a
    // board the abandoned win condition left dead.
    const { reshuffled } = settleRound(this.round)
    if (reshuffled) await this.animateReshuffle(reshuffled)
    this.resolving = false
  }

  /**
   * Fit the stage's mask into the reserved board area: the pitch shrinks
   * until the grid fits, and small boards get full-size tiles rather than
   * ballooning to fill the space.
   */
  private layoutBoard(): void {
    const area = boardArea(Boolean(this.stage.tools))
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
    if (!(obj instanceof Tile) || this.resolving || this.paused) return
    if (this.tutorialIndex !== undefined) this.cancelTutorialDemo()
    if (obj.busy) return
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
      (this.activeTool !== 'freeMove' && !isAdjacent(this.grid, origin, cell)) ||
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
    const allowDistant = this.activeTool === 'freeMove'
    // Asked before playing, because both the refusal and the tutorial's veto
    // have to happen without spending a move. `resolveMove` is a dry run —
    // it decides on copies — so asking twice costs only the asking.
    const move = resolveMove(this.grid, this.cells, this.mix, origin, cell, { allowDistant })

    if (move.kind === 'illegal') {
      // A real attempt the rules refuse: both tiles say no, so the legality
      // rule teaches itself.
      playSfx('illegal')
      tile.refuse(home.x, home.y, origin)
      other.reject()
      return
    }

    if (!this.tutorialMoveAllowed(move.kind)) {
      playSfx('illegal')
      tile.refuse(home.x, home.y, origin)
      other.reject()
      this.time.delayedCall(420, () => this.scene.restart({ tutorial: this.tutorialIndex }))
      return
    }

    this.resolving = true
    if (this.activeTool === 'freeMove') {
      this.tools.freeMove--
      this.activeTool = null
      this.repaintTools()
    }

    // The move is played out in full here — cells dyed or swapped, cascade
    // resolved to a standstill, budget spent — and comes back as a recording.
    // Everything below is the replay.
    const report = playMove(this.round, origin, cell, { allowDistant })!
    // A merge's chain has already climbed and a swap's has already broken, so
    // the replay carries the multiplier the move was actually worth.
    this.shown.resolution = report.resolution
    if (!report.chainBreak) this.shown.chain = this.colorChain
    this.showMoveSpent()

    if (report.kind === 'merge') {
      // Both tiles stay on their cells and come out dyed the result colour;
      // the dragged one glides home while the pair pulses. The pulse hands
      // off into the destruction, so mix → burst reads as cause and effect.
      playSfx('merge')
      this.animateMultiplier(report.previousMultiplier)
      // The combo prototype: the fresh colour absorbs adjacent groups of its
      // own ingredients. It already happened in the model; the animation
      // replays it as a travelling wave between the pulse and the burst.
      const dye = themedDye(activeTheme(), report.result!)
      void Promise.all([
        new Promise<void>((done) => tile.mergeReturn(home.x, home.y, origin, dye, done)),
        new Promise<void>((done) => other.mix(dye, done)),
      ])
        .then(() => this.animateCombo(report.conversions))
        .then(() => this.resolve(report))
      return
    }

    this.animateChainBreaker(report.previousMultiplier)
    this.tiles[origin] = other
    this.tiles[cell] = tile
    const target = this.cellCenter(cell)
    void Promise.all([
      new Promise<void>((done) => tile.swapTo(target.x, target.y, cell, 'active', done)),
      new Promise<void>((done) => other.swapTo(home.x, home.y, origin, 'passive', done)),
    ]).then(() => this.resolve(report))
  }

  /**
   * Play the move's recording back: clear, fall, refill, wave after wave, with
   * the score climbing a wave at a time even though the model reached the
   * total before the first tile moved. Ends by settling the stage's fate —
   * threshold reached wins, an exhausted budget loses, and anything else
   * revives a dead board if it must and hands input back.
   */
  private async resolve(report: MoveReport): Promise<void> {
    this.resolving = true

    for (const [wave, { matched, points, falls, spawns }] of report.waves.entries()) {
      this.shown.score += points
      // Cascades still climb in pitch, but no longer grow the score multiplier.
      playSfx('match', wave + 1)
      this.floatScore(points, report.resolution, matched)
      this.updateHud(report.resolution.multiplier)
      if (wave === report.thresholdWave) this.celebrateThreshold()
      await Promise.all(
        matched.map(
          (index) =>
            new Promise<void>((done) => {
              const tile = this.tiles[index]
              this.tiles[index] = undefined
              tile ? tile.clearOut(0, done) : done()
            }),
        ),
      )

      await this.animateDescent(falls, spawns)
    }

    // Asked before the chain break is revealed, because that is when it was
    // asked when the scene owned the loop — a `chain` goal reads the
    // multiplier the move was worth, not the one it left behind.
    const tutorialComplete =
      this.tutorialIndex !== undefined &&
      this.tutorialGoalMet(TUTORIALS[this.tutorialIndex].goal, report)

    if (report.chainBreak) {
      this.shown.chain = this.colorChain
      this.shown.resolution = this.scoreResolution
      this.animateMultiplier(report.chainBreak.previousMultiplier)
    }

    if (tutorialComplete) {
      this.completeTutorial()
      return
    }

    // The last stage offers unlimited play rather than a win screen, and the
    // offer stands while the round is still officially being played — so ask
    // before settling commits the win.
    if (isWon(this.round) && this.stageIndex === STAGES.length - 1) {
      this.openEndlessChoice()
      return
    }

    // The stage frame gets its say only now: a tutorial that has just been
    // cleared returns above, and settling would draw from `rng` for a
    // reshuffle nobody will see.
    const { reshuffled, outcome } = settleRound(this.round)

    if (outcome === 'won') {
      await this.win()
      return
    }

    if (reshuffled) await this.animateReshuffle(reshuffled)

    if (outcome === 'lost') {
      this.lose()
      return
    }
    this.resolving = false
    if (this.tutorialIndex !== undefined) this.showTutorialMove()
  }

  private completeTutorial(): void {
    this.cancelTutorialDemo()
    const index = this.tutorialIndex!
    const tutorial = TUTORIALS[index]
    const final = index === TUTORIALS.length - 1
    this.round.outcome = 'won'
    recordTutorialClear(index)
    playSfx('win')
    this.buildOverlay(
      final ? 'Tutorials cleared!' : `${tutorial.term} cleared!`,
      [final ? 'You successfully cleared all tutorials.' : tutorial.success],
      final
        ? [{
            label: 'Back to stages',
            name: 'back-to-stages',
            primary: true,
            action: () => this.fadeTo('StageSelect', { page: 'tutorial', selected: index }),
          }]
        : [
            {
              label: 'Next tutorial',
              name: 'next-tutorial',
              primary: true,
              action: () => this.fadeTo('Game', { tutorial: index + 1 }),
            },
            {
              label: 'Back to stages',
              name: 'back-to-stages',
              action: () => this.fadeTo('StageSelect', { page: 'tutorial', selected: index }),
            },
          ],
    )
  }

  /** The budget has already gone down in `playMove`; the last few say so loudly. */
  private showMoveSpent(): void {
    if (this.endless) return
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
   * counter chases `score`, and the threshold bar rides along. Higher
   * player-built multipliers give the score text a stronger pulse.
   */
  private updateHud(scoreMultiplier = 0): void {
    const visual = resolveVisualProfile()
    this.movesText
      .setText(
        this.endless
          ? this.sprayHud ? '∞' : 'Moves: ∞'
          : this.sprayHud ? `${this.movesLeft}` : `Moves: ${this.movesLeft}`,
      )
      .setColor(ink(
        this.endless
          ? visual.colors.primaryInk
          : this.movesLeft <= 1
          ? visual.colors.critical
          : this.movesLeft <= LOW_MOVES
            ? visual.colors.warning
            : visual.colors.primaryInk,
      ))
    const atMax = this.maxMultiplier > 1 && this.shown.chain.multiplier >= this.maxMultiplier
    const reacting = this.shown.resolution.kind !== 'normal'
    const multiplierSize = 20
    this.multiplierText
      .setFontSize(reacting ? (this.sprayHud ? 10 : 11) : multiplierSize)
      .setColor(ink(
        atMax || this.shown.resolution.rainbow
          ? visual.colors.primaryInk
          : visual.colors.accent,
      ))
      .setText(
        reacting
        ? this.shown.resolution.kind === 'rainbow-chain-breaker'
          ? `RAINBOW CHAIN BREAKER ×${this.shown.resolution.multiplier}`
          : `CHAIN BREAKER ×${this.shown.resolution.multiplier}`
        : `×${this.shown.chain.multiplier}`,
      )
    this.renderChainRing(atMax || this.shown.resolution.rainbow)

    this.scoreTween?.remove()
    const from = this.displayScore
    const to = this.shown.score
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

    if (scoreMultiplier > 1) {
      this.scoreText.setScale(1)
      this.tweens.chain({
        targets: this.scoreText,
        tweens: [
          {
            scale: Math.min(1.48, 1.08 + scoreMultiplier * 0.08),
            duration: 110,
            ease: 'Quad.easeOut',
          },
          { scale: 1, duration: 240, ease: 'Back.easeOut' },
        ],
      })
    }
  }

  private animateMultiplier(previous: number): void {
    this.updateHud()
    const next = this.colorChain.multiplier
    this.multiplierText.setScale(1)
    this.multiplierText.setAlpha(1)
    this.tweens.chain({
      targets: this.multiplierText,
      tweens: [
        {
          scale: next > previous ? Math.min(1.5, 1.15 + next * 0.08) : next < previous ? 0.82 : 1.12,
          alpha: next < previous ? 0.55 : 1,
          duration: 110,
          ease: 'Quad.easeOut',
        },
        { scale: 1, alpha: 1, duration: 230, ease: 'Back.easeOut' },
      ],
    })
  }

  private animateChainBreaker(previous: number): void {
    this.updateHud()
    const rainbowBreaker = this.scoreResolution.kind === 'rainbow-chain-breaker'
    this.multiplierText.setScale(1)
    this.tweens.chain({
      targets: this.multiplierText,
      tweens: [
        {
          scale: rainbowBreaker ? 1.5 : previous > 1 ? 1.32 : 1.08,
          duration: 150,
          ease: 'Back.easeOut',
        },
        { scale: 1, duration: 260, ease: 'Back.easeOut' },
      ],
    })

    if (previous <= 1) return
    const bounds = this.multiplierText.getBounds()
    const ribbonColors = rainbowBreaker
      ? [0xef476f, 0xffd166, 0x06d6a0]
      : [0xef476f, 0x118ab2]
    for (const [index, color] of ribbonColors.entries()) {
      const ribbon = this.add
        .rectangle(
          bounds.centerX + (index - (ribbonColors.length - 1) / 2) * 9,
          bounds.bottom + 5,
          5,
          38,
          color,
          0.9,
        )
        .setName('chain-breaker-ribbon')
        .setDepth(29)
        .setOrigin(0.5, 0)
        .setAngle((index - (ribbonColors.length - 1) / 2) * 12)
      this.tweens.add({
        targets: ribbon,
        y: this.originY + this.tileSize,
        scaleY: rainbowBreaker ? 2.1 : 1.5,
        alpha: 0,
        duration: rainbowBreaker ? 520 : 420,
        delay: index * 45,
        ease: 'Cubic.easeIn',
        onComplete: () => ribbon.destroy(),
      })
    }

    if (rainbowBreaker) {
      const edge = this.add.graphics().setName('rainbow-chain-breaker-flash').setDepth(28)
      edge.lineStyle(5, 0xffffff, 0.8)
      edge.strokeRoundedRect(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16, 16)
      this.tweens.add({
        targets: edge,
        alpha: 0,
        duration: 580,
        ease: 'Quad.easeOut',
        onComplete: () => edge.destroy(),
      })
    }
  }

  private addChainRing(
    parent: Phaser.GameObjects.Container,
    y: number,
    radius: number,
  ): Phaser.GameObjects.Container {
    const ring = this.add
      .container(0, y)
      .setName('chain-ring')
      .setData({ radius })
    parent.add(ring)
    return ring
  }

  private renderChainRing(complete: boolean): void {
    const becameComplete = complete && !this.chainComplete
    this.chainComplete = complete
    this.paintChainRing(this.chainRing, this.colorChain.results, complete)

    if (becameComplete) {
      this.tweens.killTweensOf(this.chainRing)
      this.chainRing.setScale(1).setAngle(-6)
      this.tweens.chain({
        targets: this.chainRing,
        tweens: [
          { scale: 1.14, angle: 4, duration: 110, ease: 'Back.easeOut' },
          { scale: 1, angle: 0, duration: 230, ease: 'Back.easeOut' },
        ],
      })
    }
  }

  private paintChainRing(
    ring: Phaser.GameObjects.Container,
    filledResults: readonly ColorId[],
    complete = false,
  ): void {
    const mixes = stageMixes(this.stage)
    const radius = ring.getData('radius') as number
    ring.removeAll(true)
    ring.setData({
      radius,
      colors: mixes.map(({ result }) => result),
      complete,
    })
    if (mixes.length === 0) return

    const step = (Math.PI * 2) / mixes.length
    const gap = Math.min(0.18, step * 0.12)
    const rimWidth = Math.max(4, radius * 0.16)
    const fillWidth = radius * 0.46

    for (const [index, { result }] of mixes.entries()) {
      const color = themedDye(activeTheme(), result).value
      const filled = filledResults.includes(result)
      const start = -Math.PI / 2 + index * step + gap / 2
      const end = -Math.PI / 2 + (index + 1) * step - gap / 2
      const width = filled ? fillWidth : rimWidth
      const arcRadius = radius - (width - rimWidth) / 2

      const segment = this.add
        .graphics()
        .setName('chain-segment')
        .setData({ color: result, filled })
      segment.lineStyle(width, color, 1)
      segment.beginPath()
      segment.arc(0, 0, arcRadius, start, end)
      segment.strokePath()
      ring.add(segment)
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

  /** Floating "+N" over the clear — bigger and hotter at higher multipliers. */
  private floatScore(
    points: number,
    resolution: ScoreResolution,
    matched: readonly number[],
  ): void {
    const visual = resolveVisualProfile()
    const multiplier = resolution.multiplier
    let sx = 0
    let sy = 0
    for (const index of matched) {
      const { x, y } = this.cellCenter(index)
      sx += x
      sy += y
    }
    const x = sx / matched.length
    const y = sy / matched.length

    const label = `+${points} ×${multiplier}`
    const scoreFloat = this.add.container(x, y).setDepth(30)
    if (resolution.rainbow) {
      const rainbow = [
        { x: -3, color: 0xef476f },
        { x: 0, color: 0x06d6a0 },
        { x: 3, color: 0x118ab2 },
      ]
      scoreFloat.add(
        rainbow.map(({ x: offset, color }) =>
          addText(this, offset, 0, label, {
            fontFamily: visual.type.family,
            fontSize: `${Math.min(38, 18 + (multiplier - 1) * 6)}px`,
            fontStyle: 'bold',
            color: ink(color),
          }).setOrigin(0.5),
        ),
      )
    }
    const text = addText(this, 0, 0, label, {
      fontFamily: visual.type.family,
      fontSize: `${Math.min(38, 18 + (multiplier - 1) * 6)}px`,
      fontStyle: 'bold',
      color: ink(
        resolution.rainbow
          ? visual.colors.primaryInk
          : multiplier > 1
            ? visual.colors.accent
            : visual.colors.primaryInk,
      ),
    })
      .setOrigin(0.5)
    scoreFloat.add(text).setAlpha(0)

    this.tweens.chain({
      targets: scoreFloat,
      tweens: [
        { alpha: 1, y: y - 16, duration: 130, ease: 'Quad.easeOut' },
        { alpha: 0, y: y - 54, duration: 520, ease: 'Quad.easeIn' },
      ],
      onComplete: () => scoreFloat.destroy(true),
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
    this.round.outcome = 'won'
    playSfx('win')
    const opened = this.toolStageIndex !== undefined
      ? recordToolClear(this.toolStageIndex)
      : this.stageIndex !== undefined && recordWin(this.stageIndex)

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

    const next =
      this.toolStageIndex !== undefined
        ? this.toolStageIndex + 1
        : this.stageIndex !== undefined
          ? this.stageIndex + 1
          : undefined
    const hasNext =
      next !== undefined &&
      (this.toolStageIndex !== undefined ? next < TOOL_STAGES.length : next < STAGES.length)
    const [tally] = this.buildOverlay('Stage clear!', ['Score: 0'], [
      hasNext
        ? {
            label: 'Next stage',
            name: 'next',
            primary: true,
            action: () => this.fadeTo(
              'Game',
              this.toolStageIndex !== undefined ? { toolStage: next } : { stage: next },
            ),
          }
        : {
            label: 'Replay',
            name: 'retry',
            primary: true,
            action: () => this.fadeTo('Game', this.currentStartData()),
          },
      {
        label: 'Stages',
        name: 'stages',
        action: () => this.fadeTo(
          'StageSelect',
          this.toolStageIndex !== undefined
            ? { page: 'tools', selected: next }
            : { page: 'core', selected: opened ? next : this.stageIndex },
        ),
      },
    ])

    this.tweens.addCounter({
      from: 0,
      to: this.round.score,
      duration: 700,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => tally.setText(`Score: ${Math.round(tween.getValue() ?? 0)}`),
      onComplete: () => tally.setText(`Score: ${this.round.score}`),
    })
  }

  /**
   * Out of moves. Kind but deflating: the board dims rather than explodes,
   * and the overlay states the distance without rubbing it in. Retries are
   * free by design.
   */
  private lose(): void {
    const visual = resolveVisualProfile()
    this.round.outcome = 'lost'
    playSfx('lose')

    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, visual.colors.surfaceStrong)
      .setDepth(40)
      .setAlpha(0)
    this.tweens.add({ targets: dim, alpha: 0.55, duration: 450, ease: 'Quad.easeOut' })

    this.buildOverlay(
      'Out of moves',
      [`Score ${this.round.score} of ${this.stage.threshold}`, 'Retries are free.'],
      [
        {
          label: 'Retry',
          name: 'retry',
          primary: true,
          action: () => this.fadeTo('Game', this.currentStartData()),
        },
        {
          label: 'Stages',
          name: 'stages',
          action: () => this.fadeTo(
            'StageSelect',
            this.toolStageIndex !== undefined
              ? { page: 'tools', selected: this.toolStageIndex }
              : { page: 'core', selected: this.stageIndex },
          ),
        },
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
    const panel = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT * 0.42)
      .setDepth(50)
      .setName('round-overlay-panel')

    const titleText = addText(this, 0, 0, title, {
      fontFamily: visual.type.family,
      fontSize: '30px',
      fontStyle: 'bold',
      color: ink(visual.colors.primaryInk),
      align: 'center',
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5).setName('round-overlay-content-title')

    const lineTexts = lines.map((line, i) =>
      addText(this, 0, 0, line, {
        fontFamily: visual.type.family,
        fontSize: '17px',
        color: ink(visual.colors.secondaryInk),
        align: 'center',
        wordWrap: { width: width - 48 },
      }).setOrigin(0.5).setName(`round-overlay-content-line-${i}`),
    )
    const bodyHeight = lineTexts.reduce((sum, text) => sum + text.height, 0)
      + Math.max(0, lineTexts.length - 1) * 8
    const buttonHeight = 52
    const height = 24 + titleText.height + 14 + bodyHeight + 20 + buttonHeight + 16
    panel.setData('surfaceSize', { width, height })

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

    let cursor = -height / 2 + 24
    titleText.setY(cursor + titleText.height / 2)
    cursor += titleText.height + 14
    for (const text of lineTexts) {
      text.setY(cursor + text.height / 2)
      cursor += text.height + 8
    }
    panel.add([titleText, ...lineTexts])

    const y = height / 2 - 16 - buttonHeight / 2
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
  private animateReshuffle(moves: CellMove[]): Promise<unknown> {
    playSfx('reshuffle')
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
