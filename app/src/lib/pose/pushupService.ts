import type { Keypoint, Pose } from '@tensorflow-models/pose-detection'
import { POSE_KEYPOINTS } from './poseKeyPoints'

/** Exclusive elbow angle bounds (°) for “arms extended” at top of rep. Exported for lab gauge; same source as `isInUpPosition`. */
export const UP_ELBOW_DEG = { min: 130, max: 178 } as const

/** Exclusive elbow angle bounds (°) for bottom of rep (with nose heuristic unchanged). Exported for lab gauge; same source as `isInDownPosition`. */
export const DOWN_ELBOW_DEG = { min: 45, max: 85 } as const

/** Cosine alignment knee–hip–shoulder; rep counting accepts a slightly wider band than early iterations. */
export const BACK_STRAIGHT_COSINE_MIN = 0.78
export const BACK_STRAIGHT_COSINE_MAX = 1

/** Interior angle at knee (hip–knee–ankle). Near 180° = full plank; kneeling is much lower. */
const MIN_KNEE_ANGLE_DEG = 155

/** Nose vs shoulder-midline (px): below this, facing is ambiguous (relaxed for fewer dropped frames). */
const MIN_FACING_NOSE_DELTA = 22

const MIN_LEG_KEYPOINT_SCORE = 0.25

export interface Body {
  shoulder: Keypoint
  elbow: Keypoint
  wrist: Keypoint
  knee: Keypoint
  hip: Keypoint
}

export class PushupService {
  static detectFacingDirection(pose: Pose): 'left' | 'right' | 'invalid' {
    const nose = pose.keypoints.find((k) => k.name === 'nose')
    const leftShoulder = pose.keypoints.find((k) => k.name === 'left_shoulder')
    const rightShoulder = pose.keypoints.find((k) => k.name === 'right_shoulder')

    const minScore = 0.4
    if (!nose || (nose.score ?? 0) < minScore) return 'invalid'
    if (
      (!leftShoulder || (leftShoulder.score ?? 0) < minScore) &&
      (!rightShoulder || (rightShoulder.score ?? 0) < minScore)
    ) {
      return 'invalid'
    }

    if (!leftShoulder || (leftShoulder.score ?? 0) < minScore) return 'right'
    if (!rightShoulder || (rightShoulder.score ?? 0) < minScore) return 'left'

    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
    const delta = nose.x - shoulderMidX
    if (Math.abs(delta) < MIN_FACING_NOSE_DELTA) {
      return 'invalid'
    }

    return delta < 0 ? 'left' : 'right'
  }

  getBodyValues(pose: Pose, armSide: 'left' | 'right'): Body {
    const shoulderIndex =
      armSide === 'left' ? POSE_KEYPOINTS.LEFT_SHOULDER : POSE_KEYPOINTS.RIGHT_SHOULDER
    const elbowIndex = armSide === 'left' ? POSE_KEYPOINTS.LEFT_ELBOW : POSE_KEYPOINTS.RIGHT_ELBOW
    const wristIndex = armSide === 'left' ? POSE_KEYPOINTS.LEFT_WRIST : POSE_KEYPOINTS.RIGHT_WRIST
    const hipIndex = armSide === 'left' ? POSE_KEYPOINTS.LEFT_HIP : POSE_KEYPOINTS.RIGHT_HIP
    const kneeIndex = armSide === 'left' ? POSE_KEYPOINTS.LEFT_KNEE : POSE_KEYPOINTS.RIGHT_KNEE

    return {
      shoulder: pose.keypoints[shoulderIndex],
      elbow: pose.keypoints[elbowIndex],
      wrist: pose.keypoints[wristIndex],
      hip: pose.keypoints[hipIndex],
      knee: pose.keypoints[kneeIndex],
    }
  }

