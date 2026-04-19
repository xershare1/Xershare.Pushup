import { type ClerkGetToken, jsonFetchAuthed } from './client'
import { isMockApiEnabled } from './config'
import { HttpError } from './httpError'
import {
  cloneMockBlocked,
  cloneMockFriends,
  cloneMockInvitations,
} from './mock/friendsData'

export type FriendOut = {
  userId: string
  clerkUserId: string
  displayName: string | null
  /** Client/mock UI only; omitted from production API JSON. */
  featured?: boolean
  initialsHint?: string | null
}

export type FriendInvitationOut = {
  id: string
  inviterUserId: string
  inviteeUserId: string
  inviterClerkUserId: string
  inviteeClerkUserId: string
  inviterDisplayName: string | null
  inviteeDisplayName: string | null
  status: string
  createdAt: string
}

export type BlockedUserOut = {
  userId: string
  clerkUserId: string
  displayName: string | null
  createdAt: string
}

function parseDetail(text: string): string {
  try {
    const j = JSON.parse(text) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
  } catch {
    /* ignore */
  }
  return text.trim() || 'Request failed'
}

function wrap<T>(p: Promise<T>): Promise<T> {
  return p.catch((e) => {
    if (e instanceof HttpError) {
      throw new HttpError(e.status, parseDetail(e.message))
    }
    throw e
  })
}

export async function fetchFriends(getToken: ClerkGetToken): Promise<FriendOut[]> {
  if (isMockApiEnabled()) {
    void getToken
    return cloneMockFriends()
  }
  const data = await wrap(
    jsonFetchAuthed<{ friends: FriendOut[] }>(getToken, '/friends'),
  )
  return data.friends
}

export async function fetchFriendInvitations(
  getToken: ClerkGetToken,
): Promise<{ incoming: FriendInvitationOut[]; outgoing: FriendInvitationOut[] }> {
  if (isMockApiEnabled()) {
    void getToken
    return cloneMockInvitations()
  }
  return wrap(
    jsonFetchAuthed<{
      incoming: FriendInvitationOut[]
      outgoing: FriendInvitationOut[]
    }>(getToken, '/friends/invitations'),
  )
}

export async function sendFriendInvitation(
  getToken: ClerkGetToken,
  inviteeClerkUserId: string,
): Promise<FriendInvitationOut> {
  if (isMockApiEnabled()) {
    return {
      id: 'mock',
      inviterUserId: 'a',
      inviteeUserId: 'b',
      inviterClerkUserId: 'x',
      inviteeClerkUserId: inviteeClerkUserId,
      inviterDisplayName: null,
      inviteeDisplayName: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
  }
  return wrap(
    jsonFetchAuthed<FriendInvitationOut>(getToken, '/friends/invitations', {
      method: 'POST',
      body: JSON.stringify({ inviteeClerkUserId }),
    }),
  )
}

export async function acceptFriendInvitation(
  getToken: ClerkGetToken,
  invitationId: string,
): Promise<void> {
  if (isMockApiEnabled()) return
  await wrap(
    jsonFetchAuthed<{ ok: boolean }>(
      getToken,
      `/friends/invitations/${encodeURIComponent(invitationId)}/accept`,
      { method: 'POST' },
    ),
  )
}

export async function declineFriendInvitation(
  getToken: ClerkGetToken,
  invitationId: string,
): Promise<void> {
  if (isMockApiEnabled()) return
  await wrap(
    jsonFetchAuthed<{ ok: boolean }>(
      getToken,
      `/friends/invitations/${encodeURIComponent(invitationId)}/decline`,
      { method: 'POST' },
    ),
  )
}

export async function cancelFriendInvitation(
  getToken: ClerkGetToken,
  invitationId: string,
): Promise<void> {
  if (isMockApiEnabled()) return
  await wrap(
    jsonFetchAuthed<{ ok: boolean }>(
      getToken,
      `/friends/invitations/${encodeURIComponent(invitationId)}`,
      { method: 'DELETE' },
    ),
  )
}

export async function removeFriend(getToken: ClerkGetToken, friendClerkUserId: string): Promise<void> {
  if (isMockApiEnabled()) return
  await wrap(
    jsonFetchAuthed<{ ok: boolean }>(
      getToken,
      `/friends/with/${encodeURIComponent(friendClerkUserId)}`,
      { method: 'DELETE' },
    ),
  )
}

export async function fetchBlockedUsers(getToken: ClerkGetToken): Promise<BlockedUserOut[]> {
  if (isMockApiEnabled()) {
    void getToken
    return cloneMockBlocked()
  }
  const data = await wrap(jsonFetchAuthed<{ blocked: BlockedUserOut[] }>(getToken, '/friends/blocks'))
  return data.blocked
}

export async function blockUser(getToken: ClerkGetToken, blockedClerkUserId: string): Promise<void> {
  if (isMockApiEnabled()) return
  await wrap(
    jsonFetchAuthed<{ ok: boolean }>(getToken, '/friends/blocks', {
      method: 'POST',
      body: JSON.stringify({ blockedClerkUserId }),
    }),
  )
}

export async function unblockUser(getToken: ClerkGetToken, blockedClerkUserId: string): Promise<void> {
  if (isMockApiEnabled()) return
  await wrap(
    jsonFetchAuthed<{ ok: boolean }>(
      getToken,
      `/friends/blocks/${encodeURIComponent(blockedClerkUserId)}`,
      { method: 'DELETE' },
    ),
  )
}
