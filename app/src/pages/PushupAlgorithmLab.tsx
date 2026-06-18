import { type ChangeEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { computeCaptureConfidence, hipMidpointFromPose } from '../lib/capture/captureConfidence'
import { getExerciseCaptureProfile } from '../lib/capture/exerciseCaptureProfiles'
import {
  buildPushupDebugExport,
  downloadPushupDebugCsv,
  downloadPushupDebugExport,
  type PushupDebugExportFrame,
} from '../lib/pose/pushupDebugExport'
import {
  clearLabAlgorithmConfig,
  DEFAULT_PUSHUP_ALGORITHM_CONFIG,
  loadLabAlgorithmConfig,
  mergePushupAlgorithmConfig,
  saveLabAlgorithmConfig,
  type PushupAlgorithmConfig,
  type PartialPushupAlgorithmConfig,
} from '../lib/pose/pushupAlgorithmConfig'
import {
  clearPushupLabHandoff,
  loadPushupLabHandoff,
} from '../lib/pose/pushupLabHandoff'
import { PushupService } from '../lib/pose/pushupService'
import {
  advanceRepTrackerFromPoseFrameBased,
  createInitialFrameRepTracker,
  type FrameRepTrackerState,
  type PushupRepFrameDebug,
} from '../lib/pose/pushupRepTracking'
import { usePoseEstimationLoop, type PoseFramePayload } from '../lib/pose/usePoseEstimationLoop'
import { useBlobUrl } from '../lib/useBlobUrl'
import { PushupLabAngleGauge } from './PushupLabAngleGauge'
import './pushup-algorithm-lab.css'

const captureProfile = getExerciseCaptureProfile('pushup')

function configField(
  label: string,
  value: number,
  onChange: (n: number) => void,
  step = 1,
): ReactNode {
  return (
    <label className="pushup-algo-lab-config-field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
      />
    </label>
  )
}

/**
 * Dev harness: upload a recorded pushup video and run MoveNet + same frame-based rep counter as the live session.
 * Route: /dev/pushup-lab (registered only when import.meta.env.DEV).
 */
export function PushupAlgorithmLab() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const objectUrl = useBlobUrl(file)

  const [videoReady, setVideoReady] = useState(false)
  const [analysisEnabled, setAnalysisEnabled] = useState(false)
  const [debugLogEnabled, setDebugLogEnabled] = useState(true)
  const [simulateFramingLoss, setSimulateFramingLoss] = useState(false)
  const [flipHorizontal, setFlipHorizontal] = useState(false)
  const [expectedReps, setExpectedReps] = useState<string>('')

  const [algorithmConfig, setAlgorithmConfig] = useState<PushupAlgorithmConfig>(() => loadLabAlgorithmConfig())
  const svcRef = useRef(new PushupService(algorithmConfig))

  const trackerRef = useRef<FrameRepTrackerState>(createInitialFrameRepTracker())
  const debugFramesRef = useRef<PushupDebugExportFrame[]>([])
  const hipPrevRef = useRef<{ x: number; y: number } | null>(null)
  const activeFramingBadMsRef = useRef(0)
  const lastPoseTimeRef = useRef<number | null>(null)

  const [reps, setReps] = useState(0)
  const [lastFrame, setLastFrame] = useState<PushupRepFrameDebug | null>(null)
  const [debugFrameCount, setDebugFrameCount] = useState(0)
  const [handoffNote, setHandoffNote] = useState<string | null>(null)

  const resetTrackerRefs = useCallback(() => {
    trackerRef.current = createInitialFrameRepTracker()
    hipPrevRef.current = null
    activeFramingBadMsRef.current = 0
    lastPoseTimeRef.current = null
    debugFramesRef.current = []
  }, [])

  const resetTracker = useCallback(() => {
    resetTrackerRefs()
    setReps(0)
    setLastFrame(null)
    setDebugFrameCount(0)
  }, [resetTrackerRefs])

  const patchConfig = useCallback((partial: PartialPushupAlgorithmConfig) => {
    setAlgorithmConfig((prev) => mergePushupAlgorithmConfig(partial, prev))
  }, [])

  useEffect(() => {
    svcRef.current = new PushupService(algorithmConfig)
    saveLabAlgorithmConfig(algorithmConfig)
    resetTrackerRefs()
    const frameId = requestAnimationFrame(() => {
      setReps(0)
      setLastFrame(null)
      setDebugFrameCount(0)
    })
    return () => cancelAnimationFrame(frameId)
  }, [algorithmConfig, resetTrackerRefs])

  useEffect(() => {
    let cancelled = false
    void loadPushupLabHandoff().then((handoff) => {
      if (cancelled || !handoff) return
      const f = new File([handoff.blob], handoff.fileName, { type: handoff.blob.type || 'video/webm' })
      setFile(f)
      setExpectedReps(String(handoff.reps))
      setHandoffNote(
        `Loaded session handoff (${handoff.variant}, ${handoff.reps} reps, ${handoff.durationSec}s).`,
      )
      void clearPushupLabHandoff()
    })
    return () => {
      cancelled = true
    }
  }, [])

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setVideoReady(false)
    setAnalysisEnabled(false)
    setHandoffNote(null)
    resetTracker()
  }

  const resetConfigToDefaults = useCallback(() => {
    clearLabAlgorithmConfig()
    setAlgorithmConfig({ ...DEFAULT_PUSHUP_ALGORITHM_CONFIG })
  }, [])

  const buildExport = useCallback(() => {
    const video = videoRef.current
    const rows = debugFramesRef.current
    const expected =
      expectedReps.trim() === '' ? null : Number.parseInt(expectedReps, 10)
    return buildPushupDebugExport({
      sourceFileName: file?.name ?? null,
      videoDurationSec: video && Number.isFinite(video.duration) ? video.duration : null,
      frames: rows,
      algorithmConfig,
      expectedReps: expected != null && Number.isFinite(expected) ? expected : null,
    })
  }, [algorithmConfig, expectedReps, file])

  const downloadDebugJson = useCallback(() => {
    if (debugFramesRef.current.length === 0) return
    downloadPushupDebugExport(buildExport(), 'pushup-algorithm-debug')
  }, [buildExport])

  const downloadDebugCsvFile = useCallback(() => {
    if (debugFramesRef.current.length === 0) return
    downloadPushupDebugCsv(buildExport(), 'pushup-algorithm-debug')
  }, [buildExport])

  const onPoseFrame = useCallback(
    (payload: PoseFramePayload | null) => {
      if (!analysisEnabled || !payload) return
      const video = videoRef.current
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

      const nowTs = performance.now()
      const lastTs = lastPoseTimeRef.current
      const dt = lastTs != null ? Math.min(100, Math.max(5, nowTs - lastTs)) : 16
      lastPoseTimeRef.current = nowTs

      let pauseReps = false
      if (simulateFramingLoss) {
        const hipNow = hipMidpointFromPose(payload.pose)
        const analyzed = computeCaptureConfidence({
          pose: payload.pose,
          poseScore: payload.poseScore,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          svc: svcRef.current,
          hipCenterPrev: hipPrevRef.current,
          hipCenterNow: hipNow,
        })
        hipPrevRef.current = hipNow
        const c = analyzed.confidence
        if (c && c.composite >= captureProfile.activeFramingCompositeMin) {
          activeFramingBadMsRef.current = 0
        } else {
          activeFramingBadMsRef.current += dt
        }
        pauseReps = activeFramingBadMsRef.current >= captureProfile.framingLossDebounceMs
      }

      if (pauseReps) return

      const r = advanceRepTrackerFromPoseFrameBased(
        payload.pose,
        payload.poseScore,
        video.videoWidth,
        video.videoHeight,
        svcRef.current,
        trackerRef.current,
      )
      trackerRef.current = r.state
      setReps(r.state.repCount)
      if (r.debug) {
        setLastFrame(r.debug)
      }

      if (debugLogEnabled) {
        const row: PushupDebugExportFrame = {
          i: debugFramesRef.current.length,
          tSec: Math.round(video.currentTime * 1000) / 1000,
          poseScore: payload.poseScore,
          repAdded: r.repAdded,
          repCount: r.state.repCount,
          lastStable: r.state.lastStable,
          debug: r.debug,
        }
        debugFramesRef.current.push(row)
        setDebugFrameCount(debugFramesRef.current.length)
      }
    },
    [analysisEnabled, debugLogEnabled, simulateFramingLoss],
  )

  const { error: poseError } = usePoseEstimationLoop(videoRef, analysisEnabled && videoReady, onPoseFrame, {
    flipHorizontal,
  })

  const expectedParsed =
    expectedReps.trim() === '' ? null : Number.parseInt(expectedReps, 10)
  const parityHint =
    expectedParsed != null && Number.isFinite(expectedParsed)
      ? reps === expectedParsed
        ? 'Matches expected reps'
        : `Delta: ${reps - expectedParsed >= 0 ? '+' : ''}${reps - expectedParsed} vs expected`
      : null

  const gaugeGuides = [algorithmConfig.upElbowDeg.min, algorithmConfig.downElbowDeg.max] as const

  return (
    <section className="stack pushup-session-page pushup-algo-lab">
      <h1 className="page-title">Pushup algorithm lab</h1>
      <p className="lede">
        Upload a session recording (or use <strong>Analyze in lab</strong> from results). Tune thresholds below;
        exports include the active config so you can promote values into{' '}
        <code>pushupAlgorithmConfig.ts</code> when satisfied. Solo and challenge share this logic.
      </p>

      {handoffNote ? <p className="banner banner-warn">{handoffNote}</p> : null}

      <div className="card stack pushup-algo-lab-upload">
        <label className="field">
          <span>Video file</span>
          <input type="file" accept="video/*" onChange={onFile} />
        </label>

        <div className="pushup-algo-lab-video-analysis-row">
          <div className="pushup-algo-lab-video-col">
            {objectUrl ? (
              <div className="pushup-algo-lab-video-gauge-row">
                <div className="pushup-algo-lab-video-wrap">
                  <video
                    ref={videoRef}
                    className="pushup-algo-lab-video"
                    src={objectUrl}
                    controls
                    playsInline
                    onLoadedMetadata={() => setVideoReady(true)}
                  />
                </div>
                <PushupLabAngleGauge
                  angleDeg={lastFrame?.normalizedElbowDeg ?? null}
                  showMarker={analysisEnabled && lastFrame != null}
                  guideDegs={gaugeGuides}
                />
              </div>
            ) : (
              <div className="pushup-algo-lab-video-placeholder muted">Select a video file above.</div>
            )}
          </div>

          <div className="pushup-algo-lab-panel">
            <h2 className="pushup-algo-lab-panel-title">Live frame (same logic as session)</h2>
            <p className="pushup-algo-lab-reps">
              Reps: <strong>{reps}</strong>
            </p>
            <label className="pushup-algo-lab-config-field">
              <span>Expected reps (parity check)</span>
              <input
                type="number"
                min={0}
                value={expectedReps}
                onChange={(e) => setExpectedReps(e.target.value)}
                placeholder="From recorded session"
              />
            </label>
            {parityHint ? (
              <p className={reps === expectedParsed ? 'pushup-algo-lab-parity-ok' : 'pushup-algo-lab-parity-warn'}>
                {parityHint}
              </p>
            ) : null}
            {lastFrame ? (
              <dl className="pushup-algo-lab-dl">
                <dt>Facing</dt>
                <dd>{lastFrame.direction}</dd>
                <dt>Elbow angle (°)</dt>
                <dd>{lastFrame.normalizedElbowDeg}</dd>
                <dt>Back cosine</dt>
                <dd>{lastFrame.backCosine}</dd>
                <dt>Back straight</dt>
                <dd>{lastFrame.backStraight ? 'yes' : 'no'}</dd>
                <dt>All the way up (geom.)</dt>
                <dd>{lastFrame.rawUp ? 'yes' : 'no'}</dd>
                <dt>All the way down (geom.)</dt>
                <dd>{lastFrame.rawDown ? 'yes' : 'no'}</dd>
                <dt>Validated position</dt>
                <dd>{lastFrame.validatedPosition}</dd>
                <dt>Legs extended (plank)</dt>
                <dd>{lastFrame.legsExtended ? 'yes' : 'no'}</dd>
                <dt>Knee angle (°)</dt>
                <dd>{lastFrame.kneeAngleDeg != null ? lastFrame.kneeAngleDeg.toFixed(0) : '—'}</dd>
              </dl>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {analysisEnabled ? 'Waiting for pose…' : 'Enable analysis and play the video.'}
              </p>
            )}
          </div>
        </div>

        <details className="pushup-algo-lab-config">
          <summary>Algorithm thresholds (saved to localStorage)</summary>
          <div className="pushup-algo-lab-config-grid">
            {configField('Up elbow min (°)', algorithmConfig.upElbowDeg.min, (n) =>
              patchConfig({ upElbowDeg: { min: n } }),
            )}
            {configField('Up elbow max (°)', algorithmConfig.upElbowDeg.max, (n) =>
              patchConfig({ upElbowDeg: { max: n } }),
            )}
            {configField('Down elbow min (°)', algorithmConfig.downElbowDeg.min, (n) =>
              patchConfig({ downElbowDeg: { min: n } }),
            )}
            {configField('Down elbow max (°)', algorithmConfig.downElbowDeg.max, (n) =>
              patchConfig({ downElbowDeg: { max: n } }),
            )}
            {configField('Back straight min cosine', algorithmConfig.backStraightCosineMin, (n) =>
              patchConfig({ backStraightCosineMin: n }),
            0.01,
            )}
            {configField('Min knee angle (°)', algorithmConfig.minKneeAngleDeg, (n) =>
              patchConfig({ minKneeAngleDeg: n }),
            )}
            {configField('Min facing nose delta (px)', algorithmConfig.minFacingNoseDelta, (n) =>
              patchConfig({ minFacingNoseDelta: n }),
            )}
            {configField('Leg weak frames to reset', algorithmConfig.legWeakFramesToReset, (n) =>
              patchConfig({ legWeakFramesToReset: n }),
            )}
            {configField('Direction invalid fallback frames', algorithmConfig.maxDirectionInvalidFallback, (n) =>
              patchConfig({ maxDirectionInvalidFallback: n }),
            )}
            {configField('Min pose score for reps', algorithmConfig.minPoseScoreForReps, (n) =>
              patchConfig({ minPoseScoreForReps: n }),
            0.01,
            )}
          </div>
          <button type="button" className="btn btn-secondary" onClick={resetConfigToDefaults}>
            Reset thresholds to code defaults
          </button>
        </details>

        <div className="actions wrap pushup-algo-lab-actions">
          <button
            type="button"
            className={analysisEnabled ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={() => setAnalysisEnabled((v) => !v)}
            disabled={!videoReady}
          >
            {analysisEnabled ? 'Pause analysis' : 'Run analysis'}
          </button>
          <label className="pushup-algo-lab-debug-toggle">
            <input
              type="checkbox"
              checked={debugLogEnabled}
              onChange={(e) => setDebugLogEnabled(e.target.checked)}
              disabled={!file}
            />
            <span>Record debug log</span>
          </label>
          <label className="pushup-algo-lab-debug-toggle">
            <input
              type="checkbox"
              checked={simulateFramingLoss}
              onChange={(e) => setSimulateFramingLoss(e.target.checked)}
            />
            <span>Simulate framing-loss pause</span>
          </label>
          <label className="pushup-algo-lab-debug-toggle">
            <input
              type="checkbox"
              checked={flipHorizontal}
              onChange={(e) => setFlipHorizontal(e.target.checked)}
            />
            <span>Flip horizontal (front camera)</span>
          </label>
          <button type="button" className="btn btn-secondary" onClick={resetTracker} disabled={!file}>
            Reset counter
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={downloadDebugJson}
            disabled={debugFrameCount === 0}
          >
            Download JSON ({debugFrameCount})
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={downloadDebugCsvFile}
            disabled={debugFrameCount === 0}
          >
            Download CSV ({debugFrameCount})
          </button>
        </div>

        {poseError ? (
          <p className="banner banner-error" role="alert">
            Pose: {poseError}
          </p>
        ) : null}
      </div>

      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        <Link to="/">Home</Link>
        {' · '}
        <Link to="/solo">Solo session</Link>
        {' · '}
        <button type="button" className="pushup-algo-lab-link-btn" onClick={() => navigate(-1)}>
          Back
        </button>
      </p>
    </section>
  )
}
