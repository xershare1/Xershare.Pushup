export type ElbowDegBand = { min: number; max: number }

export type PushupAlgorithmConfig = {
  upElbowDeg: ElbowDegBand
  downElbowDeg: ElbowDegBand
  backStraightCosineMin: number
  backStraightCosineMax: number
  minKneeAngleDeg: number
  minFacingNoseDelta: number
  minLegKeypointScore: number
  legWeakFramesToReset: number
  maxDirectionInvalidFallback: number
  minPoseScoreForReps: number
}

/** Partial config for lab tuning; elbow bands may update only min or max. */
export type PartialPushupAlgorithmConfig = Omit<
  Partial<PushupAlgorithmConfig>,
  'upElbowDeg' | 'downElbowDeg'
> & {
  upElbowDeg?: Partial<ElbowDegBand>
  downElbowDeg?: Partial<ElbowDegBand>
}

export const DEFAULT_PUSHUP_ALGORITHM_CONFIG: PushupAlgorithmConfig = {
  upElbowDeg: { min: 130, max: 178 },
  downElbowDeg: { min: 45, max: 85 },
  backStraightCosineMin: 0.78,
  backStraightCosineMax: 1,
  minKneeAngleDeg: 155,
  minFacingNoseDelta: 22,
  minLegKeypointScore: 0.25,
  legWeakFramesToReset: 6,
  maxDirectionInvalidFallback: 12,
  minPoseScoreForReps: 0.25,
}

/** @deprecated Prefer `DEFAULT_PUSHUP_ALGORITHM_CONFIG.upElbowDeg` */
export const UP_ELBOW_DEG = DEFAULT_PUSHUP_ALGORITHM_CONFIG.upElbowDeg

/** @deprecated Prefer `DEFAULT_PUSHUP_ALGORITHM_CONFIG.downElbowDeg` */
export const DOWN_ELBOW_DEG = DEFAULT_PUSHUP_ALGORITHM_CONFIG.downElbowDeg

/** @deprecated Prefer `DEFAULT_PUSHUP_ALGORITHM_CONFIG.backStraightCosineMin` */
export const BACK_STRAIGHT_COSINE_MIN = DEFAULT_PUSHUP_ALGORITHM_CONFIG.backStraightCosineMin

/** @deprecated Prefer `DEFAULT_PUSHUP_ALGORITHM_CONFIG.backStraightCosineMax` */
export const BACK_STRAIGHT_COSINE_MAX = DEFAULT_PUSHUP_ALGORITHM_CONFIG.backStraightCosineMax

export const PUSHUP_LAB_CONFIG_STORAGE_KEY = 'pushup-lab-algorithm-config'

export function mergePushupAlgorithmConfig(
  partial?: PartialPushupAlgorithmConfig | null,
  base: PushupAlgorithmConfig = DEFAULT_PUSHUP_ALGORITHM_CONFIG,
): PushupAlgorithmConfig {
  if (!partial) return { ...base }
  return {
    ...base,
    ...partial,
    upElbowDeg: { ...base.upElbowDeg, ...partial.upElbowDeg },
    downElbowDeg: { ...base.downElbowDeg, ...partial.downElbowDeg },
  }
}

export function loadLabAlgorithmConfig(): PushupAlgorithmConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PUSHUP_ALGORITHM_CONFIG }
  try {
    const raw = localStorage.getItem(PUSHUP_LAB_CONFIG_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PUSHUP_ALGORITHM_CONFIG }
    return mergePushupAlgorithmConfig(JSON.parse(raw) as Partial<PushupAlgorithmConfig>)
  } catch {
    return { ...DEFAULT_PUSHUP_ALGORITHM_CONFIG }
  }
}

export function saveLabAlgorithmConfig(config: PushupAlgorithmConfig): void {
  localStorage.setItem(PUSHUP_LAB_CONFIG_STORAGE_KEY, JSON.stringify(config))
}

export function clearLabAlgorithmConfig(): void {
  localStorage.removeItem(PUSHUP_LAB_CONFIG_STORAGE_KEY)
}
