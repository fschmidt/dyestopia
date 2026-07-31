import Phaser from 'phaser'

import { gameConfig } from './config'
import { exposeDebugApi } from './debug'
import './style.css'

const game = new Phaser.Game(gameConfig)
exposeDebugApi(game)
