import type { Pose } from '@tensorflow-models/pose-detection'
import { POSE_KEYPOINTS } from '../pose/poseKeyPoints'
import { PushupService } from '../pose/pushupService'
import {
  evaluateReadiness,
  type ReadinessResult,
} from '../pose/pushupReadinessChecks'

export type CaptureConfidence = {
  framing: number
  pose: number
  visibility: number
  alignment: number
  deviceStable: number
  /** Aggregate for gates (0–1); higher is better */
  composite: number
}

export type CaptureGuidanceReason =
  | 'side_profile'
  | 'move_back'
  | 'tilt_down'
  | 'feet'
  | 'wrists'
  | 'hold_steady'
  | 'plank'
  | 'ready'

const MARGIN_FRAC = 0.04

function kp(pose: Pose, i: number) {
  return pose.keypoints[i]!
}

function score01(s: number | undefined): number {
  const v = s ?? 0
  return Math.max(0, Math.min(1, v))
}

/**
 * Multi-dimensional capture quality for readiness + mid-session framing gates.
 * Uses MoveNet keypoints in video pixel space.
 */
export function computeCaptureConfidence(params: {
  pose: Pose | null
  poseScore: number
  videoWidth: number
  videoHeight: number
  svc: PushupService
  hipCenterPrev: { x: number; y: number } | null
  hipCenterNow: { x: number; y: number } | null
}): {
  confidence: CaptureConfidence | null
  readiness: ReadinessResult | null
  direction: ReturnType<typeof PushupService.detectFacingDirection> | 'none'
} {
  const { pose, poseScore, videoWidth: vw, videoHeight: vh, svc, hipCenterPrev, hipCenterNow } =
    params

  if (!pose || vw <= 0 || vh <= 0) {
    return { confidence: null, readiness: null, direction: 'none' }
  }

  const direction = PushupService.detectFacingDirection(pose)
  const marginX = vw * MARGIN_FRAC
  const marginY = vh * MARGIN_FRAC

  const nose = kp(pose, POSE_KEYPOINTS.NOSE)
  const ls = kp(pose, POSE_KEYPOINTS.LEFT_SHOULDER)
  const rs = kp(pose, POSE_KEYPOINTS.RIGHT_SHOULDER)
  const lh = kp(pose, POSE_KEYPOINTS.LEFT_HIP)
  const rh = kp(pose, POSE_KEYPOINTS.RIGHT_HIP)
  const la = kp(pose, POSE_KEYPOINTS.LEFT_ANKLE)
  const ra = kp(pose, POSE_KEYPOINTS.RIGHT_ANKLE)
  const lw = kp(pose, POSE_KEYPOINTS.LEFT_WRIST)
  const rw = kp(pose, POSE_KEYPOINTS.RIGHT_WRIST)

  let inFramePenalty = 0
  const penalizeIfEdge = (x: number, y: number, confidence: number) => {
    if (confidence < 0.12) return
    if (
      x < marginX ||
      x > vw - marginX ||
      y < marginY ||
      y > vh - marginY ||
      confidence < 0.2
    ) {
      inFramePenalty += 1
    }
  }

  penalizeIfEdge(nose.x, nose.y, nose.score ?? 0)
  penalizeIfEdge(la.x, la.y, la.score ?? 0)
  penalizeIfEdge(ra.x, ra.y, ra.score ?? 0)

  const headY = Math.min(nose.y, Math.min(ls.y, rs.y))
  const ankleY = Math.max(la.y, ra.y)
  const span = ankleY - headY

  /** Person too small → likely too far; too large span → cropping risk */
  const spanFrac = span / vh
  let framingSpan01 = 1
  if (spanFrac < 0.32) framingSpan01 = spanFrac / 0.32
  else if (spanFrac > 0.88) framingSpan01 = Math.max(0, 1 - (spanFrac - 0.88) / 0.15)

  const framingBounds01 =
    inFramePenalty === 0 ? 1 : Math.max(0, 1 - inFramePenalty * 0.22)

  const ankleVis = Math.min(score01(la.score), score01(ra.score))
  const shoulderVis = Math.min(score01(ls.score), score01(rs.score))
  const hipVis = Math.min(score01(lh.score), score01(rh.score))

  /** Near wrist vs far wrist asymmetric (far side lower bar) */
  let wristPair01 = 0
  if (direction === 'left') {
    const near = lw
    const far = rw
    const nearOk = score01(near.score) >= 0.34
    const farOk = score01(far.score) >= 0.2
    wristPair01 =
      Math.min(score01(near.score) / 0.42, 1) * 0.55 +
      Math.min(score01(far.score) / 0.28, 1) * 0.45
    if (!nearOk || !farOk) wristPair01 *= 0.55
  } else if (direction === 'right') {
    const near = rw
    const far = lw
    const nearOk = score01(near.score) >= 0.34
    const farOk = score01(far.score) >= 0.2
    wristPair01 =
      Math.min(score01(near.score) / 0.42, 1) * 0.55 +
      Math.min(score01(far.score) / 0.28, 1) * 0.45
    if (!nearOk || !farOk) wristPair01 *= 0.55
  } else {
    wristPair01 = Math.min(score01(lw.score), score01(rw.score))
  }

  const visibilityCore = shoulderVis * 0.35 + hipVis * 0.35 + ankleVis * 0.3
  const visibility = visibilityCore * 0.72 + wristPair01 * 0.28

  const readiness = evaluateReadiness(pose, vw, vh, svc)

  let alignment =
    direction === 'invalid'
      ? 0.15
      : readiness.pushupPosition
        ? Math.min(score01(ls.score), score01(rs.score), score01(lh.score), score01(rh.score))
        : 0.42

  if (direction !== 'invalid' && !readiness.pushupPosition) {
    alignment *= 0.65
  }

  const framing = framingBounds01 * framingSpan01 * visibility * 0.5 + framingSpan01 * 0.5

  /** Head very high → suggest tilting camera down */
  const headFrac = headY / vh
  const framingAdjusted = framing * (headFrac < 0.14 ? headFrac / 0.14 : 1)

  const poseConfidence = score01(poseScore / 0.55)

  let deviceStable = 1
  if (hipCenterPrev && hipCenterNow) {
    const dx = hipCenterNow.x - hipCenterPrev.x
    const dy = hipCenterNow.y - hipCenterPrev.y
    const jump = Math.hypot(dx, dy)
    /** ~1.8% frame diagonal per frame (~30fps) ≈ jitter */
    const threshold = Math.hypot(vw, vh) * 0.018
    deviceStable = Math.exp(-jump / Math.max(threshold, 1e-6))
  }

  const composite = Math.min(
    framingAdjusted,
    poseConfidence,
    visibility,
    alignment,
    deviceStable,
  )

  const confidence: CaptureConfidence = {
    framing: Math.max(0, Math.min(1, framingAdjusted)),
    pose: poseConfidence,
    visibility: Math.max(0, Math.min(1, visibility)),
    alignment: Math.max(0, Math.min(1, alignment)),
    deviceStable: Math.max(0, Math.min(1, deviceStable)),
    composite: Math.max(0, Math.min(1, composite)),
  }

  return { confidence, readiness, direction }
}

