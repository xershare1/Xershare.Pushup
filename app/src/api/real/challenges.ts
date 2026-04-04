import type {
  Challenge,
  ChallengeOutcome,
  CreateChallengeBody,
  CreateChallengeResponse,
  LeaderboardEntry,
  SubmitAttemptBody,
} from '../../types/challenge'
import { jsonFetch } from '../client'

export async function createChallenge(
  body: CreateChallengeBody,
): Promise<CreateChallengeResponse> {
  return jsonFetch<CreateChallengeResponse>('/challenges', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getChallenge(id: string): Promise<Challenge> {
  return jsonFetch<Challenge>(`/challenges/${encodeURIComponent(id)}`)
}

export async function submitAttempt(
  challengeId: string,
  body: SubmitAttemptBody,
): Promise<Challenge> {
  return jsonFetch<Challenge>(
    `/challenges/${encodeURIComponent(challengeId)}/attempts`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export async function getResult(challengeId: string): Promise<ChallengeOutcome> {
  return jsonFetch<ChallengeOutcome>(
    `/challenges/${encodeURIComponent(challengeId)}/result`,
  )
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return jsonFetch<LeaderboardEntry[]>('/leaderboard')
}
