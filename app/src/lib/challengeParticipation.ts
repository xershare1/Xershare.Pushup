import type { Challenge } from '../types/challenge'

export function canRespondAsOpponent(ch: Challenge, userId: string | undefined): boolean {
  if (!userId) return false
  if ((ch.status ?? '').toLowerCase() !== 'proposed') return false
  const chClerk = (ch.challengerClerkUserId ?? '').trim()
  const opClerk = (ch.opponentClerkUserId ?? '').trim()
  if (userId === chClerk) return false
  if (opClerk) return userId === opClerk
  return true
}

export function isChallenger(ch: Challenge, userId: string | undefined): boolean {
  if (!userId) return false
  return (ch.challengerClerkUserId ?? '').trim() === userId
}

export function isParticipantByClerk(ch: Challenge, userId: string | undefined): boolean {
  if (!userId) return false
  const u = userId.trim()
  const challenger = (ch.challengerClerkUserId ?? '').trim()
  const opponent = (ch.opponentClerkUserId ?? '').trim()
  return u === challenger || u === opponent
}

/** Live battles (partial submissions) plus incoming invites you still need to accept. */
export function countChallengesNeedingAttention(
  challenges: Challenge[],
  userId: string | undefined,
): number {
  if (!userId) return 0
  let n = 0
  for (const ch of challenges) {
    if (canRespondAsOpponent(ch, userId)) n++
    else if (
      (ch.status ?? '').toLowerCase() === 'active' &&
      isParticipantByClerk(ch, userId)
    ) {
      n++
    }
  }
  return n
}

/**
 * Orange nav badge: invites you must accept + challenges you sent that are still `proposed`
 * (waiting on the opponent). Same buckets as My challenges “Needs your response” and
 * “Waiting on opponent”.
 */
export function countPendingChallengeActions(challenges: Challenge[], userId: string | undefined): number {
  if (!userId) return 0
  let n = 0
  for (const ch of challenges) {
    if (canRespondAsOpponent(ch, userId)) n++
    else if (isChallenger(ch, userId) && (ch.status ?? '').toLowerCase() === 'proposed') n++
  }
  return n
}

/** Challenges you’re in that are not declined / cancelled / expired / completed. */
export function countActiveChallenges(challenges: Challenge[], userId: string | undefined): number {
  if (!userId) return 0
  const terminal = new Set(['declined', 'cancelled', 'expired', 'completed'])
  return challenges.filter((ch) => {
    if (!isParticipantByClerk(ch, userId)) return false
    return !terminal.has((ch.status ?? '').toLowerCase())
  }).length
}
