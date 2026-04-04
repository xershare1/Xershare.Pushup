import { isMockApiEnabled } from './config'
import * as mock from './mock/challenges'
import * as real from './real/challenges'
import type {
  Challenge,
  ChallengeOutcome,
  CreateChallengeBody,
  CreateChallengeResponse,
  LeaderboardEntry,
  SubmitAttemptBody,
} from '../types/challenge'

export async function createChallenge(
  body: CreateChallengeBody,
): Promise<CreateChallengeResponse> {
  return isMockApiEnabled() ? mock.createChallenge(body) : real.createChallenge(body)
}

export async function getChallenge(id: string): Promise<Challenge> {
  return isMockApiEnabled() ? mock.getChallenge(id) : real.getChallenge(id)
}

export async function submitAttempt(
  challengeId: string,
  body: SubmitAttemptBody,
): Promise<Challenge> {
  return isMockApiEnabled()
    ? mock.submitAttempt(challengeId, body)
    : real.submitAttempt(challengeId, body)
}

export async function getResult(challengeId: string): Promise<ChallengeOutcome> {
  return isMockApiEnabled() ? mock.getResult(challengeId) : real.getResult(challengeId)
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return isMockApiEnabled() ? mock.getLeaderboard() : real.getLeaderboard()
}

export type {
  Challenge,
  ChallengeOutcome,
  CreateChallengeBody,
  CreateChallengeResponse,
  LeaderboardEntry,
  SubmitAttemptBody,
} from '../types/challenge'
