import Phaser from 'phaser'

import { gameConfig, watchViewport } from './config'
import { exposeDebugApi } from './debug'
import './style.css'

const game = new Phaser.Game(gameConfig)
exposeDebugApi(game)
watchViewport(game)
