import { useEffect, useMemo, useState, type FC } from 'react'
import type { CountUpProps } from 'react-countup'
import CountUpImport from 'react-countup'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

/** CJS/ESM interop: Vite may give the component or a module object with `.default`. */
const CountUp: FC<CountUpProps> =
  typeof CountUpImport === 'function'
    ? CountUpImport
    : (CountUpImport as unknown as { default: FC<CountUpProps> }).default

export function getWorkoutFeedback(reps: number): string {
  if (reps <= 0) return "Every rep counts — you've got this."
  if (reps < 15) return 'Nice work.'
  if (reps < 30) return 'Strong set.'
  return 'Outstanding work.'
}

type Props = {
  reps: number
  onTryAgain: () => void
  onBack: () => void
  /** Camera recording for this set (e.g. WebM); shown as download for algorithm lab testing */
  sessionRecording: Blob | null
}

export function SessionResults({ reps, onTryAgain, onBack, sessionRecording }: Props) {
  const feedback = getWorkoutFeedback(reps)

  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const downloadFilename = useMemo(() => {
    if (!sessionRecording) return 'pushup-session.webm'
    const ext = sessionRecording.type.includes('mp4') ? 'mp4' : 'webm'
    return `pushup-session-${Date.now()}.${ext}`
  }, [sessionRecording])

  useEffect(() => {
    if (!sessionRecording) {
      setRecordingUrl(null)
      return
    }
    const u = URL.createObjectURL(sessionRecording)
    setRecordingUrl(u)
    return () => {
      URL.revokeObjectURL(u)
    }
  }, [sessionRecording])

  return (
    <motion.div
      className="pushup-results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="pushup-results-hero">
        <p className="pushup-results-eyebrow">You completed</p>
        <motion.div
          className="pushup-results-number"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <CountUp start={0} end={reps} duration={0.85} preserveValue />
        </motion.div>
        <p className="pushup-results-unit">pushups</p>
        <p className="pushup-results-feedback">{feedback}</p>
      </div>

      <div className="pushup-results-actions">
        <button type="button" className="btn btn-primary pushup-results-cta-primary" onClick={onTryAgain}>
          Try Again
        </button>
        <Link to="/challenge/create" className="btn btn-secondary pushup-results-cta-secondary">
          Save your score
        </Link>
        {recordingUrl ? (
          <a
            href={recordingUrl}
            download={downloadFilename}
            className="btn btn-secondary pushup-results-cta-secondary"
          >
            Download session video
          </a>
        ) : null}
        {sessionRecording && import.meta.env.DEV ? (
          <p className="pushup-results-recording-hint muted">
            Usually WebM. Upload the file in{' '}
            <Link to="/dev/pushup-lab">Pushup algorithm lab</Link> to replay and tune detection.
          </p>
        ) : sessionRecording ? (
          <p className="pushup-results-recording-hint muted">
            Open the downloaded file in your dev Pushup algorithm lab to replay the set.
          </p>
        ) : null}
        <button type="button" className="pushup-results-exit" onClick={onBack}>
          Back
        </button>
      </div>
    </motion.div>
  )
}
