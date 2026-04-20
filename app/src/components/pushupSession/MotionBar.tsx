import { motion } from 'framer-motion'

type Props = {
  /** 0 = low position, 1 = high */
  value01: number
  /** Solo HUD uses a thinner 3px bar */
  thin?: boolean
}

export function MotionBar({ value01, thin }: Props) {
  const v = Math.max(0, Math.min(1, value01))
  return (
    <div className={`pushup-motion-bar ${thin ? 'pushup-motion-bar--thin' : ''}`} aria-hidden>
      <motion.div
        className="pushup-motion-bar-fill"
        initial={false}
        animate={{ scaleX: v }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        style={{ transformOrigin: 'left center' }}
      />
    </div>
  )
}
