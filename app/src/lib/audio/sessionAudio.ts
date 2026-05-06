/** Session SFX: countdown + last-10s ticks; fails silently if audio is unavailable. */

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedCtx) return sharedCtx
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  sharedCtx = new Ctor()
  return sharedCtx
}

/** Call after a user gesture so mobile browsers allow playback. */
export function resumeSessionAudioContext(): void {
  try {
    const ctx = getAudioContext()
    if (ctx) void ctx.resume().catch(() => undefined)
  } catch {
    /* optional */
  }
}

function playTone(opts: {
  frequencyHz: number
  durationSec: number
  gainStart: number
}): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    void ctx.resume().catch(() => undefined)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = opts.frequencyHz
    const t0 = ctx.currentTime
    const t1 = t0 + opts.durationSec
    gain.gain.setValueAtTime(opts.gainStart, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t1 + 0.02)
  } catch {
    /* optional */
  }
}

export function playCountdownBeep(): void {
  playTone({ frequencyHz: 880, durationSec: 0.1, gainStart: 0.06 })
}

/** Last 10s of active set: one short tick per second (10 down through 1). */
export function playLastTenTickBeep(): void {
  playTone({ frequencyHz: 720, durationSec: 0.09, gainStart: 0.05 })
}

/** Distinct tone when working time reaches 0. */
export function playLastTenFinalBeep(): void {
  playTone({ frequencyHz: 392, durationSec: 0.18, gainStart: 0.07 })
}
