import type { Pose } from '@tensorflow-models/pose-detection'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { loadMoveNetDetector } from './loadMoveNetDetector'

export type PoseFramePayload = {
  pose: Pose
  poseScore: number
}

/**
 * Runs MoveNet on a video element each animation frame. No skeleton drawing.
 */
export function usePoseEstimationLoop(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  onFrame: (payload: PoseFramePayload | null) => void,
): { error: string | null } {
  const [error, setError] = useState<string | null>(null)
  const rafIdRef = useRef<number>(0)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  useEffect(() => {
    if (!enabled) {
      const id = rafIdRef.current
      if (id) cancelAnimationFrame(id)
      rafIdRef.current = 0
      return
    }

    let cancelled = false

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

          const vw = video.videoWidth
          const vh = video.videoHeight
          if (vw === 0 || vh === 0) {
            rafIdRef.current = requestAnimationFrame(() => {
              void tick()
            })
            return
          }

          try {
            const poses = await detector.estimatePoses(video, { flipHorizontal: false })
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
            onFrameRef.current(null)
          }

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
    }
  }, [enabled, videoRef])

  return { error: enabled ? error : null }
}
