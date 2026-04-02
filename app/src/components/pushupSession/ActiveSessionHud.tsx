import { motion } from 'framer-motion'
import { MotionBar } from './MotionBar'

type Props = {
  reps: number
  remainingSec: number
  motion01: number
  onStop: () => void
}

export function ActiveSessionHud({ reps, remainingSec, motion01, onStop }: Props) {
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
        Controlled reps count best · Full range of motion helps.
      </p>
      <div className="pushup-session-actions" style={{ marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onStop}>
          End session
        </button>
      </div>
    </motion.div>
  )
}
