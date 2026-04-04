import { DOWN_ELBOW_DEG, UP_ELBOW_DEG } from './pushupService'

/** Vertical gauge maps this elbow range (°) bottom → top; lab replay scale (bottom = 80°). */
export const ELBOW_GAUGE_DEG = { min: 50, max: 180 } as const

/** `top` % from the gauge track top (0 = top of strip). Higher elbow angle sits higher. */
export function elbowDegToGaugeTopPercent(deg: number): number {
  const { min: lo, max: hi } = ELBOW_GAUGE_DEG
  const clamped = Math.max(lo, Math.min(hi, deg))
  return ((hi - clamped) / (hi - lo)) * 100
}

/**
 * Horizontal guides: lower edge of “up” (`UP_ELBOW_DEG.min`) and upper edge of “down” (`DOWN_ELBOW_DEG.max`).
 * Brackets the transition band used by rep validation.
 */
export const ELBOW_GAUGE_GUIDE_DEGS = [UP_ELBOW_DEG.min, DOWN_ELBOW_DEG.max] as const
