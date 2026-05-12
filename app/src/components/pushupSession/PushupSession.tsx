import { useAuth } from '@clerk/react'
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useVoiceRepCounterPreference } from '../../context/useVoiceRepCounterPreference'
import { fetchSoloSessions } from '../../api/solo'
import { playCountdownBeep, playLastTenFinalBeep, playLastTenTickBeep } from '../../lib/audio/sessionAudio'
import { useVoiceCounter } from '../../lib/voice/useVoiceCounter'
import { loadMoveNetDetector } from '../../lib/pose/loadMoveNetDetector'
import {
  probePoseModelCachePrimed,
  schedulePoseModelCacheWarm,
} from '../../lib/pose/poseModelCacheWarm'
import { PushupService } from '../../lib/pose/pushupService'
import type { SoloReadinessChecklist } from '../../lib/pose/pushupReadinessChecks'
import {
  computeCaptureConfidence,
  confidenceToSoloChecklistStatuses,
  hipMidpointFromPose,
  pickGuidance,
} from '../../lib/capture/captureConfidence'
import { getExerciseCaptureProfile, isOrientationAdvisoryActive } from '../../lib/capture/exerciseCaptureProfiles'
import framingGuideSvgUrl from '../../assets/pushup-framing-guide.svg?url'
import {
  buildSessionStartCaptureContext,
  readScreenOrientationFlags,
  type SessionStartCaptureContext,
} from '../../lib/capture/sessionCaptureContext'
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
import { composePushupRecordingFrame, type CompositeSnapshot } from './sessionRecordingCompositor'
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

const ACTIVE_EXERCISE_ID = 'pushup' as const
const captureProfile = getExerciseCaptureProfile(ACTIVE_EXERCISE_ID)

const WARMUP_FRAMES = 6

const PUSHUP_POSE_DEBUG = import.meta.env.DEV

