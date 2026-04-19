import type {
  Challenge,
  ChallengeOutcome,
  ChallengeVideoItem,
  CreateChallengeBody,
  CreateChallengeResponse,
  LeaderboardEntry,
  SubmitAttemptBody,
} from '../../types/challenge'
import { getLifecycle } from '../../lib/challengeLifecycle'
import type { ClerkGetToken } from '../client'
import { HttpError } from '../httpError'
import {
  ensureMyChallengesDemoSeed,
  mockCreateChallenge,
  mockGetChallenge,
  mockListChallengesForClerk,
  mockUpsertChallenge,
} from './challengeStore'

async function clerkSubFromGetToken(getToken: ClerkGetToken): Promise<string | null> {
  const token = (await getToken()) ?? null
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1])) as { sub?: string }
    return (payload.sub ?? '').trim() || null
  } catch {
    return null
  }
}

function outcomeFrom(ch: Challenge): ChallengeOutcome {
  const a = ch.challengerPushups ?? 0
  const b = ch.opponentPushups ?? 0
  let winner: ChallengeOutcome['winner']
  if (a === b) winner = 'tie'
  else if (a > b) winner = 'challenger'
  else winner = 'opponent'

  return {
    challengeId: ch.id,
    challengerName: ch.challengerName,
    opponentName: ch.opponentName,
    challengerPushups: a,
    opponentPushups: b,
    winner,
  }
}

export async function createChallenge(
  body: CreateChallengeBody,
): Promise<CreateChallengeResponse> {
  if (!body.challengerName.trim() || !body.opponentName.trim()) {
    throw new HttpError(400, 'Challenger and opponent names are required.')
  }
  return mockCreateChallenge(body)
}

export async function getChallenge(id: string): Promise<Challenge> {
  const ch = mockGetChallenge(id)
  if (!ch) throw new HttpError(404, 'Challenge not found.')
  return ch
}

export async function submitAttempt(
  _getToken: ClerkGetToken,
  challengeId: string,
  body: SubmitAttemptBody,
): Promise<Challenge> {
  const ch = mockGetChallenge(challengeId)
  if (!ch) throw new HttpError(404, 'Challenge not found.')

  const st = (ch.status ?? 'pending').toLowerCase()
  if (st === 'proposed') {
    throw new HttpError(400, 'The opponent has not accepted this challenge yet.')
  }
  if (st === 'declined') {
    throw new HttpError(400, 'This challenge was declined.')
  }

  if (!Number.isFinite(body.pushupCount) || body.pushupCount < 0) {
    throw new HttpError(400, 'Pushup count must be a non-negative number.')
  }
  if (!body.participantName.trim()) {
    throw new HttpError(400, 'Participant name is required.')
  }

  const next: Challenge = { ...ch }
  if (body.role === 'challenger') {
    if (next.challengerPushups !== null) {
      throw new HttpError(400, 'Challenger has already submitted.')
    }
    next.challengerPushups = Math.floor(body.pushupCount)
  } else {
    if (next.opponentPushups !== null) {
      throw new HttpError(400, 'Opponent has already submitted.')
    }
    next.opponentPushups = Math.floor(body.pushupCount)
  }

  mockUpsertChallenge(next)
  return next
}

export async function getResult(challengeId: string): Promise<ChallengeOutcome> {
  const ch = mockGetChallenge(challengeId)
  if (!ch) throw new HttpError(404, 'Challenge not found.')
  if (getLifecycle(ch) !== 'complete') {
    throw new HttpError(400, 'Challenge is not complete yet.')
  }
  return outcomeFrom(ch)
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return [
    { rank: 1, displayName: 'Jamie', bestPushups: 62 },
    { rank: 2, displayName: 'Riley', bestPushups: 58 },
    { rank: 3, displayName: 'Sam', bestPushups: 51 },
  ]
}

export async function fetchMyChallenges(getToken: ClerkGetToken): Promise<Challenge[]> {
  const sub = await clerkSubFromGetToken(getToken)
  if (!sub) throw new HttpError(401, 'Not signed in.')
  let rows = mockListChallengesForClerk(sub)
  if (rows.length === 0) {
    ensureMyChallengesDemoSeed(sub)
    rows = mockListChallengesForClerk(sub)
  }
  rows.sort((a, b) => b.id.localeCompare(a.id))
  return rows
}

export async function fetchChallengeVideos(): Promise<ChallengeVideoItem[]> {
  return []
}

export async function acceptChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  const sub = await clerkSubFromGetToken(getToken)
  if (!sub) throw new HttpError(401, 'Not signed in.')
  const ch = mockGetChallenge(challengeId)
  if (!ch) throw new HttpError(404, 'Challenge not found.')
  const st = (ch.status ?? '').toLowerCase()
  if (st !== 'proposed') throw new HttpError(400, 'This challenge is not waiting for acceptance.')
  const challenger = (ch.challengerClerkUserId ?? '').trim()
  const opponent = (ch.opponentClerkUserId ?? '').trim()
  if (!challenger) throw new HttpError(400, 'This challenge cannot be accepted (missing challenger).')
  if (opponent) {
    if (sub !== opponent) throw new HttpError(403, 'You are not the invited opponent for this challenge.')
  } else {
    if (sub === challenger) throw new HttpError(403, 'You cannot accept your own challenge.')
    ch.opponentClerkUserId = sub
  }
  ch.status = 'pending'
  mockUpsertChallenge(ch)
  return ch
}

export async function declineChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  const sub = await clerkSubFromGetToken(getToken)
  if (!sub) throw new HttpError(401, 'Not signed in.')
  const ch = mockGetChallenge(challengeId)
  if (!ch) throw new HttpError(404, 'Challenge not found.')
  const st = (ch.status ?? '').toLowerCase()
  if (st !== 'proposed') throw new HttpError(400, 'This challenge is not waiting for a response.')
  const challenger = (ch.challengerClerkUserId ?? '').trim()
  const opponent = (ch.opponentClerkUserId ?? '').trim()
  if (!challenger) throw new HttpError(400, 'This challenge cannot be declined (missing challenger).')
  if (opponent) {
    if (sub !== opponent) throw new HttpError(403, 'You are not the invited opponent for this challenge.')
  } else {
    if (sub === challenger) throw new HttpError(403, 'You cannot decline your own challenge.')
  }
  ch.status = 'declined'
  mockUpsertChallenge(ch)
  return ch
}

export async function cancelChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  const sub = await clerkSubFromGetToken(getToken)
  if (!sub) throw new HttpError(401, 'Not signed in.')
  const ch = mockGetChallenge(challengeId)
  if (!ch) throw new HttpError(404, 'Challenge not found.')
  const st = (ch.status ?? '').toLowerCase()
  if (st !== 'proposed') throw new HttpError(400, 'Only a pending proposal can be cancelled.')
  const challenger = (ch.challengerClerkUserId ?? '').trim()
  if (sub !== challenger) throw new HttpError(403, 'Only the challenger can cancel this proposal.')
  ch.status = 'cancelled'
  mockUpsertChallenge(ch)
  return ch
}
