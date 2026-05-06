import { type ClerkGetToken } from './client'
import { isMockApiEnabled } from './config'
import * as mock from './mock/challenges'
import * as real from './real/challenges'
import type {
  Challenge,
  ChallengeOutcome,
  ChallengeVideosPage,
  CreateChallengeBody,
  CreateChallengeResponse,
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
  getToken: ClerkGetToken,
  challengeId: string,
  body: SubmitAttemptBody,
): Promise<Challenge> {
  return isMockApiEnabled()
    ? mock.submitAttempt(getToken, challengeId, body)
    : real.submitAttempt(getToken, challengeId, body)
}

export async function getResult(challengeId: string): Promise<ChallengeOutcome> {
  return isMockApiEnabled() ? mock.getResult(challengeId) : real.getResult(challengeId)
}

export async function fetchMyChallenges(
  getToken: ClerkGetToken,
): Promise<Challenge[]> {
  return isMockApiEnabled()
    ? mock.fetchMyChallenges(getToken)
    : real.fetchMyChallenges(getToken)
}

export async function fetchChallengeVideos(
  getToken: ClerkGetToken,
): Promise<ChallengeVideosPage> {
  return isMockApiEnabled()
    ? mock.fetchChallengeVideos()
    : real.fetchChallengeVideos(getToken)
}

export async function acceptChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  return isMockApiEnabled()
    ? mock.acceptChallenge(getToken, challengeId)
    : real.acceptChallenge(getToken, challengeId)
}

export async function declineChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  return isMockApiEnabled()
    ? mock.declineChallenge(getToken, challengeId)
    : real.declineChallenge(getToken, challengeId)
}

export async function cancelChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  return isMockApiEnabled()
    ? mock.cancelChallenge(getToken, challengeId)
    : real.cancelChallenge(getToken, challengeId)
}

export type {
  Challenge,
  ChallengeOutcome,
  ChallengeVideoItem,
  ChallengeVideosPage,
  CreateChallengeBody,
  CreateChallengeResponse,
  LeaderboardEntry,
  SubmitAttemptBody,
} from '../types/challenge'
