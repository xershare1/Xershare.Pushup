import type { Challenge } from '../types/challenge'
import type { ChallengeVideoItem } from '../types/challenge'
import { authedFetchOnce, jsonFetchAuthed, type ClerkGetToken } from './client'
import { isMockApiEnabled } from './config'
import type { FriendOut } from './friends'

export type AdminUserSearchItem = {
  clerkUserId: string
  email: string | null
  displayName: string | null
}

export type AdminUserProfile = {
  clerkUserId: string
  email: string | null
  displayName: string | null
  creditBalance: number
  challengeCount: number
}

export async function checkAdminAccess(getToken: ClerkGetToken): Promise<boolean> {
  if (isMockApiEnabled()) return false
  const res = await authedFetchOnce(getToken, '/admin/session', { method: 'GET' }, { Accept: 'application/json' })
  return res.status === 204
}

export async function adminLookupUsers(getToken: ClerkGetToken, query: string): Promise<AdminUserSearchItem[]> {
  const q = encodeURIComponent(query.trim())
  const out = await jsonFetchAuthed<{ users: AdminUserSearchItem[] }>(
    getToken,
    `/admin/users/lookup?query=${q}`,
    { method: 'GET' },
  )
  return out.users
}

export async function adminUserProfile(getToken: ClerkGetToken, clerkUserId: string): Promise<AdminUserProfile> {
  return jsonFetchAuthed<AdminUserProfile>(
    getToken,
    `/admin/users/${encodeURIComponent(clerkUserId)}/profile`,
    { method: 'GET' },
  )
}

export async function adminUserFriends(getToken: ClerkGetToken, clerkUserId: string): Promise<FriendOut[]> {
  const out = await jsonFetchAuthed<{ friends: FriendOut[] }>(
    getToken,
    `/admin/users/${encodeURIComponent(clerkUserId)}/friends`,
    { method: 'GET' },
  )
  return out.friends
}

export async function adminUserChallenges(getToken: ClerkGetToken, clerkUserId: string): Promise<Challenge[]> {
  return jsonFetchAuthed<Challenge[]>(
    getToken,
    `/admin/users/${encodeURIComponent(clerkUserId)}/challenges`,
    { method: 'GET' },
  )
}

export async function adminUserChallengeVideos(
  getToken: ClerkGetToken,
  clerkUserId: string,
): Promise<ChallengeVideoItem[]> {
  return jsonFetchAuthed<ChallengeVideoItem[]>(
    getToken,
    `/admin/users/${encodeURIComponent(clerkUserId)}/challenge-videos`,
    { method: 'GET' },
  )
}

export type AdminSoloSessionItem = {
  sessionId: string
  reps: number
  createdAt: string
  expiresAt: string
  videoUrl: string | null
}

export async function adminUserSoloSessions(
  getToken: ClerkGetToken,
  clerkUserId: string,
): Promise<AdminSoloSessionItem[]> {
  const out = await jsonFetchAuthed<{ sessions: AdminSoloSessionItem[] }>(
    getToken,
    `/admin/users/${encodeURIComponent(clerkUserId)}/solo-sessions`,
    { method: 'GET' },
  )
  return out.sessions
}

export async function adminGrantCredits(
  getToken: ClerkGetToken,
  clerkUserId: string,
  credits: number,
  reason: string,
): Promise<{ newBalance: number }> {
  return jsonFetchAuthed<{ newBalance: number }>(
    getToken,
    `/admin/users/${encodeURIComponent(clerkUserId)}/credits`,
    {
      method: 'POST',
      body: JSON.stringify({ credits, reason }),
    },
  )
}
