import type { ExerciseId } from './exerciseCaptureProfiles'

/** Serialized with solo session complete-upload for analytics. */
export type SessionStartCaptureContext = {
  exerciseType: ExerciseId
  screenOrientation:
    | 'landscape-primary'
    | 'portrait-primary'
    | 'landscape-secondary'
    | 'portrait-secondary'
    | 'unknown'
  isLandscape: boolean
  cameraFacing: 'user' | 'environment'
  orientationAngle: number | null
  clientTimestamp: string
}

type OrientationApiClass = 'landscape' | 'portrait'

function classifyScreenOrientationType(
  ot: OrientationType | string | undefined,
): OrientationApiClass | null {
  if (!ot) return null
  if (ot === 'landscape-primary' || ot === 'landscape-secondary') return 'landscape'
  if (ot === 'portrait-primary' || ot === 'portrait-secondary') return 'portrait'
  return null
}

/**
 * Landscape vs portrait during device rotation — `matchMedia`, `screen.orientation`, and CSS pixels
 * often disagree briefly; prioritize the Screen Orientation API when present, then media queries,
 * then innerWidth/innerHeight (can lag Safari by a frame until listeners + deferred RAF run).
 */
export function readScreenOrientationFlags(): {
  isLandscape: boolean
  type: SessionStartCaptureContext['screenOrientation']
} {
  const o = typeof screen !== 'undefined' ? screen.orientation : null
  let type: SessionStartCaptureContext['screenOrientation'] = 'unknown'
  if (o?.type) {
    const t = o.type
    if (t === 'landscape-primary' || t === 'landscape-secondary')
      type = t as SessionStartCaptureContext['screenOrientation']
    else if (t === 'portrait-primary' || t === 'portrait-secondary')
      type = t as SessionStartCaptureContext['screenOrientation']
  }

  const fromOrientationApi = classifyScreenOrientationType(o?.type)
  let isLandscape: boolean
  if (fromOrientationApi === 'landscape') {
    isLandscape = true
  } else if (fromOrientationApi === 'portrait') {
    isLandscape = false
  } else if (typeof window !== 'undefined') {
    const mqLand = window.matchMedia?.('(orientation: landscape)')?.matches
    const mqPort = window.matchMedia?.('(orientation: portrait)')?.matches
    if (mqLand) {
      isLandscape = true
    } else if (mqPort) {
      isLandscape = false
    } else {
      const w = window.innerWidth
      const h = window.innerHeight
      isLandscape = w > h
    }
  } else {
    isLandscape = false
  }

  if (type === 'unknown') {
    type = isLandscape ? 'landscape-primary' : 'portrait-primary'
  }
  return { isLandscape, type }
}

export function buildSessionStartCaptureContext(
  exerciseType: ExerciseId,
  cameraFacing: 'user' | 'environment',
): SessionStartCaptureContext {
  const { isLandscape, type } = readScreenOrientationFlags()
  const oScreen = typeof screen !== 'undefined' ? screen.orientation : null
  const angle =
    typeof oScreen?.angle === 'number' && Number.isFinite(oScreen.angle)
      ? Math.round(oScreen.angle)
      : null
  return {
    exerciseType,
    screenOrientation: type,
    isLandscape,
    cameraFacing,
    orientationAngle: angle,
    clientTimestamp: new Date().toISOString(),
  }
}
