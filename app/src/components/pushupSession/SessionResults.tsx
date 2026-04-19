import { useAuth, useUser } from '@clerk/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, startTransition, type FC } from 'react'
import type { CountUpProps } from 'react-countup'
import CountUpImport from 'react-countup'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { getLeaderboard } from '../../api/challenges'
import { createSoloSession } from '../../api/solo'
import { formatError } from '../../lib/formatError'
import { getSoloResultsFeedbackLine, getWorkoutFeedback } from '../../lib/workoutFeedback'
import type { LeaderboardEntry } from '../../types/challenge'

/** CJS/ESM interop: Vite may give the component or a module object with `.default`. */
const CountUp: FC<CountUpProps> =
  typeof CountUpImport === 'function'
    ? CountUpImport
    : (CountUpImport as unknown as { default: FC<CountUpProps> }).default

type Props = {
  reps: number
  onTryAgain: () => void
  onBack: () => void
  sessionRecording: Blob | null
  soloSyncKey: string | null
  variant?: 'solo' | 'default'
  /** Elapsed active time in seconds (solo). */
  sessionDurationSec?: number
  priorPersonalBest?: number | null
  bestInLast7Days?: number | null
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.1-.99L12 2z" />
    </svg>
  )
}

function heuristicRank(
  leaderboard: LeaderboardEntry[] | null,
  namesToTry: string[],
): string | null {
  if (!leaderboard?.length) return null
  const tries = new Set(namesToTry.map((n) => n.trim().toLowerCase()).filter(Boolean))
  for (const row of leaderboard) {
    const dn = (row.displayName ?? '').trim().toLowerCase()
    if (dn && tries.has(dn)) {
      return `#${row.rank}`
    }
  }
  return null
}

export function SessionResults({
  reps,
  onTryAgain,
  onBack,
  sessionRecording,
  soloSyncKey,
  variant = 'default',
  sessionDurationSec = 60,
  priorPersonalBest = null,
  bestInLast7Days = null,
}: Props) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const feedbackDefault = getWorkoutFeedback(reps)

  const isNewPersonalBest =
    (priorPersonalBest == null && reps > 0) ||
    (priorPersonalBest != null && reps > priorPersonalBest)

  /** Only when we have prior 7d data; avoids false "7d high" on empty window with older all-time PB */
  const isBestInLast7Days =
    !isNewPersonalBest &&
    bestInLast7Days != null &&
    reps > bestInLast7Days

  const feedbackSolo = getSoloResultsFeedbackLine(reps, {
    isNewPersonalBest,
    isBestInLast7Days,
  })

  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [soloStatus, setSoloStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [soloError, setSoloError] = useState<string | null>(null)
  const [serverVideoUrl, setServerVideoUrl] = useState<string | null>(null)
  const [rankLabel, setRankLabel] = useState<string | null>(null)

  const recordingRef = useRef<Blob | null>(sessionRecording)
  const repsRef = useRef(reps)
  const getTokenRef = useRef(getToken)
  useLayoutEffect(() => {
    recordingRef.current = sessionRecording
    repsRef.current = reps
    getTokenRef.current = getToken
  }, [sessionRecording, reps, getToken])

  const downloadFilename = useMemo(() => {
    if (!sessionRecording) return 'pushup-session.webm'
    const ext = sessionRecording.type.includes('mp4') ? 'mp4' : 'webm'
    const id = soloSyncKey ?? 'session'
    return `pushup-session-${id}.${ext}`
  }, [sessionRecording, soloSyncKey])

  useEffect(() => {
    if (!soloSyncKey) return

    let cancelled = false
    startTransition(() => {
      setSoloStatus('saving')
      setSoloError(null)
      setServerVideoUrl(null)
    })

    const id = window.setTimeout(async () => {
      try {
        const result = await createSoloSession(getTokenRef.current, {
          reps: repsRef.current,
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
  }, [soloSyncKey])

  useEffect(() => {
    if (variant !== 'solo') return
    let cancelled = false
    void (async () => {
      try {
        const board = await getLeaderboard()
        if (cancelled) return
        const names = [
          user?.fullName ?? '',
          [user?.firstName, user?.lastName].filter(Boolean).join(' '),
          user?.firstName ?? '',
          user?.username ?? '',
        ]
        setRankLabel(heuristicRank(board, names))
      } catch {
        if (!cancelled) setRankLabel(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [variant, user])

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

  const avgRepTime =
    reps > 0 ? `${(sessionDurationSec / reps).toFixed(1)}s` : '—'

  if (variant === 'solo') {
    return (
      <motion.div
        className="pushup-results-solo"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="pushup-results-solo-card">
          <p className="pushup-results-solo-eyebrow">Session complete</p>
          <motion.p
            className="pushup-results-solo-reps"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <CountUp start={0} end={reps} duration={0.85} preserveValue />
          </motion.p>
          <p className="pushup-results-solo-unit">reps</p>

          {isNewPersonalBest ? (
            <div className="pushup-results-solo-pb-badge">
              <StarIcon />
              New personal best!
            </div>
          ) : null}

          <p className="pushup-results-solo-feedback">{feedbackSolo}</p>

          <div className="pushup-results-solo-stats">
            <div className="pushup-results-solo-stat">
              <span className="pushup-results-solo-stat-label">Duration</span>
              <span className="pushup-results-solo-stat-value">{formatMmSs(sessionDurationSec)}</span>
            </div>
            <div className="pushup-results-solo-stat">
              <span className="pushup-results-solo-stat-label">Avg rep</span>
              <span className="pushup-results-solo-stat-value">{avgRepTime}</span>
            </div>
            <div className="pushup-results-solo-stat">
              <span className="pushup-results-solo-stat-label">Rank</span>
              <span className="pushup-results-solo-stat-value">{rankLabel ?? '—'}</span>
            </div>
          </div>

          {soloStatus === 'saving' ? (
            <div className="pushup-results-solo-save pushup-results-solo-save--pending" role="status">
              <span className="pushup-results-solo-save-dot" aria-hidden />
              Saving your session…
            </div>
          ) : null}
          {soloStatus === 'saved' ? (
            <div className="pushup-results-solo-save" role="status">
              <span className="pushup-results-solo-save-dot" aria-hidden />
              Saved — reps and video added to your account
            </div>
          ) : null}
          {soloStatus === 'error' && soloError ? (
            <p className="pushup-results-solo-error" role="alert">
              Could not save: {soloError}
            </p>
          ) : null}

          <div className="pushup-results-solo-actions">
            <button type="button" className="pushup-results-solo-btn-ghost" onClick={onTryAgain}>
              Go again
            </button>
            <Link to="/challenge/create" className="pushup-results-solo-btn-primary">
              Challenge someone →
            </Link>
          </div>

          {import.meta.env.DEV && (recordingUrl || serverVideoUrl) ? (
            <div className="pushup-results-solo-dev muted" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
              {serverVideoUrl ? (
                <a href={serverVideoUrl} target="_blank" rel="noopener noreferrer">
                  Open cloud video
                </a>
              ) : null}
              {recordingUrl ? (
                <a href={recordingUrl} download={downloadFilename} style={{ marginLeft: '0.5rem' }}>
                  Download recording
                </a>
              ) : null}
            </div>
          ) : null}

          <button type="button" className="pushup-results-solo-exit" onClick={onBack}>
            Back
          </button>
        </div>
      </motion.div>
    )
  }

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
        <p className="pushup-results-feedback">{feedbackDefault}</p>
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
          Save your score
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
