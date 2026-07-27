import Phaser from 'phaser'

import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'

/** Design resolution. Scale.FIT letterboxes this to any screen. */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 720

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#12101a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene],
}
