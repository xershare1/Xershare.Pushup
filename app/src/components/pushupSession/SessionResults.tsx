import { useAuth } from '@clerk/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, startTransition, type FC } from 'react'
import type { CountUpProps } from 'react-countup'
import CountUpImport from 'react-countup'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { createSoloSession } from '../../api/solo'
import { formatError } from '../../lib/formatError'
import { getWorkoutFeedback } from '../../lib/workoutFeedback'

/** Dedupe solo POST in React 18 StrictMode (effects run twice with the same key). */
const soloSyncSubmittedKeys = new Set<string>()

/** CJS/ESM interop: Vite may give the component or a module object with `.default`. */
const CountUp: FC<CountUpProps> =
  typeof CountUpImport === 'function'
    ? CountUpImport
    : (CountUpImport as unknown as { default: FC<CountUpProps> }).default

type Props = {
  reps: number
  onTryAgain: () => void
  onBack: () => void
  /** Camera recording for this set (e.g. WebM); shown as download for algorithm lab testing */
  sessionRecording: Blob | null
  /** Set when a set completes — triggers one solo API sync per key */
  soloSyncKey: string | null
  variant?: 'solo' | 'default'
}

export function SessionResults({
  reps,
  onTryAgain,
  onBack,
  sessionRecording,
  soloSyncKey,
  variant = 'default',
}: Props) {
  const { getToken } = useAuth()
  const feedback = getWorkoutFeedback(reps)

  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [soloStatus, setSoloStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [soloError, setSoloError] = useState<string | null>(null)
  const [serverVideoUrl, setServerVideoUrl] = useState<string | null>(null)

  const recordingRef = useRef<Blob | null>(sessionRecording)
  useLayoutEffect(() => {
    recordingRef.current = sessionRecording
  }, [sessionRecording])

  const downloadFilename = useMemo(() => {
    if (!sessionRecording) return 'pushup-session.webm'
    const ext = sessionRecording.type.includes('mp4') ? 'mp4' : 'webm'
    const id = soloSyncKey ?? 'session'
    return `pushup-session-${id}.${ext}`
  }, [sessionRecording, soloSyncKey])

  useEffect(() => {
    if (!soloSyncKey) return
    if (soloSyncSubmittedKeys.has(soloSyncKey)) return
    soloSyncSubmittedKeys.add(soloSyncKey)

    let cancelled = false
    startTransition(() => {
      setSoloStatus('saving')
      setSoloError(null)
      setServerVideoUrl(null)
    })

    const id = window.setTimeout(async () => {
      try {
        const result = await createSoloSession(getToken, {
          reps,
          video: recordingRef.current,
          sessionId: soloSyncKey,
        })
        if (cancelled) return
        setSoloStatus('saved')
        setServerVideoUrl(result.videoUrl)
      } catch (e) {
        if (cancelled) return
        setSoloStatus('error')
        setSoloError(formatError(e))
      }
    }, 1000)

    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [soloSyncKey, reps, getToken])

  useEffect(() => {
    if (!sessionRecording) {
      startTransition(() => setRecordingUrl(null))
      return
    }
    const u = URL.createObjectURL(sessionRecording)
    startTransition(() => setRecordingUrl(u))
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

      {soloStatus === 'saving' ? (
        <p className="banner banner-warn" role="status" style={{ marginTop: '0.75rem' }}>
          Saving your session…
        </p>
      ) : null}
      {soloStatus === 'saved' ? (
        <p className="banner banner-success" role="status" style={{ marginTop: '0.75rem' }}>
          Session saved to your account.
        </p>
      ) : null}
      {soloStatus === 'error' && soloError ? (
        <p className="banner banner-error" role="alert" style={{ marginTop: '0.75rem' }}>
          Could not save session: {soloError}
        </p>
      ) : null}

      <div className="pushup-results-actions">
        <button type="button" className="btn btn-primary pushup-results-cta-primary" onClick={onTryAgain}>
          Try Again
        </button>
        <Link to="/challenge/create" className="btn btn-secondary pushup-results-cta-secondary">
          {variant === 'solo' ? 'Turn this into a challenge' : 'Save your score'}
        </Link>
        {serverVideoUrl ? (
          <a
            href={serverVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary pushup-results-cta-secondary"
          >
            Open cloud video
          </a>
        ) : null}
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
