import { motion } from 'framer-motion'

type Props = {
  pushupPosition: boolean
  pushupHint?: string | null
}

function CheckRow({
  label,
  ok,
  hint,
}: {
  label: string
  ok: boolean
  hint?: string | null
}) {
  return (
    <motion.li
      className="pushup-check-item"
      initial={false}
      animate={{ opacity: ok ? 1 : 0.75 }}
      transition={{ duration: 0.2 }}
    >
      <div className="pushup-check-row">
        <span className={`pushup-check-icon ${ok ? 'done' : ''}`} aria-hidden>
          {ok ? '✓' : ''}
        </span>
        <span>{label}</span>
      </div>
      {hint && !ok ? (
        <p className="pushup-check-hint" role="status">
          {hint}
        </p>
      ) : null}
    </motion.li>
  )
}

export function ReadinessChecklist({ pushupPosition, pushupHint = null }: Props) {
  return (
    <motion.div
      className="pushup-readiness"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="pushup-readiness-title">Get ready</p>
      <ul className="pushup-checklist">
        <CheckRow label="Body in pushup position" ok={pushupPosition} hint={pushupHint} />
      </ul>
    </motion.div>
  )
}