type DetectorLoadState = 'loading' | 'ready' | 'error'

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
  const { voiceRepCounterEnabled } = useVoiceRepCounterPreference()
  const variantRef = useRef(variant)
  useLayoutEffect(() => {
    variantRef.current = variant
  }, [variant])

  const soloFramingDoneRef = useRef(variant !== 'solo')
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoWrapRef = useRef<HTMLDivElement>(null)
  const recordCanvasRef = useRef<HTMLCanvasElement>(null)
  const compositeSnapshotRef = useRef<CompositeSnapshot | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activeSessionStartedAtRef = useRef<number | null>(null)
  /** When true, time elapsed or user stopped — block pose/reps immediately (do not wait for async finishSession). */
  const activeSessionEndedRef = useRef(false)
  /** Double rAF awaiting one composited overlay frame at 0:00 before stopping MediaRecorder (natural end only). */
  const deferredNaturalFinishRafSlotRef = useRef<{
    outer: number | null
    inner: number | null
  } | null>(null)
  const finishingSessionRef = useRef(false)

  const [sessionState, setSessionState] = useState<PushupSessionState>('INITIALIZING')
  const sessionStateRef = useRef<PushupSessionState>(sessionState)
  useLayoutEffect(() => {
    sessionStateRef.current = sessionState
  }, [sessionState])

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const mirrorPreviewForPose = facingMode === 'user'
  const facingModeRef = useRef(facingMode)
  useLayoutEffect(() => {
    facingModeRef.current = facingMode
  }, [facingMode])

  const [soloFramingCardDone, setSoloFramingCardDone] = useState(variant !== 'solo')
  useLayoutEffect(() => {
    soloFramingDoneRef.current = soloFramingCardDone
  }, [soloFramingCardDone])

  const [screenLand, setScreenLand] = useState(() => readScreenOrientationFlags().isLandscape)
  const [orientationAdvisoryDismissed, setOrientationAdvisoryDismissed] = useState(false)
  const [framingLossWarning, setFramingLossWarning] = useState(false)
  const [sessionCaptureContext, setSessionCaptureContext] = useState<SessionStartCaptureContext | null>(null)

  const hipPrevRef = useRef<{ x: number; y: number } | null>(null)
  const readinessRollingRef = useRef<{ composite: number; plank: boolean }[]>([])
  const activeFramingBadMsRef = useRef(0)
  const lastPoseTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const apply = () => {
      startTransition(() => setScreenLand(readScreenOrientationFlags().isLandscape))
    }

    /** Double rAF catches Safari layout lag after resize / orientation transitions. */
    const sync = () => {
      apply()
      requestAnimationFrame(() => {
        requestAnimationFrame(apply)
      })
    }

    sync()

    const o = screen.orientation
    o?.addEventListener('change', sync)

    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)

    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)

    const mqLand = window.matchMedia('(orientation: landscape)')
    mqLand.addEventListener('change', sync)

    return () => {
      o?.removeEventListener('change', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      vv?.removeEventListener('resize', sync)
      mqLand.removeEventListener('change', sync)
    }
  }, [])

  const [pushupPos, setPushupPos] = useState(false)
  const [pushupHint, setPushupHint] = useState<string | null>(null)

  const [countdownPhase, setCountdownPhase] = useState<CountdownPhase>(3)
  const [reps, setReps] = useState(0)
  const [remainingSec, setRemainingSec] = useState(60)
  const remainingSecRef = useRef(remainingSec)
  useLayoutEffect(() => {
    remainingSecRef.current = remainingSec
  }, [remainingSec])
  const [motion01, setMotion01] = useState(0.5)
  const [sessionRecording, setSessionRecording] = useState<Blob | null>(null)
  const [soloSyncKey, setSoloSyncKey] = useState<string | null>(null)
  const [sessionDurationSec, setSessionDurationSec] = useState(60)
  const [soloChecklist, setSoloChecklist] = useState<SoloReadinessChecklist>(SOLO_CHECKLIST_WAIT)
  const [priorPersonalBest, setPriorPersonalBest] = useState<number | null>(null)
  const [bestInLast7Days, setBestInLast7Days] = useState<number | null>(null)
  const pbFrozenForVoiceRef = useRef(0)

  const [detectorLoadState, setDetectorLoadState] =
    useState<DetectorLoadState>('loading')
  const [poseCacheLikelyPrimed, setPoseCacheLikelyPrimed] = useState<boolean | null>(null)

  const pushupServiceRef = useRef(new PushupService())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const warmupFramesRef = useRef(0)

  const repTrackerRef = useRef(createInitialFrameRepTracker())

  const lastPoseDebugRef = useRef<{
    backStraight: boolean
    rawUp: boolean
    rawDown: boolean
    validated: 'up' | 'down' | 'transition'
  } | null>(null)

  const prevSessionStateForPbFreeze = useRef<PushupSessionState | null>(null)
  useLayoutEffect(() => {
    const prev = prevSessionStateForPbFreeze.current
    if (
      prev != null &&
      prev !== 'COUNTDOWN' &&
      sessionState === 'COUNTDOWN'
    ) {
      const pb = variant === 'solo' ? priorPersonalBest ?? 0 : 0
      pbFrozenForVoiceRef.current = pb
    }
    prevSessionStateForPbFreeze.current = sessionState
  }, [sessionState, variant, priorPersonalBest])

  const getPersonalBestAtSessionStart = useCallback(() => pbFrozenForVoiceRef.current, [])

  const { announceRep, cancelAllSpeech, sessionVoiceMutedLocal, toggleSessionVoiceMute } =
    useVoiceCounter({
      settingsEnabled: voiceRepCounterEnabled,
      getPersonalBestAtSessionStart,
    })

  const voiceRepCounterEnabledRef = useRef(voiceRepCounterEnabled)
  const sessionVoiceMutedLocalRef = useRef(sessionVoiceMutedLocal)
  const cancelAllSpeechRef = useRef(cancelAllSpeech)
  useLayoutEffect(() => {
    voiceRepCounterEnabledRef.current = voiceRepCounterEnabled
    sessionVoiceMutedLocalRef.current = sessionVoiceMutedLocal
    cancelAllSpeechRef.current = cancelAllSpeech
  }, [voiceRepCounterEnabled, sessionVoiceMutedLocal, cancelAllSpeech])

  useLayoutEffect(() => {
    if (sessionState !== 'COUNTDOWN' && sessionState !== 'ACTIVE_SESSION') {
      compositeSnapshotRef.current = null
      return
    }
    compositeSnapshotRef.current = {
      sessionState,
      countdownPhase,
      reps,
      remainingSec,
      motion01,
      variant,
      personalBest: priorPersonalBest,
      voiceHudVisible: voiceRepCounterEnabled,
      voiceMuted: sessionVoiceMutedLocal,
      framingLossWarning,
    }
  }, [
    sessionState,
    countdownPhase,
    reps,
    remainingSec,
    motion01,
    variant,
    priorPersonalBest,
    voiceRepCounterEnabled,
    sessionVoiceMutedLocal,
    framingLossWarning,
  ])

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
    schedulePoseModelCacheWarm()
  }, [])

  useEffect(() => {
    void probePoseModelCachePrimed().then(setPoseCacheLikelyPrimed)
  }, [])

  /** Overlap TF.js WebGL + MoveNet fetch with camera permission / stream startup. */
  useEffect(() => {
    startTransition(() => setDetectorLoadState('loading'))
    void loadMoveNetDetector().then(
      () => setDetectorLoadState('ready'),
      () => setDetectorLoadState('error'),
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    startTransition(() => {
      setCameraReady(false)
      setCameraError(null)
    })
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 960, max: 960 },
            height: { ideal: 540, max: 540 },
            frameRate: { ideal: 24, max: 24 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        const el = videoRef.current
        if (el) {
          el.srcObject = stream
          await el.play()
        }
        setCameraReady(true)
      } catch (e) {
        if (cancelled) return
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
  }, [facingMode])

  const poseEnabled = cameraReady && sessionState !== 'RESULTS' && !cameraError

  useEffect(() => {
    if (sessionState !== 'ACTIVE_SESSION') {
      lastPoseDebugRef.current = null
    }
    if (sessionState === 'ACTIVE_SESSION') {
      activeSessionStartedAtRef.current = Date.now()
      activeSessionEndedRef.current = false
      activeFramingBadMsRef.current = 0
      lastPoseTimeRef.current = null
      hipPrevRef.current = null
      startTransition(() => setFramingLossWarning(false))
    }
  }, [sessionState])

  const resetRepLogic = useCallback(() => {
    repTrackerRef.current = createInitialFrameRepTracker()
    setReps(0)
  }, [])

  const handleTryAgain = useCallback(() => {
    cancelAllSpeech()
    warmupFramesRef.current = 0
    readinessRollingRef.current = []
    hipPrevRef.current = null
    activeFramingBadMsRef.current = 0
    lastPoseTimeRef.current = null
    setFramingLossWarning(false)
    setOrientationAdvisoryDismissed(false)
    setSessionCaptureContext(null)
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
    setSessionState('INITIALIZING')
    void reloadPriorStats()
  }, [reloadPriorStats, cancelAllSpeech])

  const finalizeRecordingBlob = useCallback(async (): Promise<Blob | null> => {
    const rec = mediaRecorderRef.current
    const mimeType = rec?.mimeType || 'video/webm'
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
    return new Blob(parts, { type: mimeType })
  }, [])

  const finishSession = useCallback(async () => {
    if (finishingSessionRef.current) return
    finishingSessionRef.current = true
    try {
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
    } finally {
      finishingSessionRef.current = false
    }
  }, [onSessionComplete, finalizeRecordingBlob])

  const cancelDeferredNaturalFinishRecording = useCallback(() => {
    const slot = deferredNaturalFinishRafSlotRef.current
    deferredNaturalFinishRafSlotRef.current = null
    if (!slot) return
    if (slot.outer !== null) cancelAnimationFrame(slot.outer)
    if (slot.inner !== null) cancelAnimationFrame(slot.inner)
  }, [])

  /** After remainingSec commits to 0, wait for compositor so the recorder’s last segments show 0:00. */
  const scheduleFinishAfterZeroPaintRecording = useCallback(() => {
    cancelDeferredNaturalFinishRecording()
    const slot = { outer: null as number | null, inner: null as number | null }
    deferredNaturalFinishRafSlotRef.current = slot
    slot.outer = requestAnimationFrame(() => {
      if (deferredNaturalFinishRafSlotRef.current !== slot) return
      slot.inner = requestAnimationFrame(() => {
        if (deferredNaturalFinishRafSlotRef.current !== slot) return
        deferredNaturalFinishRafSlotRef.current = null
        void finishSession()
      })
    })
  }, [cancelDeferredNaturalFinishRecording, finishSession])

  const compositeRecordingActive =
    sessionState === 'COUNTDOWN' || sessionState === 'ACTIVE_SESSION'

  useEffect(() => {
    if (!compositeRecordingActive) return
    const wrap = videoWrapRef.current
    const canvas = recordCanvasRef.current
    const video = videoRef.current
    const camStream = streamRef.current
    if (!wrap || !canvas || !video || typeof MediaRecorder === 'undefined') return
    if (!camStream) return

    let alive = true
    let raf = 0

    const resizeCanvas = () => {
      const w = Math.max(2, Math.round(wrap.clientWidth))
      const h = Math.max(2, Math.round(wrap.clientHeight))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    recordedChunksRef.current = []
    resizeCanvas()

    const ro = new ResizeObserver(() => {
      resizeCanvas()
    })
    ro.observe(wrap)

    const canvasStream =
      typeof canvas.captureStream === 'function' ? canvas.captureStream(24) : null
    const streamToRecord = canvasStream ?? camStream

    const preferredMp4 = [
      'video/mp4;codecs="avc1.42E01E"',
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ]
    let mime = ''
    for (const candidate of preferredMp4) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        mime = candidate
        break
      }
    }
    if (!mime && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mime = 'video/webm;codecs=vp9'
    } else if (!mime && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mime = 'video/webm;codecs=vp8'
    } else if (!mime && MediaRecorder.isTypeSupported('video/webm')) {
      mime = 'video/webm'
    }

    /** ~3–5 decimal MB/min → ~400_000–667_000 bit/s (8×bytes/min/60); midpoint 4 MB/min = 533_333 bps. Solo overlay legibility. */
    const TARGET_VIDEO_BPS = 533_333

    let recorder: MediaRecorder
    try {
      const opts: MediaRecorderOptions = { videoBitsPerSecond: TARGET_VIDEO_BPS }
      if (mime) opts.mimeType = mime
      recorder = new MediaRecorder(streamToRecord, opts)
    } catch {
      try {
        recorder = mime
          ? new MediaRecorder(streamToRecord, { mimeType: mime })
          : new MediaRecorder(streamToRecord)
      } catch {
        ro.disconnect()
        return
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data)
    }
    recorder.onstop = () => {}

    mediaRecorderRef.current = recorder
    try {
      recorder.start(1000)
    } catch {
      mediaRecorderRef.current = null
      ro.disconnect()
      return
    }

    const tick = () => {
      if (!alive) return
      resizeCanvas()
      const ctx = canvas.getContext('2d')
      const snap = compositeSnapshotRef.current
      if (ctx && snap && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        composePushupRecordingFrame(ctx, video, snap)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      const rec = mediaRecorderRef.current
      mediaRecorderRef.current = null
      if (rec && rec.state === 'recording') {
        try {
          rec.stop()
        } catch {
          /* noop */
        }
      }
    }
  }, [compositeRecordingActive])

  const onPoseFrame = (payload: PoseFramePayload | null) => {
    const state = sessionStateRef.current
    const video = videoRef.current
    if (!video || state === 'RESULTS') return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw === 0 || vh === 0) return

    const svc = pushupServiceRef.current
    const varSolo = variantRef.current === 'solo'
    const profile = captureProfile
    const stableN = profile.readinessStableFrames
    const minComp = profile.readinessCompositeMin
    const activeMin = profile.activeFramingCompositeMin
    const debMs = profile.framingLossDebounceMs

    const nowTs = performance.now()
    const lastTs = lastPoseTimeRef.current
    const dt = lastTs != null ? Math.min(100, Math.max(5, nowTs - lastTs)) : 16
    lastPoseTimeRef.current = nowTs

    if (state === 'INITIALIZING') {
      if (detectorLoadState !== 'ready') {
        return
      }
      if (variantRef.current === 'solo' && !soloFramingDoneRef.current) {
        return
      }
      warmupFramesRef.current += 1
      if (warmupFramesRef.current >= WARMUP_FRAMES) {
        setSessionState('READINESS_CHECK')
      }
      return
    }

    if (state === 'READINESS_CHECK') {
      if (!payload || (payload.poseScore ?? 0) < 0.2) {
        readinessRollingRef.current = []
        setPushupPos(false)
        setPushupHint(null)
        hipPrevRef.current = null
        if (varSolo) {
          setSoloChecklist(SOLO_CHECKLIST_WAIT)
        }
        return
      }

      const { pose, poseScore } = payload
      const hipNow = hipMidpointFromPose(pose)
      const analyzed = computeCaptureConfidence({
        pose,
        poseScore,
        videoWidth: vw,
        videoHeight: vh,
        svc,
        hipCenterPrev: hipPrevRef.current,
        hipCenterNow: hipNow,
      })
      hipPrevRef.current = hipNow

      if (!analyzed.confidence || !analyzed.readiness) {
        readinessRollingRef.current = []
        return
      }

      const { confidence, readiness, direction } = analyzed
      const g = pickGuidance({ confidence, readiness, direction })
      setPushupPos(readiness.pushupPosition)
      setPushupHint(g.reason === 'ready' ? null : g.message)

      if (varSolo) {
        const cl = confidenceToSoloChecklistStatuses(confidence, readiness.pushupPosition)
        setSoloChecklist((prev) =>
          prev.fullBody === cl.fullBody &&
          prev.lighting === cl.lighting &&
          prev.armsForm === cl.armsForm &&
          prev.holdSteady === cl.holdSteady
            ? prev
            : cl,
        )
      }

      const win = readinessRollingRef.current
      win.push({ composite: confidence.composite, plank: readiness.pushupPosition })
      if (win.length > stableN) win.shift()

      const minInWin = win.length ? Math.min(...win.map((x) => x.composite)) : 0
      const readyWindow =
        win.length >= stableN &&
        win.every((s) => s.plank && s.composite >= minComp) &&
        minInWin >= minComp * 0.95

      if (readyWindow && detectorLoadState === 'ready') {
        readinessRollingRef.current = []
        setSessionCaptureContext(
          buildSessionStartCaptureContext(ACTIVE_EXERCISE_ID, facingModeRef.current),
        )
        setCountdownPhase(3)
        setSessionState('COUNTDOWN')
      }
      return
    }

    if (state === 'COUNTDOWN') {
      return
    }

    if (state === 'ACTIVE_SESSION') {
      if (activeSessionEndedRef.current) return

      if (!payload || (payload.poseScore ?? 0) < 0.2) {
        activeFramingBadMsRef.current += dt
        if (activeFramingBadMsRef.current >= debMs) {
          setFramingLossWarning(true)
        }
        return
      }

      const { pose, poseScore } = payload
      const hipNow = hipMidpointFromPose(pose)
      const analyzed = computeCaptureConfidence({
        pose,
        poseScore,
        videoWidth: vw,
        videoHeight: vh,
        svc,
        hipCenterPrev: hipPrevRef.current,
        hipCenterNow: hipNow,
      })
      hipPrevRef.current = hipNow

      const c = analyzed.confidence
      if (c && c.composite >= activeMin) {
        activeFramingBadMsRef.current = 0
        setFramingLossWarning(false)
      } else {
        activeFramingBadMsRef.current += dt
        if (activeFramingBadMsRef.current >= debMs) {
          setFramingLossWarning(true)
        }
      }

      const pauseReps = activeFramingBadMsRef.current >= debMs

      if (!pauseReps) {
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
        if (r.repAdded) {
          announceRep(r.state.repCount, remainingSecRef.current)
        }

        if (r.debug) {
          setMotion01(r.debug.motion01)
        }

        if (PUSHUP_POSE_DEBUG && r.debug) {
          const prevDbg = lastPoseDebugRef.current
          const snap = {
            backStraight: r.debug.backStraight,
            rawUp: r.debug.rawUp,
            rawDown: r.debug.rawDown,
            validated: r.debug.validatedPosition,
          }
          if (
            !prevDbg ||
            prevDbg.backStraight !== snap.backStraight ||
            prevDbg.rawUp !== snap.rawUp ||
            prevDbg.rawDown !== snap.rawDown ||
            prevDbg.validated !== snap.validated
          ) {
            lastPoseDebugRef.current = snap
          }
        }
      }
    }
  }

  const { error: poseLoopError } = usePoseEstimationLoop(videoRef, poseEnabled, onPoseFrame, {
    flipHorizontal: mirrorPreviewForPose,
  })

  useEffect(() => {
    if (sessionState !== 'COUNTDOWN') return
    let cancelled = false
    if (voiceRepCounterEnabledRef.current && !sessionVoiceMutedLocalRef.current) playCountdownBeep()
    let step = 0
    const id = window.setInterval(() => {
      if (cancelled) return
      const allow = voiceRepCounterEnabledRef.current && !sessionVoiceMutedLocalRef.current
      step += 1
      if (step === 1) {
        setCountdownPhase(2)
        if (allow) playCountdownBeep()
        return
      }
      if (step === 2) {
        setCountdownPhase(1)
        if (allow) playCountdownBeep()
        return
      }
      if (step === 3) {
        setCountdownPhase('go')
        if (allow) playCountdownBeep()
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
    let lastTenTickAtLeft: number | null = null
    let playedFinal = false
    let finished = false
    const start = Date.now()
    const id = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - start) / 1000)
      const left = Math.max(0, 60 - elapsedSec)
      setRemainingSec(left)

      const allow = voiceRepCounterEnabledRef.current && !sessionVoiceMutedLocalRef.current

      if (left <= 0) {
        if (!finished) {
          finished = true
          activeSessionEndedRef.current = true
          window.clearInterval(id)
          if (allow) {
            cancelAllSpeechRef.current()
            if (!playedFinal) {
              playedFinal = true
              playLastTenFinalBeep()
            }
          }
          scheduleFinishAfterZeroPaintRecording()
        }
        return
      }

      if (allow && left >= 1 && left <= 10 && lastTenTickAtLeft !== left) {
        lastTenTickAtLeft = left
        cancelAllSpeechRef.current()
        playLastTenTickBeep()
      }
    }, 250)
    return () => {
      window.clearInterval(id)
      cancelDeferredNaturalFinishRecording()
    }
  }, [sessionState, scheduleFinishAfterZeroPaintRecording, cancelDeferredNaturalFinishRecording])

  const handleStop = useCallback(() => {
    cancelDeferredNaturalFinishRecording()
    activeSessionEndedRef.current = true
    cancelAllSpeech()
    void finishSession()
  }, [finishSession, cancelAllSpeech, cancelDeferredNaturalFinishRecording])

  useEffect(() => {
    if (sessionState === 'RESULTS') {
      cancelAllSpeech()
    }
  }, [sessionState, cancelAllSpeech])

  const showSessionChrome = sessionState !== 'RESULTS'
  const isSoloFullBleed = variant === 'solo' && sessionState !== 'RESULTS'

  const showSoloFramingGuide =
    variant === 'solo' &&
    sessionState === 'INITIALIZING' &&
    cameraReady &&
    !cameraError &&
    !soloFramingCardDone

  const showPoseModelInitFailure =
    sessionState === 'INITIALIZING' &&
    !cameraError &&
    !showSoloFramingGuide &&
    detectorLoadState === 'error'

  const showInitSpinner =
    sessionState === 'INITIALIZING' && !cameraError && !showSoloFramingGuide && !showPoseModelInitFailure

  const showOrientAdvisory =
    cameraReady &&
    !cameraError &&
    !orientationAdvisoryDismissed &&
    isOrientationAdvisoryActive(captureProfile, screenLand) &&
    (sessionState === 'INITIALIZING' || sessionState === 'READINESS_CHECK')

  const showSetupCameraFlip =
    cameraReady &&
    !cameraError &&
    (sessionState === 'INITIALIZING' || sessionState === 'READINESS_CHECK')

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
          sessionCaptureContext={sessionCaptureContext}
        />
      ) : null}

      <div
        ref={videoWrapRef}
        className={
          sessionState === 'RESULTS'
            ? 'pushup-session-video-wrap pushup-session-video-wrap--hidden'
            : isSoloFullBleed
              ? 'pushup-session-video-wrap pushup-session-video-wrap--fullbleed'
              : 'pushup-session-video-wrap'
        }
        aria-hidden={sessionState === 'RESULTS'}
      >
        <div
          className={
            mirrorPreviewForPose
              ? 'pushup-session-video-inner pushup-session-video-inner--mirror'
              : 'pushup-session-video-inner'
          }
        >
          <video ref={videoRef} className="pushup-session-video" autoPlay playsInline muted />
        </div>
        <canvas ref={recordCanvasRef} className="pushup-session-record-canvas" aria-hidden />

        <div className="pushup-session-overlay-root">
          {showOrientAdvisory ? (
            <div
              className={
                isSoloFullBleed ? 'pushup-orient-banner pushup-orient-banner--solo' : 'pushup-orient-banner'
              }
              role="status"
            >
              <div className="pushup-orient-banner-text">
                <p className="pushup-orient-banner-title">{captureProfile.orientationAdvisoryTitle}</p>
                <p className="pushup-orient-banner-body">{captureProfile.orientationAdvisoryBody}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary pushup-orient-dismiss"
                onClick={() => setOrientationAdvisoryDismissed(true)}
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {showSetupCameraFlip ? (
            <div
              className={
                isSoloFullBleed ? 'pushup-camera-flip pushup-camera-flip--solo' : 'pushup-camera-flip'
              }
            >
              <button
                type="button"
                className="btn btn-secondary pushup-camera-flip-btn"
                onClick={() =>
                  setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))
                }
              >
                {facingMode === 'user' ? 'Use back camera' : 'Use front camera'}
              </button>
            </div>
          ) : null}

          <AnimatePresence>
            {showSoloFramingGuide ? (
              <motion.div
                key="solo-framing-guide"
                className="pushup-solo-setup-card"
                style={{ position: 'absolute', inset: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="pushup-solo-setup-card-inner">
                  <p className="pushup-solo-setup-title">{captureProfile.setupFramingTitle}</p>
                  <p className="pushup-solo-setup-body">{captureProfile.setupFramingBody}</p>
                  <img
                    className="pushup-solo-setup-illustration"
                    src={framingGuideSvgUrl}
                    alt=""
                    decoding="async"
                  />
                  <p className="pushup-solo-setup-foot muted">{captureProfile.setupDistanceCopy}</p>
                  <p className="pushup-solo-setup-foot muted">{captureProfile.setupPropCopy}</p>
                  <button
                    type="button"
                    className="btn btn-primary pushup-solo-setup-continue"
                    onClick={() => setSoloFramingCardDone(true)}
                  >
                    Continue to camera
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showPoseModelInitFailure ? (
              <motion.div
                key="pose-fail"
                className={
                  variant === 'solo'
                    ? 'pushup-init-overlay pushup-init-overlay--solo'
                    : 'pushup-init-overlay'
                }
                style={{ position: 'absolute', inset: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="alert"
              >
                <p
                  className={
                    variant === 'solo' ? 'pushup-init-title pushup-init-title--solo' : 'pushup-init-title'
                  }
                >
                  Pose model could not load
                </p>
                <p
                  className={
                    variant === 'solo' ? 'pushup-init-sub pushup-init-sub--solo' : 'pushup-init-sub'
                  }
                >
                  Check your network connection and refresh this page. You can cancel to go back without
                  starting a session.
                </p>
              </motion.div>
            ) : showInitSpinner ? (
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
                    <span className="pushup-init-pill">
                      {!cameraReady
                        ? 'Camera starting'
                        : detectorLoadState === 'loading'
                          ? poseCacheLikelyPrimed === true
                            ? 'Cached model'
                            : poseCacheLikelyPrimed === false
                              ? 'First-time fetch'
                              : 'Pose model'
                          : 'Warm-up'}
                    </span>
                    <div className="pushup-spinner pushup-spinner--solo" aria-hidden />
                    <p className="pushup-init-title pushup-init-title--solo">
                      {!cameraReady
                        ? 'Getting ready…'
                        : detectorLoadState === 'loading'
                          ? 'Loading pose detection…'
                          : 'Almost there'}
                    </p>
                    <p className="pushup-init-sub pushup-init-sub--solo">
                      {!cameraReady
                        ? 'Setting up your camera; the pose model loads at the same time.'
                        : detectorLoadState === 'loading'
                          ? poseCacheLikelyPrimed === true
                            ? 'A cached copy is on-device — finishing load from cache or disk.'
                            : poseCacheLikelyPrimed === false
                              ? 'First visit here: downloading the model can take longer; later visits reuse it.'
                              : 'Almost done loading the pose model — stay on this screen.'
                          : 'Brief warm-up frames, then we move to framing checks.'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="pushup-spinner" aria-hidden />
                    <p className="pushup-init-title">Initializing</p>
                    <p className="pushup-init-sub">
                      {!cameraReady
                        ? 'Setting up your camera. We are also getting everything else ready in the background.'
                        : detectorLoadState === 'loading'
                          ? poseCacheLikelyPrimed === true
                            ? 'Loading from a copy saved on this device…'
                            : poseCacheLikelyPrimed === false
                              ? 'First time here: this step may take a little longer. Later visits are quicker.'
                              : 'Almost ready — stay on this screen.'
                          : 'Finishing camera setup and a quick warm-up…'}
                    </p>
                  </>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {sessionState === 'READINESS_CHECK' && variant === 'solo' ? (
            <div className="pushup-readiness-solo-center">
              <ReadinessChecklist
                variant="solo"
                checklist={soloChecklist}
                setupFootnotes={[captureProfile.setupDistanceCopy, captureProfile.setupPropCopy]}
              />
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
              framingLossWarning={framingLossWarning}
              voiceControl={
                voiceRepCounterEnabled
                  ? {
                      show: true,
                      sessionMuted: sessionVoiceMutedLocal,
                      onToggle: toggleSessionVoiceMute,
                    }
                  : null
              }
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
