import type {
  Challenge,
  ChallengeOutcome,
  ChallengeVideosPage,
  CreateChallengeBody,
  CreateChallengeResponse,
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

export async function fetchChallengeVideos(): Promise<ChallengeVideosPage> {
  const expiresSoon = new Date(Date.now() + 5 * 3600 * 1000).toISOString()
  const expiresLater = new Date(Date.now() + 72 * 3600 * 1000).toISOString()

  const challengeVideos = [
    {
      id: 'cv1',
      challengeId: 'e332c2d2-87c6-4b3c-b54e-f171a142ec6e',
      opponent: { username: 'pushuppro22', initials: 'P2' },
      role: 'challenger' as const,
      result: 'won' as const,
      yourScore: 27,
      theirScore: 14,
      recordedAt: '2026-04-25T00:07:00Z',
      expiresAt: expiresSoon,
      videoUrl: 'https://example.com/mock-challenge-video-1.webm',
    },
    {
      id: 'cv2',
      challengeId: 'bd992c13-33c5-4514-bdda-b81f865b407e',
      opponent: { username: 'pushuppro22', initials: 'P2' },
      role: 'challenger' as const,
      result: 'won' as const,
      yourScore: 30,
      theirScore: 22,
      recordedAt: '2026-04-23T22:04:00Z',
      expiresAt: expiresLater,
      videoUrl: 'https://example.com/mock-challenge-video-2.webm',
    },
    {
      id: 'cv3',
      challengeId: 'af778761-18cc-487d-bd73-46bd84f73c9e',
      opponent: { username: 'pushuppro22', initials: 'P2' },
      role: 'challenger' as const,
      result: 'lost' as const,
      yourScore: 27,
      theirScore: 35,
      recordedAt: '2026-04-23T21:55:00Z',
      expiresAt: expiresLater,
      videoUrl: 'https://example.com/mock-challenge-video-3.webm',
    },
  ]

  const stats = {
    total: challengeVideos.length,
    wins: challengeVideos.filter((v) => v.result === 'won').length,
    losses: challengeVideos.filter((v) => v.result === 'lost').length,
    bestReps: Math.max(...challengeVideos.map((v) => v.yourScore), 0),
  }

  return { challengeVideos, stats }
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
