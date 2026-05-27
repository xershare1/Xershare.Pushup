/** Per-exercise capture standard (orientation, copy, thresholds). MVP: pushups only. */

export type ExerciseId = 'pushup'

export type PreferredScreenOrientation = 'landscape' | 'portrait' | 'either'

export type ExerciseCaptureProfile = {
  id: ExerciseId
  label: string
  preferredScreenOrientation: PreferredScreenOrientation
  /** Non-blocking advisory when screen is not in preferred orientation */
  orientationAdvisoryTitle: string
  orientationAdvisoryBody: string
  setupFramingTitle: string
  setupFramingBody: string
  setupDistanceCopy: string
  setupPropCopy: string
  /** Rolling window length (~2s at 30fps) */
  readinessStableFrames: number
  readinessCompositeMin: number
  activeFramingCompositeMin: number
  /** Mid-session framing loss debounce (ms) */
  framingLossDebounceMs: number
}

const pushupProfile: ExerciseCaptureProfile = {
  id: 'pushup',
  label: 'Pushups',
  preferredScreenOrientation: 'landscape',
  orientationAdvisoryTitle: 'Tip: use landscape',
  orientationAdvisoryBody:
    'Landscape mode gives you the best pushup tracking. Rotate your phone for the most accurate results. If the screen will not rotate, turn off your device orientation lock.',
  setupFramingTitle: 'Frame yourself from the side',
  setupFramingBody:
    'Stand the phone at a three-quarter side angle so your whole body is visible from head to heels.',
  setupDistanceCopy: 'Place the phone about 6–8 feet away.',
  setupPropCopy: 'Prop the device securely so it will not fall during your set.',
  readinessStableFrames: 60,
  readinessCompositeMin: 0.52,
  activeFramingCompositeMin: 0.38,
  framingLossDebounceMs: 500,
}

const BY_ID: Record<ExerciseId, ExerciseCaptureProfile> = {
  pushup: pushupProfile,
}

export function getExerciseCaptureProfile(id: ExerciseId): ExerciseCaptureProfile {
  return BY_ID[id]
}

export function isOrientationAdvisoryActive(
  profile: ExerciseCaptureProfile,
  isLandscape: boolean,
): boolean {
  if (profile.preferredScreenOrientation === 'either') return false
  if (profile.preferredScreenOrientation === 'landscape') return !isLandscape
  return isLandscape
}