  getPushupDegrees(wrist: Keypoint, elbow: Keypoint, shoulder: Keypoint): number {
    return (
      (Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) -
        Math.atan2(shoulder.y - elbow.y, shoulder.x - elbow.x)) *
      (180 / Math.PI)
    )
  }

  isInUpPosition = (currentElbowAngle: number): boolean =>
    currentElbowAngle > UP_ELBOW_DEG.min && currentElbowAngle < UP_ELBOW_DEG.max

  isInDownPosition = (pose: Pose, currentElbowAngle: number): boolean => {
    const nose = pose.keypoints[POSE_KEYPOINTS.NOSE]
    const leftElbow = pose.keypoints[POSE_KEYPOINTS.LEFT_ELBOW]
    const rightElbow = pose.keypoints[POSE_KEYPOINTS.RIGHT_ELBOW]

    const elbowAboveNose = nose.y > leftElbow.y || nose.y > rightElbow.y
    return (
      elbowAboveNose &&
      currentElbowAngle > DOWN_ELBOW_DEG.min &&
      currentElbowAngle < DOWN_ELBOW_DEG.max
    )
  }

  getBackDegrees = (knee: Keypoint, hip: Keypoint, shoulder: Keypoint): number => {
    const v1x = knee.x - hip.x
    const v1y = knee.y - hip.y
    const v2x = shoulder.x - hip.x
    const v2y = shoulder.y - hip.y
    const dot = v1x * v2x + v1y * v2y
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
    if (mag1 === 0 || mag2 === 0) return 0
    const cosine = dot / (mag1 * mag2)
    return Math.abs(cosine)
  }

  /**
   * Interior angle at the knee between thigh (knee→hip) and shin (knee→ankle).
   * Returns null if landmarks are missing or low confidence.
   */
  static kneeAngleDeg(hip: Keypoint, knee: Keypoint, ankle: Keypoint): number | null {
    if (
      (hip.score ?? 0) < MIN_LEG_KEYPOINT_SCORE ||
      (knee.score ?? 0) < MIN_LEG_KEYPOINT_SCORE ||
      (ankle.score ?? 0) < MIN_LEG_KEYPOINT_SCORE
    ) {
      return null
    }
    const v1x = hip.x - knee.x
    const v1y = hip.y - knee.y
    const v2x = ankle.x - knee.x
    const v2y = ankle.y - knee.y
    const m1 = Math.hypot(v1x, v1y)
    const m2 = Math.hypot(v2x, v2y)
    if (m1 === 0 || m2 === 0) return null
    const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (m1 * m2)))
    return (Math.acos(cos) * 180) / Math.PI
  }

  /** Hip–knee–ankle angle (°) for one side. */
  getLegKneeAngleDegForSide(pose: Pose, side: 'left' | 'right'): number | null {
    const hipIndex = side === 'left' ? POSE_KEYPOINTS.LEFT_HIP : POSE_KEYPOINTS.RIGHT_HIP
    const kneeIndex = side === 'left' ? POSE_KEYPOINTS.LEFT_KNEE : POSE_KEYPOINTS.RIGHT_KNEE
    const ankleIndex = side === 'left' ? POSE_KEYPOINTS.LEFT_ANKLE : POSE_KEYPOINTS.RIGHT_ANKLE
    return PushupService.kneeAngleDeg(
      pose.keypoints[hipIndex],
      pose.keypoints[kneeIndex],
      pose.keypoints[ankleIndex],
    )
  }

  /** Hip–knee–ankle angle (°) for the camera-facing leg. */
  getFacingLegKneeAngleDeg(pose: Pose, direction: 'left' | 'right'): number | null {
    return this.getLegKneeAngleDegForSide(pose, direction)
  }

  /** Same as facing leg, for the opposite side (fallback when facing leg is cropped or low confidence). */
  getOtherLegKneeAngleDeg(pose: Pose, direction: 'left' | 'right'): number | null {
    const other = direction === 'left' ? 'right' : 'left'
    return this.getLegKneeAngleDegForSide(pose, other)
  }

  /**
   * Knee angle (°) used for debug / lab: prefer the facing leg if it qualifies as plank; else the
   * other leg if it qualifies; else facing or other (whichever is measured).
   */
  getEffectivePlankKneeAngleDeg(pose: Pose, direction: 'left' | 'right'): number | null {
    const facing = this.getFacingLegKneeAngleDeg(pose, direction)
    const other = this.getOtherLegKneeAngleDeg(pose, direction)
    if (facing != null && facing >= MIN_KNEE_ANGLE_DEG) return facing
    if (other != null && other >= MIN_KNEE_ANGLE_DEG) return other
    return facing ?? other ?? null
  }

  /**
   * True when at least one leg reads as extended enough for a full plank (not kneeling / break).
   * Uses the camera-facing leg first, then the other leg if facing landmarks are missing or weak.
   * If neither side can be measured, returns false so rep phase resets conservatively.
   */
  isLegsExtendedPlank(pose: Pose, direction: 'left' | 'right'): boolean {
    const facing = this.getFacingLegKneeAngleDeg(pose, direction)
    const other = this.getOtherLegKneeAngleDeg(pose, direction)
    if (facing != null && facing >= MIN_KNEE_ANGLE_DEG) return true
    if (other != null && other >= MIN_KNEE_ANGLE_DEG) return true
    return false
  }

  /** Straight enough for rep counting / readiness (shared cosine band). */
  static isBackStraightEnough(cos: number): boolean {
    return cos > BACK_STRAIGHT_COSINE_MIN && cos < BACK_STRAIGHT_COSINE_MAX
  }
}
