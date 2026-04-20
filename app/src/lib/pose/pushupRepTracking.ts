import type { Pose } from '@tensorflow-models/pose-detection'
import { elbowAngleToMotion01 } from './pushupReadinessChecks'
import { PushupService } from './pushupService'

/** Consecutive frames with weak leg landmarks before clearing phase (avoids flicker under-count). */
const LEG_WEAK_FRAMES_TO_RESET = 6

/** Use last good side profile when nose delta is briefly ambiguous. */
const MAX_DIRECTION_INVALID_FALLBACK = 12

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

/** HUD-only elbow motion when facing is invalid (fallback arm for live camera). */
function motionDisplayFallback(pose: Pose, svc: PushupService): { motion01: number; normalizedElbowDeg: number } {
  const body = svc.getBodyValues(pose, 'left')
  const elbowAngle = svc.getPushupDegrees(body.wrist, body.elbow, body.shoulder)
  const normalizedAngle =
    elbowAngle > 180 ? 360 - Math.abs(elbowAngle) : Math.abs(elbowAngle)
  return {
    motion01: elbowAngleToMotion01(normalizedAngle),
    normalizedElbowDeg: Math.round(normalizedAngle * 10) / 10,
  }
}

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
  /** Consecutive frames with !legsExtended; at LEG_WEAK_FRAMES_TO_RESET, lastStable clears. */
  legWeakStreak: number
  /** Last unambiguous facing; used when detectFacingDirection is briefly invalid. */
  lastDirection: 'left' | 'right' | null
  /** Frames in a row using lastDirection fallback while raw facing is invalid. */
  directionInvalidStreak: number
}

/**
 * Rep counter: `lastStable === 'down'` then validated `up` increments count.
 * Leg and facing noise use short hysteresis so brief bad landmarks do not wipe phase.
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

  const rawFacing = PushupService.detectFacingDirection(pose)
  let direction: 'left' | 'right'
  let nextLastDirection = state.lastDirection
  let nextDirectionInvalidStreak = state.directionInvalidStreak

  if (rawFacing !== 'invalid') {
    direction = rawFacing
    nextLastDirection = rawFacing
    nextDirectionInvalidStreak = 0
  } else if (
    state.lastDirection != null &&
    state.directionInvalidStreak < MAX_DIRECTION_INVALID_FALLBACK
  ) {
    direction = state.lastDirection
    nextDirectionInvalidStreak = state.directionInvalidStreak + 1
  } else {
    const hud = motionDisplayFallback(pose, svc)
    return {
      state: {
        ...state,
        lastDirection: null,
        directionInvalidStreak: 0,
      },
      debug: { ...initialInvalidDebug(), motion01: hud.motion01, normalizedElbowDeg: hud.normalizedElbowDeg },
      repAdded: false,
    }
  }

  const body = svc.getBodyValues(pose, direction)
  const kneeAngleDeg = svc.getEffectivePlankKneeAngleDeg(pose, direction)
  const legsExtended = svc.isLegsExtendedPlank(pose, direction)

  const elbowAngle = svc.getPushupDegrees(body.wrist, body.elbow, body.shoulder)
  const normalizedAngle =
    elbowAngle > 180 ? 360 - Math.abs(elbowAngle) : Math.abs(elbowAngle)
  const backDegrees = svc.getBackDegrees(body.knee, body.hip, body.shoulder)
  const isBackStraight = PushupService.isBackStraightEnough(backDegrees)
  const isValidUp = svc.isInUpPosition(normalizedAngle)
  const isValidDown = svc.isInDownPosition(pose, normalizedAngle)

  const motion01 = elbowAngleToMotion01(normalizedAngle)

  let validatedPosition: 'up' | 'down' | 'transition' = 'transition'
  if (isValidUp && isBackStraight) {
    validatedPosition = 'up'
  } else if (isValidDown && isBackStraight) {
    validatedPosition = 'down'
  }

  let nextLegWeak = state.legWeakStreak
  if (legsExtended) {
    nextLegWeak = 0
  } else {
    nextLegWeak = state.legWeakStreak + 1
  }
  const allowRepFsm = nextLegWeak < LEG_WEAK_FRAMES_TO_RESET

  let nextState: FrameRepTrackerState = state
  let repAdded = false

  if (!allowRepFsm) {
    nextState = {
      ...state,
      repCount: state.repCount,
      lastStable: null,
      legWeakStreak: nextLegWeak,
      lastDirection: nextLastDirection,
      directionInvalidStreak: nextDirectionInvalidStreak,
    }
  } else if (validatedPosition !== 'transition') {
    if (state.lastStable === 'down' && validatedPosition === 'up') {
      repAdded = true
      nextState = {
        ...state,
        repCount: state.repCount + 1,
        lastStable: 'up',
        legWeakStreak: nextLegWeak,
        lastDirection: nextLastDirection,
        directionInvalidStreak: nextDirectionInvalidStreak,
      }
    } else if (state.lastStable !== validatedPosition) {
      nextState = {
        ...state,
        lastStable: validatedPosition,
        legWeakStreak: nextLegWeak,
        lastDirection: nextLastDirection,
        directionInvalidStreak: nextDirectionInvalidStreak,
      }
    } else {
      nextState = {
        ...state,
        legWeakStreak: nextLegWeak,
        lastDirection: nextLastDirection,
        directionInvalidStreak: nextDirectionInvalidStreak,
      }
    }
  } else {
    nextState = {
      ...state,
      legWeakStreak: nextLegWeak,
      lastDirection: nextLastDirection,
      directionInvalidStreak: nextDirectionInvalidStreak,
    }
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
  return {
    lastStable: null,
    repCount: 0,
    legWeakStreak: 0,
    lastDirection: null,
    directionInvalidStreak: 0,
  }
}
