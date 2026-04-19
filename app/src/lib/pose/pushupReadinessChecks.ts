import type { Pose } from '@tensorflow-models/pose-detection'
import { PushupService } from './pushupService'

// We only gate on pushup position: it already needs enough landmarks (facing direction,
// elbow, back line, etc.). A separate “full body in frame” check is redundant for this flow.

export type ReadinessResult = {
  pushupPosition: boolean
  pushupHint: string | null
}

export type ChecklistItemStatus = 'pass' | 'fail' | 'waiting'

export type SoloReadinessChecklist = {
  fullBody: ChecklistItemStatus
  lighting: ChecklistItemStatus
  armsForm: ChecklistItemStatus
  holdSteady: ChecklistItemStatus
}

/**
 * Four-row solo readiness UI — heuristics from pose confidence and facing direction.
 */
export function getSoloReadinessChecklist(
  pose: Pose | null,
  poseScore: number,
  _svc: PushupService,
  pushupPosition: boolean,
): SoloReadinessChecklist {
  if (!pose || poseScore < 0.25) {
    return {
      fullBody: 'waiting',
      lighting: 'waiting',
      armsForm: 'waiting',
      holdSteady: 'waiting',
    }
  }
  const direction = PushupService.detectFacingDirection(pose)
  const armsFail = direction === 'invalid'
  const fullBody: ChecklistItemStatus =
    armsFail ? 'fail' : poseScore >= 0.35 ? 'pass' : 'waiting'
  const lighting: ChecklistItemStatus =
    poseScore >= 0.48 ? 'pass' : poseScore >= 0.32 ? 'waiting' : 'fail'
  const armsForm: ChecklistItemStatus = armsFail ? 'fail' : 'pass'
  const holdSteady: ChecklistItemStatus = pushupPosition ? 'pass' : 'waiting'

  return { fullBody, lighting, armsForm, holdSteady }
}

export function evaluateReadiness(
  pose: Pose,
  _videoWidth: number,
  _videoHeight: number,
  svc: PushupService,
): ReadinessResult {
  const direction = PushupService.detectFacingDirection(pose)
  let pushupPosition = false
  let pushupHint: string | null = null

  if (direction === 'invalid') {
    pushupHint = 'Turn 90° so your side faces the camera.'
  } else {
    const body = svc.getBodyValues(pose, direction)
    const elbowAngle = svc.getPushupDegrees(body.wrist, body.elbow, body.shoulder)
    const normalizedAngle =
      elbowAngle > 180 ? 360 - Math.abs(elbowAngle) : Math.abs(elbowAngle)
    const back = svc.getBackDegrees(body.knee, body.hip, body.shoulder)
    const isBackStraight = PushupService.isBackStraightEnough(back)
    const up = svc.isInUpPosition(normalizedAngle)
    const down = svc.isInDownPosition(pose, normalizedAngle)
    pushupPosition = isBackStraight && (up || down)
    if (!pushupPosition) {
      if (!isBackStraight) {
        pushupHint = 'Keep a straight line from shoulders to heels.'
      } else {
        pushupHint = 'Hold the top of a pushup or lower your chest toward the floor.'
      }
    }
  }

  if (pushupPosition) {
    pushupHint = null
  }

  return { pushupPosition, pushupHint }
}

/** Map elbow angle (down ~70° to up ~180°) to 0–1 for motion bar (1 = top/up). */
export function elbowAngleToMotion01(normalizedAngleDeg: number): number {
  const lo = 70
  const hi = 180
  return Math.max(0, Math.min(1, (normalizedAngleDeg - lo) / (hi - lo)))
}
