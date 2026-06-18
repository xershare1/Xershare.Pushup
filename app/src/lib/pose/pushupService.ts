import type { Keypoint, Pose } from '@tensorflow-models/pose-detection'
import {
  DEFAULT_PUSHUP_ALGORITHM_CONFIG,
  mergePushupAlgorithmConfig,
  type PushupAlgorithmConfig,
} from './pushupAlgorithmConfig'
import { POSE_KEYPOINTS } from './poseKeyPoints'

export {
  BACK_STRAIGHT_COSINE_MAX,
  BACK_STRAIGHT_COSINE_MIN,
  DOWN_ELBOW_DEG,
  UP_ELBOW_DEG,
} from './pushupAlgorithmConfig'

export interface Body {
  shoulder: Keypoint
  elbow: Keypoint
  wrist: Keypoint
  knee: Keypoint
  hip: Keypoint
}

export class PushupService {
  readonly config: PushupAlgorithmConfig

  constructor(config?: Partial<PushupAlgorithmConfig>) {
    this.config = mergePushupAlgorithmConfig(config)
  }

  detectFacingDirection(pose: Pose): 'left' | 'right' | 'invalid' {
    return PushupService.detectFacingDirection(pose, this.config)
  }

  static detectFacingDirection(
    pose: Pose,
    config: PushupAlgorithmConfig = DEFAULT_PUSHUP_ALGORITHM_CONFIG,
  ): 'left' | 'right' | 'invalid' {
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
    if (Math.abs(delta) < config.minFacingNoseDelta) {
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

  isInUpPosition = (currentElbowAngle: number): boolean => {
    const band = this.config.upElbowDeg
    return currentElbowAngle > band.min && currentElbowAngle < band.max
  }

  isInDownPosition = (pose: Pose, currentElbowAngle: number): boolean => {
    const nose = pose.keypoints[POSE_KEYPOINTS.NOSE]
    const leftElbow = pose.keypoints[POSE_KEYPOINTS.LEFT_ELBOW]
    const rightElbow = pose.keypoints[POSE_KEYPOINTS.RIGHT_ELBOW]
    const band = this.config.downElbowDeg

    const elbowAboveNose = nose.y > leftElbow.y || nose.y > rightElbow.y
    return (
      elbowAboveNose &&
      currentElbowAngle > band.min &&
      currentElbowAngle < band.max
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

  isBackStraightEnough(cos: number): boolean {
    return PushupService.isBackStraightEnough(cos, this.config)
  }

  static isBackStraightEnough(
    cos: number,
    config: PushupAlgorithmConfig = DEFAULT_PUSHUP_ALGORITHM_CONFIG,
  ): boolean {
    return cos > config.backStraightCosineMin && cos < config.backStraightCosineMax
  }

  static kneeAngleDeg(
    hip: Keypoint,
    knee: Keypoint,
    ankle: Keypoint,
    config: PushupAlgorithmConfig = DEFAULT_PUSHUP_ALGORITHM_CONFIG,
  ): number | null {
    if (
      (hip.score ?? 0) < config.minLegKeypointScore ||
      (knee.score ?? 0) < config.minLegKeypointScore ||
      (ankle.score ?? 0) < config.minLegKeypointScore
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

  getLegKneeAngleDegForSide(pose: Pose, side: 'left' | 'right'): number | null {
    const hipIndex = side === 'left' ? POSE_KEYPOINTS.LEFT_HIP : POSE_KEYPOINTS.RIGHT_HIP
    const kneeIndex = side === 'left' ? POSE_KEYPOINTS.LEFT_KNEE : POSE_KEYPOINTS.RIGHT_KNEE
    const ankleIndex = side === 'left' ? POSE_KEYPOINTS.LEFT_ANKLE : POSE_KEYPOINTS.RIGHT_ANKLE
    return PushupService.kneeAngleDeg(
      pose.keypoints[hipIndex],
      pose.keypoints[kneeIndex],
      pose.keypoints[ankleIndex],
      this.config,
    )
  }

  getFacingLegKneeAngleDeg(pose: Pose, direction: 'left' | 'right'): number | null {
    return this.getLegKneeAngleDegForSide(pose, direction)
  }

  getOtherLegKneeAngleDeg(pose: Pose, direction: 'left' | 'right'): number | null {
    const other = direction === 'left' ? 'right' : 'left'
    return this.getLegKneeAngleDegForSide(pose, other)
  }

  getEffectivePlankKneeAngleDeg(pose: Pose, direction: 'left' | 'right'): number | null {
    const minKnee = this.config.minKneeAngleDeg
    const facing = this.getFacingLegKneeAngleDeg(pose, direction)
    const other = this.getOtherLegKneeAngleDeg(pose, direction)
    if (facing != null && facing >= minKnee) return facing
    if (other != null && other >= minKnee) return other
    return facing ?? other ?? null
  }

  isLegsExtendedPlank(pose: Pose, direction: 'left' | 'right'): boolean {
    const minKnee = this.config.minKneeAngleDeg
    const facing = this.getFacingLegKneeAngleDeg(pose, direction)
    const other = this.getOtherLegKneeAngleDeg(pose, direction)
    if (facing != null && facing >= minKnee) return true
    if (other != null && other >= minKnee) return true
    return false
  }
}
