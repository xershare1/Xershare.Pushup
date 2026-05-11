import { motion } from 'framer-motion'
import { MotionBar } from './MotionBar'

export type VoiceHudControlProps = {
  show: boolean
  sessionMuted: boolean
  onToggle: () => void
}

type Props = {
  reps: number
  remainingSec: number
  motion01: number
  onStop: () => void
  variant?: 'solo' | 'default'
  /** Prior best reps (solo HUD line). */
  personalBest: number | null
  /** Session audio (voice milestones + sounds): shown when user opt-in preference is on. */
  voiceControl?: VoiceHudControlProps | null
  /** Debounced mid-session framing loss (non-blocking). */
  framingLossWarning?: boolean
}

function formatTimeLeft(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VoiceToggleButton({ sessionMuted, onToggle }: Pick<VoiceHudControlProps, 'sessionMuted' | 'onToggle'>) {
  return (
    <button
      type="button"
      className={`pushup-voice-toggle ${sessionMuted ? 'pushup-voice-toggle--muted' : 'pushup-voice-toggle--active'}`}
      onClick={onToggle}
      aria-label={sessionMuted ? 'Unmute session audio' : 'Mute session audio'}
    >
      {sessionMuted ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            fill="currentColor"
            d="M4 14v-4h4l5-5v14l-5-5H4zm13.5 1.5 2.1-2.1-2.1-2.1 1.1-1.1 2.1 2.1 2.1-2.1 1.1 1.1-2.1 2.1 2.1 2.1-1.1 1.1-2.1-2.1-2.1 2.1-1.1-1.1z"
            opacity="0.85"
          />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            fill="currentColor"
            d="M4 14v-4h4l5-5v14l-5-5H4zm9.5-2c0-1.04-.4-2-1.05-2.73L12 11.5v3c1.38 0 2.5-1.12 2.5-2.5zm0-5.5c2.76 0 5 2.24 5 5 0 1.1-.36 2.11-.97 2.93l1.43 1.43A6.96 6.96 0 0 0 21 11.5c0-3.87-3.13-7-7-7-.95 0-1.84.2-2.67.54l1.52 1.52c.35-.1.72-.16 1.15-.16z"
            opacity="0.9"
          />
        </svg>
      )}
    </button>
  )
}

export function ActiveSessionHud({
  reps,
  remainingSec,
  motion01,
  onStop,
  variant = 'default',
  personalBest,
  voiceControl,
  framingLossWarning = false,
}: Props) {
  const voice = voiceControl?.show ? voiceControl : null

  if (variant === 'solo') {
    const urgent = remainingSec < 15
    return (
      <div className="pushup-active-hud-solo">
        <div className="pushup-hud-solo-top">
          <div className="pushup-hud-solo-timer-card">
            <p className="pushup-hud-solo-timer-label">Time left</p>
            <p
              className={`pushup-hud-solo-timer-value ${urgent ? 'pushup-hud-solo-timer-value--urgent' : ''}`}
            >
              {formatTimeLeft(remainingSec)}
            </p>
          </div>
          <div className="pushup-hud-solo-actions">
            {voice ? (
              <VoiceToggleButton sessionMuted={voice.sessionMuted} onToggle={voice.onToggle} />
            ) : null}
            <button type="button" className="pushup-hud-solo-stop" onClick={onStop}>
              Stop
            </button>
          </div>
        </div>
        <div className="pushup-hud-solo-center">
          <motion.p
            className="pushup-hud-solo-reps"
            key={reps}
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            {reps}
          </motion.p>
          <p className="pushup-hud-solo-reps-label">reps</p>
          <p className="pushup-hud-solo-pb">
            Personal best:{' '}
            <span className="pushup-hud-solo-pb-num">{personalBest != null ? personalBest : '—'}</span>
          </p>
        </div>
        <div className="pushup-hud-solo-motion">
          <p className="pushup-hud-solo-motion-label">Motion</p>
          <MotionBar value01={motion01} thin />
        </div>
        {framingLossWarning ? (
          <p className="pushup-hud-solo-framing-warn" role="status">
            Move back into frame to continue
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <motion.div
      className="pushup-active-hud"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="pushup-active-hud-top">
        <div className="pushup-hud-stats-pair">
          <div className="pushup-hud-stat">
            <p className="pushup-hud-stat-label">Time</p>
            <p className="pushup-hud-stat-value">{remainingSec}s</p>
          </div>
          <motion.div
            className="pushup-hud-stat"
            key={reps}
            initial={{ scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <p className="pushup-hud-stat-label">Reps</p>
            <p className="pushup-hud-stat-value">{reps}</p>
          </motion.div>
        </div>
        {voice ? <VoiceToggleButton sessionMuted={voice.sessionMuted} onToggle={voice.onToggle} /> : null}
      </div>
      <MotionBar value01={motion01} />
      {framingLossWarning ? (
        <p className="pushup-hud-framing-warn" role="status">
          Move back into frame to continue
        </p>
      ) : null}
      <p className="pushup-hud-soft-hint muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
        Keep your full body in frame—edges and cropping can cost reps. Controlled tempo and full range
        help.
      </p>
      <div className="pushup-session-actions" style={{ marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onStop}>
          End session
        </button>
      </div>
    </motion.div>
  )
}
