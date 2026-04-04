import type {
  Challenge,
  ChallengeOutcome,
  CreateChallengeBody,
  CreateChallengeResponse,
  LeaderboardEntry,
  SubmitAttemptBody,
} from '../../types/challenge'
import { getLifecycle } from '../../lib/challengeLifecycle'
import { HttpError } from '../httpError'
import {
  mockCreateChallenge,
  mockGetChallenge,
  mockUpsertChallenge,
} from './challengeStore'

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
  challengeId: string,
  body: SubmitAttemptBody,
): Promise<Challenge> {
  const ch = mockGetChallenge(challengeId)
  if (!ch) throw new HttpError(404, 'Challenge not found.')

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
