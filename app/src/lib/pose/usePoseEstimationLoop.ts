import type { Pose } from '@tensorflow-models/pose-detection'
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { loadMoveNetDetector } from './loadMoveNetDetector'

export type PoseFramePayload = {
  pose: Pose
  poseScore: number
}

/** After rotation some WebKit builds keep intrinsic size at 0 until the decoder settles. */
const ZERO_DIM_RECOVERY_AFTER_FRAMES = 120

/**
 * Runs MoveNet on a video element each animation frame. No skeleton drawing.
 */
export function usePoseEstimationLoop(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  onFrame: (payload: PoseFramePayload | null) => void,
  options?: { flipHorizontal?: boolean },
): { error: string | null } {
  const [error, setError] = useState<string | null>(null)
  const rafIdRef = useRef<number>(0)
  const onFrameRef = useRef(onFrame)
  const flipRef = useRef(options?.flipHorizontal ?? false)

  useLayoutEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useLayoutEffect(() => {
    flipRef.current = options?.flipHorizontal ?? false
  }, [options?.flipHorizontal])

  useEffect(() => {
    if (!enabled) {
      const id = rafIdRef.current
      if (id) cancelAnimationFrame(id)
      rafIdRef.current = 0
      return
    }

    let cancelled = false
    let zeroDimStreak = 0
    let attemptedIntrinsicRecovery = false
    /** Some browsers fire `resize` on the `<video>` when the track intrinsic size updates. */
    let resizeAttachedTo: HTMLVideoElement | null = null

    const onVideoIntrinsicResize = () => {
      zeroDimStreak = 0
      attemptedIntrinsicRecovery = false
    }

    const attachVideoResizeListener = () => {
      const v = videoRef.current
      if (!v || resizeAttachedTo === v) {
        return
      }
      if (resizeAttachedTo) {
        resizeAttachedTo.removeEventListener('resize', onVideoIntrinsicResize)
      }
      resizeAttachedTo = v
      resizeAttachedTo.addEventListener('resize', onVideoIntrinsicResize)
    }

    void (async () => {
      try {
        const detector = await loadMoveNetDetector()
        if (cancelled) return
        setError(null)

        const tick = async () => {
          if (cancelled) return
          const video = videoRef.current
          if (!video) {
            rafIdRef.current = requestAnimationFrame(() => {
              void tick()
            })
            return
          }

          attachVideoResizeListener()

          const vw = video.videoWidth
          const vh = video.videoHeight
          if (vw === 0 || vh === 0) {
            zeroDimStreak += 1
            if (zeroDimStreak > ZERO_DIM_RECOVERY_AFTER_FRAMES && !attemptedIntrinsicRecovery) {
              attemptedIntrinsicRecovery = true
              void video.play().catch(() => {
                /** ignored — rotation recovery best-effort */
              })
            }
            rafIdRef.current = requestAnimationFrame(() => {
              void tick()
            })
            return
          }

          zeroDimStreak = 0
          attemptedIntrinsicRecovery = false

          try {
            const poses = await detector.estimatePoses(video, {
              flipHorizontal: flipRef.current,
            })
            if (cancelled) return
            if (poses.length > 0) {
              const pose = poses[0]
              onFrameRef.current({
                pose,
                poseScore: pose.score ?? 0,
              })
            } else {
              onFrameRef.current(null)
            }
          } catch {
            if (cancelled) return
            onFrameRef.current(null)
          }

          if (cancelled) return
          rafIdRef.current = requestAnimationFrame(() => {
            void tick()
          })
        }

        rafIdRef.current = requestAnimationFrame(() => {
          void tick()
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load pose estimation.'
        setError(message)
      }
    })()

    return () => {
      cancelled = true
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
      if (resizeAttachedTo) {
        resizeAttachedTo.removeEventListener('resize', onVideoIntrinsicResize)
        resizeAttachedTo = null
      }
    }
  }, [enabled, videoRef])

  return { error: enabled ? error : null }
}
