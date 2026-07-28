import { getSettings } from './settings'

/**
 * Sound effects, synthesised in Web Audio — no asset files, no loading, no
 * licensing. Every sound is a few oscillators with an envelope, which suits
 * the game's look: the tiles are procedural, so the sounds are too, and the
 * whole kit costs less than one .mp3 would.
 *
 * The palette follows the animations it accompanies (tile-motion.md): matches
 * are plops that rise in pitch as cascade waves stack up, a merge is two
 * tones gliding into one — the mechanic, audible — and the illegal buzz is
 * the head-shake's voice. Win and lose are the only "musical" phrases.
 *
 * Two platform realities shape the plumbing:
 *
 * - Browsers gate audio behind a user gesture, so the context is created (and
 *   nudged with `resume()`) lazily on the first play. Every first sound in
 *   practice sits inside a pointer event — a drag, a button — so the gate
 *   opens on its own; a sound that can't play is dropped, never queued.
 * - Headless test browsers may refuse audio entirely, so `playSfx` records
 *   the attempt in a log *before* touching the context. Tests assert against
 *   `sfxLog()` (via the debug bridge), which works with or without a speaker.
 *
 * The mute toggle lives in settings (`sound`), checked per play — flipping it
 * needs no rewiring, the module just goes quiet.
 */

export type SfxName =
  | 'pick'
  | 'match'
  | 'merge'
  | 'illegal'
  | 'threshold'
  | 'reshuffle'
  | 'win'
  | 'lose'

/** Everything under one gain, so the whole kit is mixed (and capped) in one place. */
const MASTER_GAIN = 0.22

/** Last plays, newest last — the testable trace of what the game said. */
const log: string[] = []
const LOG_LIMIT = 64

let ctx: AudioContext | undefined
let master: GainNode | undefined

export function sfxLog(): string[] {
  return [...log]
}

/**
 * Play a named sound; `wave` only matters for 'match', where cascade waves
 * pitch the plop up so the multiplier is heard climbing.
 */
export function playSfx(name: SfxName, wave = 1): void {
  if (!getSettings().sound) return

  log.push(wave > 1 ? `${name}:${wave}` : name)
  if (log.length > LOG_LIMIT) log.splice(0, log.length - LOG_LIMIT)

  const ac = ensure()
  if (!ac) return
  // A suspended context means the gesture gate: this call is (in practice)
  // inside a pointer event, so resuming here is exactly what unlocks it.
  if (ac.state === 'suspended') void ac.resume()

  const now = ac.currentTime
  SOUNDS[name](ac, now, wave)
}

function ensure(): AudioContext | undefined {
  if (ctx) return ctx
  try {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(ctx.destination)
  } catch {
    // No audio here (headless, ancient browser). The log above still told the
    // story; the game just plays silent.
    ctx = undefined
  }
  return ctx
}

interface ToneSpec {
  type: OscillatorType
  /** Start frequency, Hz — and the end, when `to` says the pitch travels. */
  from: number
  to?: number
  /** Envelope length, seconds. */
  dur: number
  /** Peak level, relative to the master gain. */
  gain: number
  /** Offset from the play call, seconds — how phrases are sequenced. */
  delay?: number
}

/** One enveloped oscillator — every sound below is a handful of these. */
function tone(ac: AudioContext, now: number, spec: ToneSpec): void {
  const when = now + (spec.delay ?? 0)
  const osc = ac.createOscillator()
  const env = ac.createGain()

  osc.type = spec.type
  osc.frequency.setValueAtTime(spec.from, when)
  if (spec.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(spec.to, when + spec.dur)
  }

  // A short linear attack keeps the start click-free; the exponential decay
  // is what makes a bare oscillator sound like a struck thing, not a siren.
  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(spec.gain, when + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0001, when + spec.dur)

  osc.connect(env)
  env.connect(master!)
  osc.start(when)
  osc.stop(when + spec.dur + 0.05)
}

const SOUNDS: Record<SfxName, (ac: AudioContext, now: number, wave: number) => void> = {
  /** Barely-there blip on pick-up — touch feedback, not commentary. */
  pick: (ac, now) => {
    tone(ac, now, { type: 'sine', from: 520, to: 660, dur: 0.06, gain: 0.35 })
  },

  /**
   * The clear: a downward plop, wet like the burst it accompanies. Each
   * cascade wave starts the plop a step higher — the rising multiplier as a
   * rising pitch — with a bright overtone joining from wave 2.
   */
  match: (ac, now, wave) => {
    const step = Math.pow(1.22, Math.min(wave, 6) - 1)
    tone(ac, now, { type: 'triangle', from: 560 * step, to: 265 * step, dur: 0.15, gain: 0.9 })
    if (wave > 1) {
      tone(ac, now, {
        type: 'sine',
        from: 1120 * step,
        dur: 0.1,
        gain: 0.3,
        delay: 0.02,
      })
    }
  },

  /** Two dyes becoming one: two tones gliding onto the same note. */
  merge: (ac, now) => {
    tone(ac, now, { type: 'sine', from: 392, to: 466, dur: 0.3, gain: 0.55 })
    tone(ac, now, { type: 'sine', from: 554, to: 466, dur: 0.3, gain: 0.55 })
  },

  /** The head-shake's voice: two dull low buzzes, no and no. */
  illegal: (ac, now) => {
    tone(ac, now, { type: 'sawtooth', from: 150, to: 110, dur: 0.08, gain: 0.4 })
    tone(ac, now, { type: 'sawtooth', from: 150, to: 110, dur: 0.08, gain: 0.4, delay: 0.11 })
  },

  /** The target line crossed — a small upward chime, promise not payoff. */
  threshold: (ac, now) => {
    tone(ac, now, { type: 'sine', from: 660, dur: 0.14, gain: 0.5 })
    tone(ac, now, { type: 'sine', from: 990, dur: 0.2, gain: 0.5, delay: 0.09 })
  },

  /** The board rearranging itself: a quick riffle upward, busy but brief. */
  reshuffle: (ac, now) => {
    ;[300, 360, 432, 520].forEach((from, i) => {
      tone(ac, now, { type: 'triangle', from, dur: 0.08, gain: 0.3, delay: i * 0.055 })
    })
  },

  /** Stage clear: the major arpeggio every match-3 player already knows. */
  win: (ac, now) => {
    ;[523, 659, 784].forEach((from, i) => {
      tone(ac, now, { type: 'sine', from, dur: 0.28, gain: 0.5, delay: i * 0.11 })
    })
    tone(ac, now, { type: 'sine', from: 1047, dur: 0.55, gain: 0.5, delay: 0.33 })
  },

  /** Out of moves: three soft steps down — deflating, not punishing. */
  lose: (ac, now) => {
    ;[392, 330, 262].forEach((from, i) => {
      tone(ac, now, { type: 'triangle', from, dur: 0.32, gain: 0.4, delay: i * 0.17 })
    })
  },
}
