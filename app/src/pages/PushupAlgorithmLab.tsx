import { type ChangeEvent, useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PushupService } from '../lib/pose/pushupService'
import {
  advanceRepTrackerFromPoseFrameBased,
  createInitialFrameRepTracker,
  type FrameRepTrackerState,
  type PushupRepFrameDebug,
} from '../lib/pose/pushupRepTracking'
import { usePoseEstimationLoop, type PoseFramePayload } from '../lib/pose/usePoseEstimationLoop'
import { useBlobUrl } from '../lib/useBlobUrl'
import './pushup-algorithm-lab.css'

/**
 * Dev harness: upload a recorded pushup video and run MoveNet + same frame-based rep counter as the live session (`advanceRepTrackerFromPoseFrameBased`).
 * Route: /dev/pushup-lab (registered only when import.meta.env.DEV).
 */
export function PushupAlgorithmLab() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const objectUrl = useBlobUrl(file)

  const [videoReady, setVideoReady] = useState(false)
  const [analysisEnabled, setAnalysisEnabled] = useState(false)

  const trackerRef = useRef<FrameRepTrackerState>(createInitialFrameRepTracker())
  const svcRef = useRef(new PushupService())

  const [reps, setReps] = useState(0)
  const [lastFrame, setLastFrame] = useState<PushupRepFrameDebug | null>(null)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setVideoReady(false)
    setAnalysisEnabled(false)
    trackerRef.current = createInitialFrameRepTracker()
    setReps(0)
    setLastFrame(null)
  }

  const resetTracker = () => {
    trackerRef.current = createInitialFrameRepTracker()
    setReps(0)
    setLastFrame(null)
  }

  const onPoseFrame = useCallback((payload: PoseFramePayload | null) => {
    if (!analysisEnabled || !payload) return
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

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
  }, [analysisEnabled])

  const { error: poseError } = usePoseEstimationLoop(videoRef, analysisEnabled && videoReady, onPoseFrame)

  return (
    <section className="stack pushup-session-page pushup-algo-lab">
      <h1 className="page-title">Pushup algorithm lab</h1>
      <p className="lede">
        Upload a side-view pushup video to replay the same rep counter as the live session. Use Play /
        pause and playback speed; enable analysis while the video is playing.
      </p>

      <div className="card stack pushup-algo-lab-upload">
        <label className="field">
          <span>Video file</span>
          <input type="file" accept="video/*" onChange={onFile} />
        </label>

        <div className="pushup-algo-lab-video-analysis-row">
          <div className="pushup-algo-lab-video-col">
            {objectUrl ? (
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
            ) : (
              <div className="pushup-algo-lab-video-placeholder muted">Select a video file above.</div>
            )}
          </div>

          <div className="pushup-algo-lab-panel">
            <h2 className="pushup-algo-lab-panel-title">Live frame (same logic as session)</h2>
            <p className="pushup-algo-lab-reps">
              Reps: <strong>{reps}</strong>
            </p>
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

        <div className="actions wrap">
          <button
            type="button"
            className={analysisEnabled ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={() => setAnalysisEnabled((v) => !v)}
            disabled={!videoReady}
          >
            {analysisEnabled ? 'Pause analysis' : 'Run analysis'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetTracker} disabled={!file}>
            Reset counter
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
        <Link to="/challenge/start">Challenge start</Link>
      </p>
    </section>
  )
}
