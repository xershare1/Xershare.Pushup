import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playCountdownBeep } from '../../lib/audio/sessionAudio'
import { PushupService } from '../../lib/pose/pushupService'
import {
  evaluateReadiness,
} from '../../lib/pose/pushupReadinessChecks'
import {
  advanceRepTrackerFromPoseFrameBased,
  createInitialFrameRepTracker,
} from '../../lib/pose/pushupRepTracking'
import {
  usePoseEstimationLoop,
  type PoseFramePayload,
} from '../../lib/pose/usePoseEstimationLoop'
import { ActiveSessionHud } from './ActiveSessionHud'
import { CountdownOverlay } from './CountdownOverlay'
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
}

const STABLE_FRAMES = 14
const WARMUP_FRAMES = 6

const PUSHUP_POSE_DEBUG = import.meta.env.DEV

export function PushupSession({ onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [sessionState, setSessionState] = useState<PushupSessionState>('INITIALIZING')
  const sessionStateRef = useRef(sessionState)
  sessionStateRef.current = sessionState

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const [pushupPos, setPushupPos] = useState(false)
  const [pushupHint, setPushupHint] = useState<string | null>(null)

  const [countdownValue, setCountdownValue] = useState(3)
  const [reps, setReps] = useState(0)
  const [remainingSec, setRemainingSec] = useState(60)
  const [motion01, setMotion01] = useState(0.5)
  const [sessionRecording, setSessionRecording] = useState<Blob | null>(null)

  const pushupServiceRef = useRef(new PushupService())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const warmupFramesRef = useRef(0)
  const stableFramesRef = useRef(0)

  const repTrackerRef = useRef(createInitialFrameRepTracker())

  /** Last logged pose snapshot (active session) — only console when something changes */
  const lastPoseDebugRef = useRef<{
    backStraight: boolean
    rawUp: boolean
    rawDown: boolean
    validated: 'up' | 'down' | 'transition'
  } | null>(null)

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
    setCountdownValue(3)
    setMotion01(0.5)
    setPushupPos(false)
    setPushupHint(null)
    setSessionRecording(null)
    setSessionState('READINESS_CHECK')
  }, [])

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

  /** Not memoized: pose loop syncs onFrameRef each render; stale useCallback([]) can strand an old handler. */
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
      }
      return
    }

    const { pose } = payload

    if (state === 'READINESS_CHECK') {
      const r = evaluateReadiness(pose, vw, vh, svc)
      setPushupPos(r.pushupPosition)
      setPushupHint(r.pushupHint)
      if (r.pushupPosition) {
        stableFramesRef.current += 1
        if (stableFramesRef.current >= STABLE_FRAMES) {
          stableFramesRef.current = 0
          setCountdownValue(3)
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
    setCountdownValue(3)
    playCountdownBeep()
    let step = 0
    const id = window.setInterval(() => {
      if (cancelled) return
      step += 1
      if (step >= 3) {
        window.clearInterval(id)
        resetRepLogic()
        setRemainingSec(60)
        if (!cancelled) setSessionState('ACTIVE_SESSION')
        return
      }
      setCountdownValue(3 - step)
      playCountdownBeep()
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
        setSessionState('RESULTS')
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [sessionState])

  const handleStop = useCallback(() => {
    setSessionState('RESULTS')
  }, [])

  const showSessionChrome = sessionState !== 'RESULTS'

  return (
    <div className="pushup-session card stack">
      {showSessionChrome ? (
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
        <p className="banner banner-error" role="alert">
          {cameraError}
        </p>
      ) : null}
      {poseLoopError && !cameraError ? (
        <p className="banner banner-warn" role="status">
          Pose model: {poseLoopError}
        </p>
      ) : null}

      {sessionState === 'RESULTS' ? (
        <SessionResults
          reps={reps}
          onTryAgain={handleTryAgain}
          onBack={onBack}
          sessionRecording={sessionRecording}
        />
      ) : null}

      <div
        className={
          sessionState === 'RESULTS'
            ? 'pushup-session-video-wrap pushup-session-video-wrap--hidden'
            : 'pushup-session-video-wrap'
        }
        aria-hidden={sessionState === 'RESULTS'}
      >
        <video
          ref={videoRef}
          className="pushup-session-video"
          autoPlay
          playsInline
          muted
        />

        <div className="pushup-session-overlay-root">
          <AnimatePresence>
            {sessionState === 'INITIALIZING' && !cameraError ? (
              <motion.div
                key="init"
                className="pushup-init-overlay"
                style={{ position: 'absolute', inset: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="pushup-spinner" aria-hidden />
                <p className="pushup-init-title">Initializing</p>
                <p className="pushup-init-sub">Getting camera and pose ready…</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {sessionState === 'READINESS_CHECK' ? (
            <div style={{ position: 'absolute', top: 12, left: 12, maxWidth: 'calc(100% - 24px)' }}>
              <ReadinessChecklist pushupPosition={pushupPos} pushupHint={pushupHint} />
            </div>
          ) : null}

          {sessionState === 'COUNTDOWN' ? (
            <div className="pushup-countdown-wrap">
              <CountdownOverlay value={countdownValue} />
            </div>
          ) : null}

          {sessionState === 'ACTIVE_SESSION' ? (
            <ActiveSessionHud
              reps={reps}
              remainingSec={remainingSec}
              motion01={motion01}
              onStop={handleStop}
            />
          ) : null}
        </div>
      </div>

      {sessionState !== 'RESULTS' ? (
        <div className="actions wrap">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  )
}
