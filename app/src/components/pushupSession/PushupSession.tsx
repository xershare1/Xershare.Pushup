import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchSoloSessions } from '../../api/solo'
import { playCountdownBeep } from '../../lib/audio/sessionAudio'
import { PushupService } from '../../lib/pose/pushupService'
import { evaluateReadiness, getSoloReadinessChecklist } from '../../lib/pose/pushupReadinessChecks'
import type { SoloReadinessChecklist } from '../../lib/pose/pushupReadinessChecks'
import {
  advanceRepTrackerFromPoseFrameBased,
  createInitialFrameRepTracker,
} from '../../lib/pose/pushupRepTracking'
import {
  usePoseEstimationLoop,
  type PoseFramePayload,
} from '../../lib/pose/usePoseEstimationLoop'
import { ActiveSessionHud } from './ActiveSessionHud'
import { CountdownOverlay, type CountdownPhase } from './CountdownOverlay'
import { ReadinessChecklist } from './ReadinessChecklist'
import { SessionResults } from './SessionResults'
import './pushup-session.css'

export type PushupSessionState =
  | 'INITIALIZING'
  | 'READINESS_CHECK'
  | 'COUNTDOWN'
  | 'ACTIVE_SESSION'
  | 'RESULTS'

type Props = {
  onBack: () => void
  variant?: 'solo' | 'default'
  /** When set, skips RESULTS; second arg is finalized recording or null (e.g. challenge submit). */
  onSessionComplete?: (reps: number, recording: Blob | null) => void
}

const SOLO_CHECKLIST_WAIT: SoloReadinessChecklist = {
  fullBody: 'waiting',
  lighting: 'waiting',
  armsForm: 'waiting',
  holdSteady: 'waiting',
}

/** ~2 seconds at 30fps — hold plank before countdown */
const STABLE_FRAMES = 60
const WARMUP_FRAMES = 6

const PUSHUP_POSE_DEBUG = import.meta.env.DEV

function maxRepsAllTime(sessions: { reps: number }[]): number | null {
  if (!sessions.length) return null
  return sessions.reduce((m, s) => Math.max(m, s.reps), 0)
}

function maxRepsLast7Days(sessions: { reps: number; createdAt: string }[]): number | null {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  let m = 0
  let any = false
  for (const s of sessions) {
    if (new Date(s.createdAt).getTime() >= cutoff) {
      any = true
      if (s.reps > m) m = s.reps
    }
  }
  return any ? m : null
}

