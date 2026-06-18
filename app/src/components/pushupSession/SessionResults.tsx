import { useAuth } from '@clerk/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type FC,
} from 'react'
import type { CountUpProps } from 'react-countup'
import CountUpImport from 'react-countup'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'

import { createSoloSession, type SoloCloudPhase } from '../../api/solo'
import { loadSoloMultipartState, soloAbortMultipartUpload } from '../../api/soloMultipartUpload'
import { formatError } from '../../lib/formatError'
import { getSoloResultsFeedbackLine, getWorkoutFeedback } from '../../lib/workoutFeedback'
import type { SessionStartCaptureContext } from '../../lib/capture/sessionCaptureContext'
import { savePushupLabHandoff } from '../../lib/pose/pushupLabHandoff'

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
  sessionCaptureContext?: SessionStartCaptureContext | null
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

function recordingFileExtension(blob: Blob): string {
  const mime = blob.type.split(';')[0]?.trim().toLowerCase() || ''
  if (mime === 'video/mp4' || mime === 'video/quicktime') return 'mp4'
  if (mime === 'video/webm') return 'webm'
  if (mime.includes('mp4')) return 'mp4'
  return 'webm'
}

function formatRecordingSizeHint(size: number): string {
  if (size <= 0) return ''
  const mb = size / (1024 * 1024)
  const label = mb < 0.1 ? '<0.1' : mb.toFixed(1)
  return ` ~${label} MB`
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
  sessionCaptureContext = null,
}: Props) {
  const { getToken } = useAuth()
  const navigate = useNavigate()
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
  const [soloCloudPhase, setSoloCloudPhase] = useState<SoloCloudPhase | null>(null)
  const [soloError, setSoloError] = useState<string | null>(null)
  const [serverVideoUrl, setServerVideoUrl] = useState<string | null>(null)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [saveRetryNonce, setSaveRetryNonce] = useState(0)

  const recordingRef = useRef<Blob | null>(sessionRecording)
  const repsRef = useRef(reps)
  const getTokenRef = useRef(getToken)
  const soloStatusRef = useRef(soloStatus)
  const soloSyncKeyRef = useRef<string | null>(soloSyncKey)
  const captureContextRef = useRef<SessionStartCaptureContext | null>(sessionCaptureContext)

  useLayoutEffect(() => {
    captureContextRef.current = sessionCaptureContext
  }, [sessionCaptureContext])

  useLayoutEffect(() => {
    soloStatusRef.current = soloStatus
  }, [soloStatus])

  useLayoutEffect(() => {
    soloSyncKeyRef.current = soloSyncKey
  }, [soloSyncKey])

  useLayoutEffect(() => {
    recordingRef.current = sessionRecording
    repsRef.current = reps
    getTokenRef.current = getToken
  }, [sessionRecording, reps, getToken])

  /** Strict Mode / single-flight: progress + phase always hit the latest effect's handlers. */
  const soloSaveDispatchRef = useRef<{
    onUploadProgress: (loaded: number, total: number) => void
    onPhaseChange: (phase: SoloCloudPhase) => void
  }>({
    onUploadProgress: (loaded, total) => {
      void loaded
      void total
    },
    onPhaseChange: (phase: SoloCloudPhase) => {
      void phase
    },
  })

  const onSoloUploadProgressBridge = useCallback((loaded: number, total: number) => {
    soloSaveDispatchRef.current.onUploadProgress(loaded, total)
  }, [])

  const onSoloPhaseChangeBridge = useCallback((phase: SoloCloudPhase) => {
    soloSaveDispatchRef.current.onPhaseChange(phase)
  }, [])

  /** Abandon multipart if the tab is closed/navigated mid-upload (avoid effect cleanup races). */
  useEffect(() => {
    const onPageHide = () => {
      if (soloStatusRef.current !== 'saving') return
      const sid = soloSyncKeyRef.current
      if (!sid) return
      const persisted = loadSoloMultipartState(sid)
      if (!persisted?.uploadId) return
      void soloAbortMultipartUpload(getTokenRef.current, sid, persisted.uploadId)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [])

  /** Warn on tab close / hard refresh during upload — does not affect in-app SPA navigation. */
  useEffect(() => {
    if (soloStatus !== 'saving') return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [soloStatus])

  const downloadFilename = useMemo(() => {
    if (!sessionRecording) return 'pushup-session.webm'
    const ext = recordingFileExtension(sessionRecording)
    const id = soloSyncKey ?? 'session'
    return `pushup-session-${id}.${ext}`
  }, [sessionRecording, soloSyncKey])

  const analyzeInLab = useCallback(async () => {
    if (!sessionRecording || !import.meta.env.DEV) return
    try {
      await savePushupLabHandoff({
        blob: sessionRecording,
        fileName: downloadFilename,
        reps,
        variant,
        durationSec: sessionDurationSec,
        exportedAt: new Date().toISOString(),
      })
      navigate('/dev/pushup-lab')
    } catch (e) {
      console.error('[pushup-lab] handoff failed', e)
    }
  }, [sessionRecording, downloadFilename, reps, variant, sessionDurationSec, navigate])

  useEffect(() => {
    if (!soloSyncKey) return

    let cancelled = false
    const startedAt = performance.now()
    const recordingBytes = recordingRef.current?.size ?? 0
    console.info('[solo-ui] save start', {
      sessionId: soloSyncKey,
      reps: repsRef.current,
      hasVideo: recordingBytes > 0,
      videoBytes: recordingBytes,
      retryNonce: saveRetryNonce,
    })
    startTransition(() => {
      setSoloStatus('saving')
      setSoloError(null)
      setServerVideoUrl(null)
      setUploadPercent(null)
      setSoloCloudPhase(recordingRef.current && recordingRef.current.size > 0 ? 'uploading' : null)
    })

    soloSaveDispatchRef.current = {
      onUploadProgress: (loaded, total) => {
        if (cancelled || total <= 0) return
        const pct = Math.min(100, Math.round((loaded / total) * 100))
        startTransition(() => setUploadPercent(pct))
      },
      onPhaseChange: (phase) => {
        if (cancelled) return
        console.info('[solo-ui] phase=', phase, {
          sessionId: soloSyncKey,
          msSinceStart: Math.round(performance.now() - startedAt),
        })
        startTransition(() => {
          setSoloCloudPhase(phase)
          if (phase === 'processing') setUploadPercent(null)
        })
      },
    }

    void (async () => {
      try {
        const result = await createSoloSession(
          getTokenRef.current,
          {
            reps: repsRef.current,
            video: recordingRef.current,
            sessionId: soloSyncKey,
            saveRetryNonce,
            captureContext: captureContextRef.current,
          },
          {
            onUploadProgress: onSoloUploadProgressBridge,
            onPhaseChange: onSoloPhaseChangeBridge,
          },
        )
        if (cancelled) return
        console.info('[solo-ui] save success', {
          sessionId: soloSyncKey,
          totalMs: Math.round(performance.now() - startedAt),
          serverVideoUrl: Boolean(result.videoUrl),
        })
        setSoloStatus('saved')
        setSoloCloudPhase(null)
        setServerVideoUrl(result.videoUrl)
        setUploadPercent(null)
      } catch (e) {
        if (cancelled) return
        console.warn('[solo-ui] save error', {
          sessionId: soloSyncKey,
          totalMs: Math.round(performance.now() - startedAt),
          err: e instanceof Error ? e.message : String(e),
        })
        setSoloStatus('error')
        setSoloCloudPhase(null)
        setSoloError(formatError(e))
        setUploadPercent(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [soloSyncKey, saveRetryNonce, onSoloUploadProgressBridge, onSoloPhaseChangeBridge])

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

  const retryCloudSave = () => {
    setSaveRetryNonce((n) => n + 1)
  }

  const saveBannerRecording = Boolean(sessionRecording && sessionRecording.size > 0)
  const savingHeadline =
    soloCloudPhase === 'processing'
      ? 'Verifying upload and saving your session…'
      : saveBannerRecording
        ? `Uploading recording${formatRecordingSizeHint(sessionRecording!.size)}…`
        : 'Saving your session…'

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
          </div>

          {soloStatus === 'saving' ? (
            <div className="pushup-results-solo-save pushup-results-solo-save--pending" role="status">
              <span className="pushup-results-solo-save-dot" aria-hidden />
              <div className="pushup-results-solo-save-body">
                <span>
                  {savingHeadline}
                  {soloCloudPhase === 'uploading' && uploadPercent != null ? ` ${uploadPercent}%` : ''}
                </span>
                {soloCloudPhase === 'uploading' && uploadPercent != null ? (
                  <progress
                    className="pushup-results-solo-save-progress"
                    value={uploadPercent}
                    max={100}
                    aria-label="Upload progress"
                  />
                ) : null}
                {soloCloudPhase === 'processing' ? (
                  <progress className="pushup-results-solo-save-progress" aria-label="Processing upload" />
                ) : null}
                <span className="pushup-results-solo-save-hint">
                  Keep this browser tab open until the upload completes. Closing or refreshing can interrupt saving.
                  You can use other routes in this app — your recording will appear in session history shortly after it
                  finishes.
                </span>
              </div>
            </div>
          ) : null}
          {soloStatus === 'saved' ? (
            <div className="pushup-results-solo-save" role="status">
              <span className="pushup-results-solo-save-dot" aria-hidden />
              Saved — reps and video added to your account
            </div>
          ) : null}
          {soloStatus === 'error' && soloError ? (
            <div className="pushup-results-solo-error-block">
              <p className="pushup-results-solo-error" role="alert">
                Could not save: {soloError}
              </p>
              <button type="button" className="pushup-results-solo-btn-ghost" onClick={retryCloudSave}>
                {saveBannerRecording ? 'Retry upload' : 'Retry save'}
              </button>
            </div>
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
        <div className="banner banner-warn" role="status" style={{ marginTop: '0.75rem' }}>
          <div>
            {savingHeadline}
            {soloCloudPhase === 'uploading' && uploadPercent != null ? ` ${uploadPercent}%` : ''}
          </div>
          {soloCloudPhase === 'uploading' && uploadPercent != null ? (
            <progress
              value={uploadPercent}
              max={100}
              style={{ width: '100%', marginTop: '0.5rem', height: '6px' }}
              aria-label="Upload progress"
            />
          ) : null}
          {soloCloudPhase === 'processing' ? (
            <progress aria-label="Processing upload" style={{ width: '100%', marginTop: '0.5rem', height: '6px' }} />
          ) : null}
          <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.35 }}>
            Keep this browser tab open until the upload completes. Closing or refreshing can interrupt saving. Other
            pages in this app are fine — your recording will show in session history shortly after upload finishes.
          </p>
        </div>
      ) : null}
      {soloStatus === 'saved' ? (
        <p className="banner banner-success" role="status" style={{ marginTop: '0.75rem' }}>
          Session saved to your account.
        </p>
      ) : null}
      {soloStatus === 'error' && soloError ? (
        <div style={{ marginTop: '0.75rem' }}>
          <p className="banner banner-error" role="alert">
            Could not save session: {soloError}
          </p>
          <button type="button" className="btn btn-secondary pushup-results-cta-secondary" onClick={retryCloudSave}>
            {saveBannerRecording ? 'Retry upload' : 'Retry save'}
          </button>
        </div>
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
          <button
            type="button"
            className="btn btn-secondary pushup-results-cta-secondary"
            onClick={() => void analyzeInLab()}
          >
            Analyze in pushup lab
          </button>
        ) : null}
        {sessionRecording && import.meta.env.DEV ? (
          <p className="pushup-results-recording-hint muted">
            Usually WebM. Use <strong>Analyze in pushup lab</strong> or upload the file at{' '}
            <Link to="/dev/pushup-lab">Pushup algorithm lab</Link>.
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
