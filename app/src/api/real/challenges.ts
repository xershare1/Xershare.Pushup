import type {
  Challenge,
  ChallengeOutcome,
  ChallengeVideoItem,
  CreateChallengeBody,
  CreateChallengeResponse,
  LeaderboardEntry,
  SubmitAttemptBody,
} from '../../types/challenge'
import { type ClerkGetToken, fetchAuthed, jsonFetch, jsonFetchAuthed } from '../client'
import { HttpError } from '../httpError'

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

function parseAttemptError(text: string): string {
  try {
    const j = JSON.parse(text) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
  } catch {
    /* ignore */
  }
  return text.trim() || 'Request failed'
}

export async function submitAttempt(
  getToken: ClerkGetToken,
  challengeId: string,
  body: SubmitAttemptBody,
): Promise<Challenge> {
  const form = new FormData()
  form.append('participant_name', body.participantName)
  form.append('pushup_count', String(body.pushupCount))
  form.append('role', body.role)
  if (body.video && body.video.size > 0) {
    const ext = body.video.type.includes('mp4') ? 'mp4' : 'webm'
    form.append('video', body.video, `challenge-attempt.${ext}`)
  }

  const res = await fetchAuthed(getToken, `/challenges/${encodeURIComponent(challengeId)}/attempts`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new HttpError(res.status, parseAttemptError(text))
  }
  return res.json() as Promise<Challenge>
}

export async function fetchChallengeVideos(getToken: ClerkGetToken): Promise<ChallengeVideoItem[]> {
  return jsonFetchAuthed<ChallengeVideoItem[]>(getToken, '/challenges/me/videos')
}

export async function getResult(challengeId: string): Promise<ChallengeOutcome> {
  return jsonFetch<ChallengeOutcome>(
    `/challenges/${encodeURIComponent(challengeId)}/result`,
  )
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return jsonFetch<LeaderboardEntry[]>('/leaderboard')
}

export async function fetchMyChallenges(getToken: ClerkGetToken): Promise<Challenge[]> {
  return jsonFetchAuthed<Challenge[]>(getToken, '/challenges/me')
}

export async function acceptChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  return jsonFetchAuthed<Challenge>(
    getToken,
    `/challenges/${encodeURIComponent(challengeId)}/accept`,
    { method: 'POST' },
  )
}

export async function declineChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  return jsonFetchAuthed<Challenge>(
    getToken,
    `/challenges/${encodeURIComponent(challengeId)}/decline`,
    { method: 'POST' },
  )
}

export async function cancelChallenge(
  getToken: ClerkGetToken,
  challengeId: string,
): Promise<Challenge> {
  return jsonFetchAuthed<Challenge>(
    getToken,
    `/challenges/${encodeURIComponent(challengeId)}/cancel`,
    { method: 'POST' },
  )
}
