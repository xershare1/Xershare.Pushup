import { motion } from 'framer-motion'
import { MotionBar } from './MotionBar'

type Props = {
  reps: number
  remainingSec: number
  motion01: number
  onStop: () => void
  variant?: 'solo' | 'default'
  /** Prior best reps (solo HUD line). */
  personalBest: number | null
}

function formatTimeLeft(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ActiveSessionHud({
  reps,
  remainingSec,
  motion01,
  onStop,
  variant = 'default',
  personalBest,
}: Props) {
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
          <button type="button" className="pushup-hud-solo-stop" onClick={onStop}>
            Stop
          </button>
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
      <MotionBar value01={motion01} />
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
