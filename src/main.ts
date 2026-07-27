import Phaser from 'phaser'

import { gameConfig } from './config'
import { exposeDebugApi } from './debug'
import './style.css'

exposeDebugApi(new Phaser.Game(gameConfig))