export function hipMidpointFromPose(pose: Pose): { x: number; y: number } | null {
  const HIP_SCORE_MIN = 0.15
  const lh = pose.keypoints[POSE_KEYPOINTS.LEFT_HIP]
  const rh = pose.keypoints[POSE_KEYPOINTS.RIGHT_HIP]
  const lOk = lh != null && (lh.score ?? 0) >= HIP_SCORE_MIN
  const rOk = rh != null && (rh.score ?? 0) >= HIP_SCORE_MIN
  if (!lOk && !rOk) return null
  if (lOk && !rOk && lh) return { x: lh.x, y: lh.y }
  if (!lOk && rOk && rh) return { x: rh.x, y: rh.y }
  if (lOk && rOk && lh && rh) {
    const wL = lh.score ?? 0
    const wR = rh.score ?? 0
    const w = wL + wR
    if (w <= 0) return { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 }
    return {
      x: (lh.x * wL + rh.x * wR) / w,
      y: (lh.y * wL + rh.y * wR) / w,
    }
  }
  return null
}

export function pickGuidance(params: {
  confidence: CaptureConfidence
  readiness: ReadinessResult | null
  direction: 'left' | 'right' | 'invalid' | 'none'
}): { message: string; reason: CaptureGuidanceReason } {
  const { confidence, readiness, direction } = params

  if (direction === 'invalid') {
    return {
      message: 'Turn about 90° so your side faces the camera.',
      reason: 'side_profile',
    }
  }

  if (readiness?.pushupHint) {
    return { message: readiness.pushupHint, reason: 'plank' }
  }

  const dims: { k: keyof CaptureConfidence; reason: CaptureGuidanceReason; msg: string }[] = [
    { k: 'deviceStable', reason: 'hold_steady', msg: 'Hold the phone steadier or move a bit slower.' },
    { k: 'visibility', reason: 'wrists', msg: 'Keep both arms and wrists in frame.' },
    { k: 'framing', reason: 'move_back', msg: 'Move farther back so your full body fits in frame.' },
    { k: 'pose', reason: 'hold_steady', msg: 'Find better lighting and stay in frame.' },
    { k: 'alignment', reason: 'plank', msg: 'Straighten your line from shoulders to heels.' },
  ]

  let worst: keyof CaptureConfidence = 'composite'
  let worstVal = 1
  for (const d of dims) {
    const v = confidence[d.k]
    if (v < worstVal) {
      worstVal = v
      worst = d.k
    }
  }

  const headHint = confidence.framing < 0.45 && confidence.visibility < 0.5
  if (headHint && confidence.framing < confidence.visibility) {
    return { message: 'Tilt the phone slightly downward if your head is cut off.', reason: 'tilt_down' }
  }

  if (worst === 'framing' && confidence.visibility < 0.45) {
    return { message: 'Both feet must be visible in the frame.', reason: 'feet' }
  }

  const row = dims.find((d) => d.k === worst)
  if (row && worstVal < 0.62) {
    return { message: row.msg, reason: row.reason }
  }

  if (confidence.composite >= 0.55) {
    return { message: 'Full body detected — ready', reason: 'ready' }
  }

  return { message: 'Adjust until your full body is visible head to feet.', reason: 'move_back' }
}

