import { AnimatePresence, motion } from 'framer-motion'

export type CountdownPhase = 3 | 2 | 1 | 'go'

type Props = {
  phase: CountdownPhase
}

export function CountdownOverlay({ phase }: Props) {
  const display = phase === 'go' ? 'Go!' : String(phase)

  return (
    <>
      <div className="pushup-countdown-backdrop pushup-countdown-backdrop--solo" aria-hidden />
      <div className="pushup-countdown-solo-inner">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={display}
            className="pushup-countdown pushup-countdown--solo"
            role="status"
            aria-live="assertive"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          >
            {display}
          </motion.div>
        </AnimatePresence>
        <p className="pushup-countdown-label">Get ready</p>
      </div>
    </>
  )
}
