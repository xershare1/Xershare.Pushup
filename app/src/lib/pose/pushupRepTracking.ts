import type { Pose } from '@tensorflow-models/pose-detection'
import { elbowAngleToMotion01 } from './pushupReadinessChecks'
import { PushupService } from './pushupService'

export type RepPhase = 'up' | 'down_ready'

export type PushupRepFrameDebug = {
  direction: 'left' | 'right' | 'invalid'
  normalizedElbowDeg: number
  motion01: number
  backCosine: number
  backStraight: boolean
  rawUp: boolean
  rawDown: boolean
  validatedPosition: 'up' | 'down' | 'transition'
  repPhase: RepPhase
  bufferMinMotion01: number | null
  bufferMaxMotion01: number | null
  legsExtended: boolean
  kneeAngleDeg: number | null
}

const initialInvalidDebug = (): PushupRepFrameDebug => ({
  direction: 'invalid',
  normalizedElbowDeg: 0,
  motion01: 0.5,
  backCosine: 0,
  backStraight: false,
  rawUp: false,
  rawDown: false,
  validatedPosition: 'transition',
  repPhase: 'up',
  bufferMinMotion01: null,
  bufferMaxMotion01: null,
  legsExtended: false,
  kneeAngleDeg: null,
})

/*
 * ---------------------------------------------------------------------------
 * TEMPORAL ROLLING BUFFER — disabled (live + lab use frame-based counting).
 * To re-enable: restore REP_BUFFER_MS, REP_COOLDOWN_MS, REP_DOWN_MOTION01,
 * REP_UP_MOTION01, RepBufferSample, RepTrackerState, pruneBuffer, bufferMinMax,
 * advanceRepTrackerFromPose, createInitialRepTracker (buffer min/max + cooldown).
 * ---------------------------------------------------------------------------
 */

/** Per-frame stable position: last validated up/down from PushupService bands. */
export type FrameRepTrackerState = {
  lastStable: 'up' | 'down' | null
  repCount: number
}

/**
 * Rep counter: `lastStable === 'down'` then validated `up` increments count.
 * If legs are not extended (kneel break / non-plank), `lastStable` resets so a bogus rep is not counted.
 * Used for live session and algorithm lab (same logic).
 */
export function advanceRepTrackerFromPoseFrameBased(
  pose: Pose,
  poseScore: number,
  vw: number,
  vh: number,
  svc: PushupService,
  state: FrameRepTrackerState,
): { state: FrameRepTrackerState; debug: PushupRepFrameDebug | null; repAdded: boolean } {
  if (poseScore < 0.25 || vw <= 0 || vh <= 0) {
    return { state, debug: null, repAdded: false }
  }

  const direction = PushupService.detectFacingDirection(pose)
  if (direction === 'invalid') {
    return { state, debug: initialInvalidDebug(), repAdded: false }
  }

  const body = svc.getBodyValues(pose, direction)
  const kneeAngleDeg = svc.getFacingLegKneeAngleDeg(pose, direction)
  const legsExtended = svc.isLegsExtendedPlank(pose, direction)

  const elbowAngle = svc.getPushupDegrees(body.wrist, body.elbow, body.shoulder)
  const normalizedAngle =
    elbowAngle > 180 ? 360 - Math.abs(elbowAngle) : Math.abs(elbowAngle)
  const backDegrees = svc.getBackDegrees(body.knee, body.hip, body.shoulder)
  const isBackStraight = backDegrees > 0.85 && backDegrees < 1
  const isValidUp = svc.isInUpPosition(normalizedAngle)
  const isValidDown = svc.isInDownPosition(pose, normalizedAngle)

  const motion01 = elbowAngleToMotion01(normalizedAngle)

  let validatedPosition: 'up' | 'down' | 'transition' = 'transition'
  if (isValidUp && isBackStraight) {
    validatedPosition = 'up'
  } else if (isValidDown && isBackStraight) {
    validatedPosition = 'down'
  }

  let nextState: FrameRepTrackerState = state
  let repAdded = false

  if (legsExtended) {
    if (validatedPosition !== 'transition') {
      if (state.lastStable === 'down' && validatedPosition === 'up') {
        repAdded = true
        nextState = { ...state, repCount: state.repCount + 1, lastStable: 'up' }
      } else if (state.lastStable !== validatedPosition) {
        nextState = { ...state, lastStable: validatedPosition }
      }
    }
  } else {
    nextState = { repCount: state.repCount, lastStable: null }
  }

  const repPhase: RepPhase = nextState.lastStable === 'down' ? 'down_ready' : 'up'

  const debug: PushupRepFrameDebug = {
    direction,
    normalizedElbowDeg: Math.round(normalizedAngle * 10) / 10,
    motion01,
    backCosine: Math.round(backDegrees * 1000) / 1000,
    backStraight: isBackStraight,
    rawUp: isValidUp,
    rawDown: isValidDown,
    validatedPosition,
    repPhase,
    bufferMinMotion01: null,
    bufferMaxMotion01: null,
    legsExtended,
    kneeAngleDeg,
  }

  return { state: nextState, debug, repAdded }
}

export function createInitialFrameRepTracker(): FrameRepTrackerState {
  return { lastStable: null, repCount: 0 }
}
