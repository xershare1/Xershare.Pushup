import type { Challenge } from '../types/challenge'

export type Lifecycle = 'pending' | 'partial' | 'complete'

export function getLifecycle(ch: Challenge): Lifecycle {
  if (ch.challengerPushups !== null && ch.opponentPushups !== null) {
    return 'complete'
  }
  if (ch.challengerPushups !== null || ch.opponentPushups !== null) {
    return 'partial'
  }
  return 'pending'
}
