import { AnimatePresence, motion } from 'framer-motion'

type Props = {
  value: number
}

export function CountdownOverlay({ value }: Props) {
  return (
    <>
      <div className="pushup-countdown-backdrop" aria-hidden />
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          className="pushup-countdown"
          role="status"
          aria-live="assertive"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
