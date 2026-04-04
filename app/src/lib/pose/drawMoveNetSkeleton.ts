import * as poseDetection from '@tensorflow-models/pose-detection'

const SCORE_THRESHOLD = 0.3

const pairsCache = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet)

/**
 * Draw MoveNet COCO keypoints and bones (TensorFlow.js pose-detection, same stack as xershare.web).
 */
export function drawMoveNetSkeleton(
  ctx: CanvasRenderingContext2D,
  keypoints: poseDetection.Keypoint[],
  options?: { keypointRadius?: number; lineWidth?: number },
): void {
  const radius = options?.keypointRadius ?? 4
  const lineWidth = options?.lineWidth ?? 2

  keypoints.forEach((kp) => {
    if ((kp.score ?? 0) > SCORE_THRESHOLD) {
      ctx.beginPath()
      ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(0, 200, 83, 0.95)'
      ctx.fill()
    }
  })

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)'
  ctx.lineWidth = lineWidth
  pairsCache.forEach(([i, j]) => {
    const a = keypoints[i]
    const b = keypoints[j]
    if (!a || !b) return
    if ((a.score ?? 0) > SCORE_THRESHOLD && (b.score ?? 0) > SCORE_THRESHOLD) {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  })
}
