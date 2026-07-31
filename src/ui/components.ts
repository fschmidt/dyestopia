import Phaser from 'phaser'

import { addText } from '../text'
import { ink, resolveVisualProfile } from './visual-system'

export type ButtonKind = 'primary' | 'secondary' | 'quiet'

export function addSurface(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
  strong = false,
): Phaser.GameObjects.Graphics {
  const profile = resolveVisualProfile()
  const graphics = scene.add
    .graphics({ x, y })
    .setName(name)
    .setData('surfaceSize', { width, height })
    .setData('visualTreatment', profile.treatment)
  if (profile.treatment === 'spray-can') {
    const cut = Math.min(14, width * 0.04, height * 0.12)
    const points = [
      new Phaser.Math.Vector2(-width / 2 + cut, -height / 2),
      new Phaser.Math.Vector2(width / 2 - cut * 0.4, -height / 2 + 1),
      new Phaser.Math.Vector2(width / 2, -height / 2 + cut),
      new Phaser.Math.Vector2(width / 2 - 2, height / 2 - cut * 0.35),
      new Phaser.Math.Vector2(width / 2 - cut, height / 2),
      new Phaser.Math.Vector2(-width / 2, height / 2 - 2),
      new Phaser.Math.Vector2(-width / 2 + 1, -height / 2 + cut),
    ]
    graphics.fillStyle(
      strong ? profile.colors.surfaceStrong : profile.colors.surface,
      strong ? profile.alpha.surfaceStrong : profile.alpha.surface,
    )
    graphics.fillPoints(points, true)
    graphics.lineStyle(1, profile.colors.primaryInk, 0.22)
    graphics.strokePoints(points, true)
    graphics.lineStyle(1, profile.colors.primaryInk, 0.035)
    for (let stripe = -width / 2 - height; stripe < width / 2; stripe += 14) {
      const startX = Math.max(-width / 2, stripe)
      const endX = Math.min(width / 2, stripe + height)
      graphics.lineBetween(startX, height / 2, endX, -height / 2)
    }
  } else {
    graphics.fillStyle(
      strong ? profile.colors.surfaceStrong : profile.colors.surface,
      strong ? profile.alpha.surfaceStrong : profile.alpha.surface,
    )
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, profile.radii.lg)
    graphics.lineStyle(1, profile.colors.primaryInk, 0.16)
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, profile.radii.lg)
  }
  return graphics
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  action: () => void,
  options: {
    kind?: ButtonKind
    name?: string
    height?: number
    fontSize?: string
    fontFamily?: string
    letterSpacing?: number
  } = {},
): Phaser.GameObjects.Container {
  const profile = resolveVisualProfile()
  const kind = options.kind ?? 'secondary'
  const height = options.height ?? 52
  const radius = Math.min(profile.radii.md, height / 2)
  const container = scene.add
    .container(x, y)
    .setSize(width, height)
    .setName(options.name ?? '')
    .setData('visualTreatment', profile.treatment)
    .setData('buttonKind', kind)
    .setData('buttonHighlight', profile.colors.accentHighlight)
  const plate = scene.add.graphics().setName('plate')
  const text = addText(scene, 0, 0, label, {
    fontFamily: options.fontFamily ?? profile.type.family,
    fontSize: options.fontSize ?? profile.type.body,
    fontStyle: kind === 'primary' ? 'bold' : 'normal',
    letterSpacing: options.letterSpacing,
    color: ink(kind === 'primary' ? profile.colors.accentInk : profile.colors.primaryInk),
  }).setOrigin(0.5).setName('label')
  container.add([plate, text])

  let focused = false
  const paint = (pressed = false): void => {
    plate.clear()
    const fill =
      kind === 'primary'
        ? focused ? profile.colors.accentHighlight : profile.colors.accent
        : kind === 'quiet'
          ? profile.colors.surfaceStrong
          : profile.colors.surface
    const alpha = kind === 'primary' ? 1 : pressed ? 1 : 0.72
    container.setData('buttonFill', fill)
    if (profile.treatment === 'spray-can') {
      if (kind === 'quiet') {
        const underlineWidth = Math.min(width - 24, Math.max(86, text.width + 8))
        plate.fillStyle(profile.colors.accent, focused ? 1 : 0.9)
        plate.fillRect(-underlineWidth / 2, height / 2 - 7, underlineWidth, focused ? 4 : 3)
        return
      }
      const skew = Math.min(9, height * 0.15)
      const points = [
        new Phaser.Math.Vector2(-width / 2 + skew, -height / 2),
        new Phaser.Math.Vector2(width / 2 - skew * 0.35, -height / 2 + 1),
        new Phaser.Math.Vector2(width / 2, height / 2 - 3),
        new Phaser.Math.Vector2(-width / 2 + skew * 0.35, height / 2),
      ]
      if (kind === 'primary') {
        const shadow = points.map((point) => new Phaser.Math.Vector2(point.x + 5, point.y + 7))
        plate.fillStyle(profile.colors.surfaceStrong, 0.88)
        plate.fillPoints(shadow, true)
      }
      plate.fillStyle(fill, alpha)
      plate.fillPoints(points, true)
      plate.lineStyle(focused ? 3 : 2, focused ? profile.colors.focus : profile.colors.primaryInk, focused ? 1 : kind === 'primary' ? 0.42 : 0.62)
      plate.strokePoints(points, true)
      return
    }
    plate.fillStyle(fill, alpha)
    plate.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
    plate.lineStyle(focused ? 3 : 1, focused ? profile.colors.focus : profile.colors.primaryInk, focused ? 1 : 0.18)
    plate.strokeRoundedRect(-width / 2, -height / 2, width, height, radius)
  }
  paint()

  container.setInteractive({ useHandCursor: true })
  container.on('pointerover', () => {
    focused = true
    paint()
    scene.tweens.add({ targets: container, scale: 1.025, duration: profile.motion.quick })
  })
  container.on('pointerout', () => {
    focused = false
    paint()
    scene.tweens.add({ targets: container, scale: 1, duration: profile.motion.quick })
  })
  container.on('pointerdown', () => paint(true))
  container.on('pointerup', () => {
    paint()
    action()
  })
  return container
}

