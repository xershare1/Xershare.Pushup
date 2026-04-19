import { motion } from 'framer-motion'
import type { ChecklistItemStatus, SoloReadinessChecklist } from '../../lib/pose/pushupReadinessChecks'

type Props =
  | {
      variant?: 'default'
      pushupPosition: boolean
      pushupHint?: string | null
    }
  | {
      variant: 'solo'
      checklist: SoloReadinessChecklist
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

function SoloCheckRow({ label, status }: { label: string; status: ChecklistItemStatus }) {
  const iconClass =
    status === 'pass'
      ? 'pushup-solo-check-icon pushup-solo-check-icon--pass'
      : status === 'fail'
        ? 'pushup-solo-check-icon pushup-solo-check-icon--fail'
        : 'pushup-solo-check-icon pushup-solo-check-icon--wait'

  const sym = status === 'pass' ? '✓' : status === 'fail' ? '!' : '…'
  const labelClass = status === 'pass' ? 'pushup-solo-check-label--pass' : 'pushup-solo-check-label'

  return (
    <li className="pushup-solo-check-row">
      <span className={iconClass} aria-hidden>
        {sym}
      </span>
      <span className={labelClass}>{label}</span>
    </li>
  )
}

function SilhouetteGuide() {
  return (
    <div className="pushup-silhouette" aria-hidden>
      <svg viewBox="0 0 120 200" className="pushup-silhouette-svg">
        <ellipse cx="60" cy="28" rx="22" ry="24" fill="currentColor" />
        <path
          fill="currentColor"
          d="M60 52 L28 88 L38 98 L55 78 L55 120 L40 175 L52 182 L60 130 L68 182 L80 175 L65 120 L65 78 L82 98 L92 88 Z"
        />
      </svg>
    </div>
  )
}

export function ReadinessChecklist(props: Props) {
  if (props.variant === 'solo') {
    const { checklist } = props
    return (
      <div className="pushup-readiness-solo-wrap">
        <SilhouetteGuide />
        <motion.div
          className="pushup-readiness-solo-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="pushup-readiness-solo-title">Get into position</p>
          <ul className="pushup-solo-checklist">
            <SoloCheckRow label="Full body visible" status={checklist.fullBody} />
            <SoloCheckRow label="Good lighting" status={checklist.lighting} />
            <SoloCheckRow label="Arms in frame" status={checklist.armsForm} />
            <SoloCheckRow label="Hold position steady" status={checklist.holdSteady} />
          </ul>
        </motion.div>
        <p className="pushup-readiness-solo-hint">Hold a push-up plank position for 2 seconds</p>
      </div>
    )
  }

  const { pushupPosition, pushupHint = null } = props
  return (
    <motion.div
      className="pushup-readiness"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="pushup-readiness-title">Get ready</p>
      <p className="pushup-readiness-framing muted">
        Stay fully in frame (head to feet) for the whole set. Standing at the edge or cropping legs or
        ankles often stops reps from counting.
      </p>
      <ul className="pushup-checklist">
        <CheckRow label="Body in pushup position" ok={pushupPosition} hint={pushupHint} />
      </ul>
    </motion.div>
  )
}