export function PushupSession({ onBack, variant = 'default', onSessionComplete }: Props) {
  const { getToken } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activeSessionStartedAtRef = useRef<number | null>(null)

  const [sessionState, setSessionState] = useState<PushupSessionState>('INITIALIZING')
  const sessionStateRef = useRef<PushupSessionState>(sessionState)
  useLayoutEffect(() => {
    sessionStateRef.current = sessionState
  }, [sessionState])

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const [pushupPos, setPushupPos] = useState(false)
  const [pushupHint, setPushupHint] = useState<string | null>(null)

  const [countdownPhase, setCountdownPhase] = useState<CountdownPhase>(3)
  const [reps, setReps] = useState(0)
  const [remainingSec, setRemainingSec] = useState(60)
  const [motion01, setMotion01] = useState(0.5)
  const [sessionRecording, setSessionRecording] = useState<Blob | null>(null)
  const [soloSyncKey, setSoloSyncKey] = useState<string | null>(null)
  const [sessionDurationSec, setSessionDurationSec] = useState(60)
  const [soloChecklist, setSoloChecklist] = useState<SoloReadinessChecklist>(SOLO_CHECKLIST_WAIT)
  const [priorPersonalBest, setPriorPersonalBest] = useState<number | null>(null)
  const [bestInLast7Days, setBestInLast7Days] = useState<number | null>(null)

  const pushupServiceRef = useRef(new PushupService())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const warmupFramesRef = useRef(0)
  const stableFramesRef = useRef(0)

  const repTrackerRef = useRef(createInitialFrameRepTracker())

  const lastPoseDebugRef = useRef<{
    backStraight: boolean
    rawUp: boolean
    rawDown: boolean
    validated: 'up' | 'down' | 'transition'
  } | null>(null)

  const reloadPriorStats = useCallback(async () => {
    if (variant !== 'solo') return
    try {
      const list = await fetchSoloSessions(getToken)
      setPriorPersonalBest(maxRepsAllTime(list))
      setBestInLast7Days(maxRepsLast7Days(list))
    } catch {
      setPriorPersonalBest(null)
      setBestInLast7Days(null)
    }
  }, [variant, getToken])

  useEffect(() => {
    const id = window.setTimeout(() => void reloadPriorStats(), 0)
    return () => window.clearTimeout(id)
  }, [reloadPriorStats])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 960 },
            height: { ideal: 540 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const el = videoRef.current
        if (el) {
          el.srcObject = stream
          await el.play()
        }
        setCameraReady(true)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not access camera.'
        setCameraError(
          /Permission|NotAllowed|denied/i.test(msg)
            ? 'Camera permission was denied. Allow access in your browser settings and try again.'
            : msg,
        )
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const poseEnabled = cameraReady && sessionState !== 'RESULTS' && !cameraError

  useEffect(() => {
    if (sessionState !== 'ACTIVE_SESSION') {
      lastPoseDebugRef.current = null
    }
    if (sessionState === 'ACTIVE_SESSION') {
      activeSessionStartedAtRef.current = Date.now()
    }
  }, [sessionState])

  const resetRepLogic = useCallback(() => {
    repTrackerRef.current = createInitialFrameRepTracker()
    setReps(0)
  }, [])

  const handleTryAgain = useCallback(() => {
    warmupFramesRef.current = WARMUP_FRAMES
    stableFramesRef.current = 0
    repTrackerRef.current = createInitialFrameRepTracker()
    setReps(0)
    setRemainingSec(60)
    setCountdownPhase(3)
    setMotion01(0.5)
    setPushupPos(false)
    setPushupHint(null)
    setSessionRecording(null)
    setSoloSyncKey(null)
    setSoloChecklist(SOLO_CHECKLIST_WAIT)
    setSessionState('READINESS_CHECK')
    void reloadPriorStats()
  }, [reloadPriorStats])

  const finalizeRecordingBlob = useCallback(async (): Promise<Blob | null> => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state === 'recording') {
      await new Promise<void>((resolve) => {
        const orig = rec.onstop
        rec.onstop = (ev: Event) => {
          if (orig) orig.call(rec, ev)
          resolve()
        }
        try {
          rec.stop()
        } catch {
          resolve()
        }
      })
    }
    const parts = recordedChunksRef.current
    if (parts.length === 0) return null
    const mime = rec?.mimeType || 'video/webm'
    return new Blob(parts, { type: mime })
  }, [])

  const finishSession = useCallback(async () => {
    const started = activeSessionStartedAtRef.current
    const durationSec =
      started != null
        ? Math.min(60, Math.max(0, Math.round((Date.now() - started) / 1000)))
        : 60
    if (onSessionComplete) {
      const reps = repTrackerRef.current.repCount
      const blob = await finalizeRecordingBlob()
      onSessionComplete(reps, blob)
    } else {
      const blob = await finalizeRecordingBlob()
      setSessionRecording(blob)
      setSessionDurationSec(durationSec)
      setSoloSyncKey(crypto.randomUUID())
      setSessionState('RESULTS')
    }
  }, [onSessionComplete, finalizeRecordingBlob])

  useEffect(() => {
    if (sessionState !== 'ACTIVE_SESSION') return
    const stream = streamRef.current
    if (!stream || typeof MediaRecorder === 'undefined') return

    recordedChunksRef.current = []
    let mime = ''
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mime = 'video/webm;codecs=vp9'
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mime = 'video/webm;codecs=vp8'
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mime = 'video/webm'
    }

    let recorder: MediaRecorder
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch {
      return
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const parts = recordedChunksRef.current
      if (parts.length === 0) {
        setSessionRecording(null)
        return
      }
      const blob = new Blob(parts, { type: recorder.mimeType || 'video/webm' })
      setSessionRecording(blob)
    }

    mediaRecorderRef.current = recorder
    try {
      recorder.start(1000)
    } catch {
      mediaRecorderRef.current = null
      return
    }

    return () => {
      const rec = mediaRecorderRef.current
      mediaRecorderRef.current = null
      if (rec && rec.state === 'recording') {
        rec.stop()
      }
    }
  }, [sessionState])

  const onPoseFrame = (payload: PoseFramePayload | null) => {
    const state = sessionStateRef.current
    const video = videoRef.current
    if (!video || state === 'RESULTS') return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw === 0 || vh === 0) return

    const svc = pushupServiceRef.current

    if (state === 'INITIALIZING') {
      warmupFramesRef.current += 1
      if (warmupFramesRef.current >= WARMUP_FRAMES) {
        setSessionState('READINESS_CHECK')
      }
      return
    }

    if (!payload || (payload.poseScore ?? 0) < 0.25) {
      if (state === 'READINESS_CHECK') {
        setPushupPos(false)
        setPushupHint(null)
        stableFramesRef.current = 0
        if (variant === 'solo') {
          setSoloChecklist(SOLO_CHECKLIST_WAIT)
        }
      }
      return
    }

    const { pose } = payload

    if (state === 'READINESS_CHECK') {
      const r = evaluateReadiness(pose, vw, vh, svc)
      setPushupPos(r.pushupPosition)
      setPushupHint(r.pushupHint)
      if (variant === 'solo') {
        const cl = getSoloReadinessChecklist(pose, payload.poseScore ?? 0, svc, r.pushupPosition)
        setSoloChecklist((prev) =>
          prev.fullBody === cl.fullBody &&
          prev.lighting === cl.lighting &&
          prev.armsForm === cl.armsForm &&
          prev.holdSteady === cl.holdSteady
            ? prev
            : cl,
        )
      }
      if (r.pushupPosition) {
        stableFramesRef.current += 1
        if (stableFramesRef.current >= STABLE_FRAMES) {
          stableFramesRef.current = 0
          setCountdownPhase(3)
          setSessionState('COUNTDOWN')
        }
      } else {
        stableFramesRef.current = 0
      }
      return
    }

    if (state === 'COUNTDOWN') {
      return
    }

    if (state === 'ACTIVE_SESSION') {
      const r = advanceRepTrackerFromPoseFrameBased(
        pose,
        payload.poseScore,
        vw,
        vh,
        svc,
        repTrackerRef.current,
      )
      repTrackerRef.current = r.state
      setReps(r.state.repCount)

      if (r.debug) {
        setMotion01(r.debug.motion01)
      }

      if (PUSHUP_POSE_DEBUG && r.debug) {
        const prev = lastPoseDebugRef.current
        const snap = {
          backStraight: r.debug.backStraight,
          rawUp: r.debug.rawUp,
          rawDown: r.debug.rawDown,
          validated: r.debug.validatedPosition,
        }
        if (
          !prev ||
          prev.backStraight !== snap.backStraight ||
          prev.rawUp !== snap.rawUp ||
          prev.rawDown !== snap.rawDown ||
          prev.validated !== snap.validated
        ) {
          lastPoseDebugRef.current = snap
          console.log('[pushup-pose]', {
            elbowDeg: r.debug.normalizedElbowDeg,
            backCosine: r.debug.backCosine,
            backStraight: snap.backStraight,
            allWayUp: snap.rawUp,
            allWayDown: snap.rawDown,
            validatedPosition: snap.validated,
          })
        }
      }
    }
  }

  const { error: poseLoopError } = usePoseEstimationLoop(videoRef, poseEnabled, onPoseFrame)

  useEffect(() => {
    if (sessionState !== 'COUNTDOWN') return
    let cancelled = false
    playCountdownBeep()
    let step = 0
    const id = window.setInterval(() => {
      if (cancelled) return
      step += 1
      if (step === 1) {
        setCountdownPhase(2)
        playCountdownBeep()
        return
      }
      if (step === 2) {
        setCountdownPhase(1)
        playCountdownBeep()
        return
      }
      if (step === 3) {
        setCountdownPhase('go')
        playCountdownBeep()
        return
      }
      if (step >= 4) {
        window.clearInterval(id)
        resetRepLogic()
        setRemainingSec(60)
        if (!cancelled) setSessionState('ACTIVE_SESSION')
      }
    }, 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [sessionState, resetRepLogic])

  useEffect(() => {
    if (sessionState !== 'ACTIVE_SESSION') return
    const start = Date.now()
    const id = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - start) / 1000)
      const left = Math.max(0, 60 - elapsedSec)
      setRemainingSec(left)
      if (left <= 0) {
        window.clearInterval(id)
        void finishSession()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [sessionState, finishSession])

  const handleStop = useCallback(() => {
    void finishSession()
  }, [finishSession])

  const showSessionChrome = sessionState !== 'RESULTS'
  const isSoloFullBleed = variant === 'solo' && sessionState !== 'RESULTS'

  return (
    <div
      className={
        isSoloFullBleed
          ? 'pushup-session pushup-session--solo-fullbleed'
          : 'pushup-session card stack'
      }
    >
      {isSoloFullBleed ? (
        <button type="button" className="pushup-solo-cancel" onClick={onBack}>
          Cancel
        </button>
      ) : null}

      {showSessionChrome && variant !== 'solo' ? (
        <>
          <h2 className="page-title" style={{ marginBottom: 0 }}>
            Pushup session
          </h2>
          <p className="lede" style={{ marginBottom: 0 }}>
            Stay on this screen. Follow the prompts — your set runs up to 60 seconds.
          </p>
        </>
      ) : null}

      {cameraError ? (
        <p
          className={`banner banner-error ${isSoloFullBleed ? 'pushup-solo-banner' : ''}`}
          role="alert"
        >
          {cameraError}
        </p>
      ) : null}
      {poseLoopError && !cameraError ? (
        <p
          className={`banner banner-warn ${isSoloFullBleed ? 'pushup-solo-banner' : ''}`}
          role="status"
        >
          Pose model: {poseLoopError}
        </p>
      ) : null}

      {sessionState === 'RESULTS' ? (
        <SessionResults
          reps={reps}
          onTryAgain={handleTryAgain}
          onBack={onBack}
          sessionRecording={sessionRecording}
          soloSyncKey={soloSyncKey}
          variant={variant}
          sessionDurationSec={sessionDurationSec}
          priorPersonalBest={priorPersonalBest}
          bestInLast7Days={bestInLast7Days}
        />
      ) : null}

      <div
        className={
          sessionState === 'RESULTS'
            ? 'pushup-session-video-wrap pushup-session-video-wrap--hidden'
            : isSoloFullBleed
              ? 'pushup-session-video-wrap pushup-session-video-wrap--fullbleed'
              : 'pushup-session-video-wrap'
        }
        aria-hidden={sessionState === 'RESULTS'}
      >
        <video ref={videoRef} className="pushup-session-video" autoPlay playsInline muted />

        <div className="pushup-session-overlay-root">
          <AnimatePresence>
            {sessionState === 'INITIALIZING' && !cameraError ? (
              <motion.div
                key="init"
                className={
                  variant === 'solo'
                    ? 'pushup-init-overlay pushup-init-overlay--solo'
                    : 'pushup-init-overlay'
                }
                style={{ position: 'absolute', inset: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {variant === 'solo' ? (
                  <>
                    <span className="pushup-init-pill">Camera starting</span>
                    <div className="pushup-spinner pushup-spinner--solo" aria-hidden />
                    <p className="pushup-init-title pushup-init-title--solo">Getting ready…</p>
                    <p className="pushup-init-sub pushup-init-sub--solo">
                      Setting up camera and pose detection. This takes a few seconds.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="pushup-spinner" aria-hidden />
                    <p className="pushup-init-title">Initializing</p>
                    <p className="pushup-init-sub">Getting camera and pose ready…</p>
                  </>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {sessionState === 'READINESS_CHECK' && variant === 'solo' ? (
            <div className="pushup-readiness-solo-center">
              <ReadinessChecklist variant="solo" checklist={soloChecklist} />
            </div>
          ) : null}
          {sessionState === 'READINESS_CHECK' && variant !== 'solo' ? (
            <div style={{ position: 'absolute', top: 12, left: 12, maxWidth: 'calc(100% - 24px)' }}>
              <ReadinessChecklist pushupPosition={pushupPos} pushupHint={pushupHint} />
            </div>
          ) : null}

          {sessionState === 'COUNTDOWN' ? (
            <div className="pushup-countdown-wrap">
              <CountdownOverlay phase={countdownPhase} />
            </div>
          ) : null}

          {sessionState === 'ACTIVE_SESSION' ? (
            <ActiveSessionHud
              reps={reps}
              remainingSec={remainingSec}
              motion01={motion01}
              onStop={handleStop}
              variant={variant === 'solo' ? 'solo' : 'default'}
              personalBest={priorPersonalBest}
            />
          ) : null}
        </div>
      </div>

      {sessionState !== 'RESULTS' && !isSoloFullBleed ? (
        <div className="actions wrap">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  )
}
