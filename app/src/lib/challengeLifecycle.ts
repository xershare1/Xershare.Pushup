import type { Challenge } from '../types/challenge'

export type Lifecycle = 'proposed' | 'pending' | 'partial' | 'complete'

export function getLifecycle(ch: Challenge): Lifecycle {
  const st = (ch.status ?? '').toLowerCase()
  if (st === 'proposed') {
    return 'proposed'
  }
  if (ch.challengerPushups !== null && ch.opponentPushups !== null) {
    return 'complete'
  }
  if (ch.challengerPushups !== null || ch.opponentPushups !== null) {
    return 'partial'
  }
  return 'pending'
}
