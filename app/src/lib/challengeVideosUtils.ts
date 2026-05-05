import { MS_DAY, msUntilExpiry } from './myVideosUtils'
import type { ChallengeVideoItem } from '../types/challenge'

/** Recording exists and expires within (0, 24h]. */
export function isChallengeVideoExpiringSoon(v: ChallengeVideoItem, now: Date): boolean {
  if (!v.videoUrl) return false
  const ms = msUntilExpiry(v.expiresAt, now)
  return ms > 0 && ms <= MS_DAY
}

export function challengeVideoExpiryHoursCopy(expiresAt: string, now: Date): string {
  const ms = msUntilExpiry(expiresAt, now)
  if (ms <= 0) return 'Expired'
  const h = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)))
  return `Expires in ${h}h`
}
