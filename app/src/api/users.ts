import { type ClerkGetToken, jsonFetchAuthed } from './client'
import { isMockApiEnabled } from './config'
import { HttpError } from './httpError'

export type UserSyncResponse = {
  id: string
  clerkUserId: string
  email: string | null
  displayName: string | null
  voiceRepCounterEnabled: boolean
}

export type UserLookupResponse = {
  clerkUserId: string
  displayName: string | null
}

export type ChallengeRecordEntry = {
  challengeId: string
  opponentName: string
  userPushups: number
  opponentPushups: number
  outcome: 'win' | 'loss' | 'tie'
  completedAt: string | null
}

export type MyChallengeRecordResponse = {
  wins: number
  losses: number
  ties: number
  entries: ChallengeRecordEntry[]
}

function parseFastApiDetail(text: string): string {
  try {
    const j = JSON.parse(text) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
  } catch {
    /* ignore */
  }
  return text.trim() || 'Request failed'
}

/**
 * Upsert local user from Clerk profile (backend calls Clerk GET /v1/users/{id}).
 * Call once after sign-in when DATABASE_URL is configured on the API.
 */
export async function syncUser(getToken: ClerkGetToken): Promise<UserSyncResponse | null> {
  if (isMockApiEnabled()) {
    return {
      id: 'mock-user-id',
      clerkUserId: 'mock_clerk',
      email: null,
      displayName: null,
      voiceRepCounterEnabled: false,
    }
  }

  const token = await getToken()
  if (!token) {
    return null
  }

  return jsonFetchAuthed<UserSyncResponse>(getToken, '/users/sync', {
    method: 'POST',
  })
}

export async function patchVoiceRepCounterPreference(
  getToken: ClerkGetToken,
  voiceRepCounterEnabled: boolean,
): Promise<UserSyncResponse | null> {
  if (isMockApiEnabled()) {
    return {
      id: 'mock-user-id',
      clerkUserId: 'mock_clerk',
      email: null,
      displayName: null,
      voiceRepCounterEnabled,
    }
  }

  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to update voice preference.')
  }

  return jsonFetchAuthed<UserSyncResponse>(getToken, '/users/preferences/voice-rep-counter', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voiceRepCounterEnabled }),
  })
}

/**
 * Resolve a member by local ``users.display_name`` (case-insensitive). Requires DB on API.
 */
export async function lookupUserByDisplayName(
  getToken: ClerkGetToken,
  displayName: string,
): Promise<UserLookupResponse> {
  const trimmed = displayName.trim()
  if (!trimmed) {
    throw new Error('Enter a display name.')
  }

  if (isMockApiEnabled()) {
    return {
      clerkUserId: 'mock_opponent_clerk',
      displayName: trimmed,
    }
  }

  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to invite a member by display name.')
  }

  const q = encodeURIComponent(trimmed)
  try {
    return await jsonFetchAuthed<UserLookupResponse>(
      getToken,
      `/users/lookup-by-display-name?displayName=${q}`,
    )
  } catch (e) {
    if (e instanceof HttpError) {
      throw new HttpError(e.status, parseFastApiDetail(e.message))
    }
    throw e
  }
}

/**
 * Completed challenges for the signed-in user (wins / losses / ties vs opponents).
 */
export async function fetchMyChallengeRecord(
  getToken: () => Promise<string | null>,
): Promise<MyChallengeRecordResponse> {
  if (isMockApiEnabled()) {
    return { wins: 0, losses: 0, ties: 0, entries: [] }
  }

  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to view your record.')
  }

  try {
    return await jsonFetchAuthed<MyChallengeRecordResponse>(
      getToken,
      '/users/my-challenge-record',
    )
  } catch (e) {
    if (e instanceof HttpError) {
      throw new HttpError(e.status, parseFastApiDetail(e.message))
    }
    throw e
  }
}