/** Map confidence to solo checklist rows (aligned with ticket language). */
export function confidenceToSoloChecklistStatuses(
  confidence: CaptureConfidence | null,
  readinessPlank: boolean,
): {
  fullBody: 'pass' | 'fail' | 'waiting'
  lighting: 'pass' | 'fail' | 'waiting'
  armsForm: 'pass' | 'fail' | 'waiting'
  holdSteady: 'pass' | 'fail' | 'waiting'
} {
  if (!confidence) {
    return {
      fullBody: 'waiting',
      lighting: 'waiting',
      armsForm: 'waiting',
      holdSteady: 'waiting',
    }
  }

  const fullBody =
    confidence.framing >= 0.48 && confidence.visibility >= 0.42
      ? 'pass'
      : confidence.framing < 0.28 || confidence.visibility < 0.28
        ? 'fail'
        : 'waiting'

  const lighting =
    confidence.pose >= 0.5 ? 'pass' : confidence.pose < 0.32 ? 'fail' : 'waiting'

  const armsForm =
    confidence.visibility >= 0.45 ? 'pass' : confidence.visibility < 0.28 ? 'fail' : 'waiting'

  const holdSteady =
    readinessPlank && confidence.deviceStable >= 0.45 && confidence.alignment >= 0.4
      ? 'pass'
      : confidence.deviceStable < 0.25 && readinessPlank
        ? 'fail'
        : 'waiting'

  return { fullBody, lighting, armsForm, holdSteady }
}