export interface Segment {
  id: string
  label: string
}

export function addSegmentedControl(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  options: Segment[],
  selected: () => string,
  choose: (id: string) => void,
): { repaint: () => void; objects: Phaser.GameObjects.Container[] } {
  const profile = resolveVisualProfile()
  const gap = 6
  const cellWidth = (width - gap * (options.length - 1)) / options.length
  const objects: Phaser.GameObjects.Container[] = []

  const repaint = (): void => {
    for (const object of objects) {
      const active = object.getData('id') === selected()
      const plate = object.getByName('plate') as Phaser.GameObjects.Graphics
      const label = object.getByName('label') as Phaser.GameObjects.Text
      plate.clear()
      plate.fillStyle(active ? profile.colors.accent : profile.colors.surfaceStrong, active ? 1 : 0.62)
      plate.fillRoundedRect(-cellWidth / 2, -24, cellWidth, 48, profile.radii.sm)
      plate.lineStyle(1, active ? profile.colors.accent : profile.colors.primaryInk, active ? 1 : 0.14)
      plate.strokeRoundedRect(-cellWidth / 2, -24, cellWidth, 48, profile.radii.sm)
      label.setColor(ink(active ? profile.colors.accentInk : profile.colors.primaryInk))
    }
  }

  options.forEach((option, index) => {
    const cx = x - width / 2 + cellWidth / 2 + index * (cellWidth + gap)
    const object = scene.add
      .container(cx, y)
      .setSize(cellWidth, 48)
      .setName(`option-${option.id}`)
      .setData('id', option.id)
    const plate = scene.add.graphics().setName('plate')
    const label = addText(scene, 0, 0, option.label, {
      fontFamily: profile.type.family,
      fontSize: profile.type.small,
      fontStyle: 'bold',
      color: ink(profile.colors.primaryInk),
      align: 'center',
      wordWrap: { width: cellWidth - 10 },
    })
      .setOrigin(0.5)
      .setName('label')
    object.add([plate, label]).setInteractive({ useHandCursor: true })
    object.on('pointerup', () => {
      choose(option.id)
      repaint()
    })
    objects.push(object)
  })
  repaint()
  return { repaint, objects }
}

export function addSwitch(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: () => boolean,
  toggle: (next: boolean) => void,
  name = 'sound-switch',
): Phaser.GameObjects.Container {
  const profile = resolveVisualProfile()
  const width = 128
  const height = 52
  const control = scene.add.container(x, y).setSize(width, height).setName(name)
  const shadow = scene.add.rectangle(5, 5, width, height, 0x000000, 0.55)
  const frame = scene.add.graphics()
  const onLabel = addText(scene, -32, 0, 'ON', {
    fontFamily: profile.type.family,
    fontSize: profile.type.small,
    fontStyle: 'bold',
    letterSpacing: 2,
    color: ink(profile.colors.primaryInk),
  }).setOrigin(0.5).setName('sound-on')
  const offLabel = addText(scene, 32, 0, 'OFF', {
    fontFamily: profile.type.family,
    fontSize: profile.type.small,
    fontStyle: 'bold',
    letterSpacing: 2,
    color: ink(profile.colors.secondaryInk),
  }).setOrigin(0.5).setName('sound-off')
  control.add([shadow, frame, onLabel, offLabel])
  const repaint = (): void => {
    const on = value()
    frame.clear()
    frame.fillStyle(profile.colors.surfaceStrong, 0.94)
    frame.fillRect(-width / 2, -height / 2, width, height)
    frame.fillStyle(profile.colors.accent, 1)
    frame.fillRect(on ? -width / 2 + 5 : 0, -height / 2 + 5, width / 2 - 5, height - 10)
    frame.lineStyle(2, profile.colors.primaryInk, 0.65)
    frame.strokeRect(-width / 2, -height / 2, width, height)
    frame.lineStyle(2, profile.colors.primaryInk, 1)
    frame.strokeRect(on ? -width / 2 + 6 : 1, -height / 2 + 6, width / 2 - 7, height - 12)
    onLabel.setColor(ink(on ? profile.colors.accentInk : profile.colors.secondaryInk))
    offLabel.setColor(ink(on ? profile.colors.secondaryInk : profile.colors.accentInk))
  }
  control.setInteractive({ useHandCursor: true }).on('pointerup', () => {
    toggle(!value())
    repaint()
  })
  repaint()
  return control
}

export function addProgressMeter(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
): { track: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle } {
  const profile = resolveVisualProfile()
  const track = scene.add
    .rectangle(x, y, width, 8, profile.colors.primaryInk, 0.14)
    .setOrigin(0, 0.5)
    .setName('progress-meter')
  const fillColor =
    profile.treatment === 'spray-can' ? profile.colors.critical : profile.colors.accent
  const fill = scene.add.rectangle(x, y, 0, 8, fillColor).setOrigin(0, 0.5)
  return { track, fill }
}
