import type { Keypoint } from '@tensorflow-models/pose-detection'

/** Ported from xershare.web PoseUtilitiesService.getPushupReadinessScore */
export function getPushupReadinessScore(
  keypoints: Keypoint[],
  confidenceThreshold = 0.3,
): {
  score: number
  valid: boolean
  bodyHorizontal: number
  legsExtended: number
  shoulderY: number
  hipY: number
  ankleY: number
  shoulderHipDiff: number
  hipAnkleDiff: number
  confidence: number
} {
  const leftShoulder = keypoints.find((p) => p.name === 'left_shoulder')
  const rightShoulder = keypoints.find((p) => p.name === 'right_shoulder')
  const leftHip = keypoints.find((p) => p.name === 'left_hip')
  const rightHip = keypoints.find((p) => p.name === 'right_hip')
  const leftAnkle = keypoints.find((p) => p.name === 'left_ankle')
  const rightAnkle = keypoints.find((p) => p.name === 'right_ankle')

  const points = [leftShoulder, rightShoulder, leftHip, rightHip, leftAnkle, rightAnkle]
  if (points.some((p) => !p)) {
    return {
      score: 0,
      valid: false,
      bodyHorizontal: 0,
      legsExtended: 0,
      shoulderY: 0,
      hipY: 0,
      ankleY: 0,
      shoulderHipDiff: 0,
      hipAnkleDiff: 0,
      confidence: 0,
    }
  }

  const confScores = points.map((p) => Math.max(0, Math.min(1, p!.score ?? 0)))
  const confidence = confScores.reduce((a, b) => a + b, 0) / confScores.length

  const shoulderY = (leftShoulder!.y + rightShoulder!.y) / 2
  const hipY = (leftHip!.y + rightHip!.y) / 2
  const ankleY = (leftAnkle!.y + rightAnkle!.y) / 2

  const shoulderHipDiff = Math.abs(shoulderY - hipY)
  const hipAnkleDiff = ankleY - hipY

  const bodyHorizontal = 1 - Math.min(1, shoulderHipDiff / 100)
  const legsExtended = Math.min(1, (hipAnkleDiff - 60) / 160)

  const confGate = Math.max(0, (confidence - confidenceThreshold) / (1 - confidenceThreshold))

  const score = Math.max(
    0,
    Math.min(1, (0.45 * bodyHorizontal + 0.45 * legsExtended + 0.1 * confidence) * confGate),
  )

  return {
    score,
    valid: true,
    bodyHorizontal,
    legsExtended,
    shoulderY,
    hipY,
    ankleY,
    shoulderHipDiff,
    hipAnkleDiff,
    confidence,
  }
}

export const FRAME_MARGIN = 0.03
const MIN_SCORE_BODY = 0.24
const MIN_SCORE_NOSE = 0.2

const FRAME_LANDMARKS = [
  'nose',
  'left_shoulder',
  'right_shoulder',
  'left_hip',
  'right_hip',
  'left_ankle',
  'right_ankle',
] as const

function minScoreFor(name: (typeof FRAME_LANDMARKS)[number]): number {
  return name === 'nose' ? MIN_SCORE_NOSE : MIN_SCORE_BODY
}

/**
 * When full-body framing fails, returns a single actionable hint; otherwise null.
 * Covers low-confidence/missing landmarks and out-of-frame placement.
 */
export function getFullBodyFrameHint(
  keypoints: Keypoint[],
  videoWidth: number,
  videoHeight: number,
): string | null {
  if (videoWidth <= 0 || videoHeight <= 0) {
    return 'Stay in frame and improve lighting so your full body is visible.'
  }

  const mx = FRAME_MARGIN * videoWidth
  const my = FRAME_MARGIN * videoHeight

  for (const name of FRAME_LANDMARKS) {
    const p = keypoints.find((k) => k.name === name)
    const minScore = minScoreFor(name)
    if (!p || (p.score ?? 0) < minScore) {
      return 'Stay in frame and improve lighting so your full body is visible.'
    }
  }

  let ankleBottom = false
  let noseTop = false
  let anyBottom = false
  let anyTop = false
  let anyLeft = false
  let anyRight = false

  for (const name of FRAME_LANDMARKS) {
    const p = keypoints.find((k) => k.name === name)!
    const inFrame =
      p.x >= mx && p.x <= videoWidth - mx && p.y >= my && p.y <= videoHeight - my
    if (inFrame) continue

    if (p.y > videoHeight - my) {
      anyBottom = true
      if (name === 'left_ankle' || name === 'right_ankle') ankleBottom = true
    }
    if (p.y < my) {
      anyTop = true
      if (name === 'nose') noseTop = true
    }
    if (p.x < mx) anyLeft = true
    if (p.x > videoWidth - mx) anyRight = true
  }

  if (!anyBottom && !anyTop && !anyLeft && !anyRight) {
    return null
  }

  if (ankleBottom) {
    return 'Step back or move the camera up so your feet stay in frame.'
  }
  if (noseTop) {
    return 'Move the camera down a little so your head stays in frame.'
  }
  if (anyBottom) {
    return 'Move the camera up or leave more room below your feet in frame.'
  }
  if (anyTop) {
    return 'Move the camera down a little so your full body stays in frame.'
  }
  if (anyLeft && anyRight) {
    return 'Shift sideways to center in frame.'
  }
  if (anyLeft) {
    return 'Shift right in frame so you are not cropped on the left.'
  }
  if (anyRight) {
    return 'Shift left in frame so you are not cropped on the right.'
  }
  return null
}

/**
 * True when core landmarks are visible and inside the frame with a small margin
 * (full body in view for side pushup).
 */
export function isFullBodyInFrame(keypoints: Keypoint[], videoWidth: number, videoHeight: number): boolean {
  return getFullBodyFrameHint(keypoints, videoWidth, videoHeight) === null
}
