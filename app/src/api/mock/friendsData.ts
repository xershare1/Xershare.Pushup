import type { BlockedUserOut, FriendInvitationOut, FriendOut } from '../friends'

/** Mock friends list for UI when mock API is enabled (PushupPros brief). */
export const MOCK_FRIENDS: FriendOut[] = [
  {
    userId: 'mock_u_pushuppro22',
    clerkUserId: 'mock_friend_pushuppro22',
    displayName: 'pushuppro22',
    featured: true,
    initialsHint: 'P22',
  },
  {
    userId: 'mock_u_repking',
    clerkUserId: 'mock_friend_repking',
    displayName: 'repking',
    featured: false,
    initialsHint: 'RK',
  },
]

/** Incoming: requests others sent to the signed-in user. */
export const MOCK_INCOMING_INVITATIONS: FriendInvitationOut[] = [
  {
    id: 'mock_inv_in_grindmode',
    inviterUserId: 'mock_u_grindmode',
    inviteeUserId: 'mock_u_self',
    inviterClerkUserId: 'mock_grindmode',
    inviteeClerkUserId: 'user_self',
    inviterDisplayName: 'grindmode',
    inviteeDisplayName: null,
    status: 'pending',
    createdAt: '2026-04-19T10:30:00.000Z',
  },
]

/** Outgoing: requests the user sent, awaiting response. */
export const MOCK_OUTGOING_INVITATIONS: FriendInvitationOut[] = [
  {
    id: 'mock_inv_out_ironchest',
    inviterUserId: 'mock_u_self',
    inviteeUserId: 'mock_u_ironchest99',
    inviterClerkUserId: 'user_self',
    inviteeClerkUserId: 'mock_ironchest99',
    inviterDisplayName: null,
    inviteeDisplayName: 'ironchest99',
    status: 'pending',
    createdAt: '2026-04-18T09:00:00.000Z',
  },
]

export const MOCK_BLOCKED: BlockedUserOut[] = []

export function cloneMockFriends(): FriendOut[] {
  return MOCK_FRIENDS.map((f) => ({ ...f }))
}

export function cloneMockInvitations(): {
  incoming: FriendInvitationOut[]
  outgoing: FriendInvitationOut[]
} {
  return {
    incoming: MOCK_INCOMING_INVITATIONS.map((i) => ({ ...i })),
    outgoing: MOCK_OUTGOING_INVITATIONS.map((i) => ({ ...i })),
  }
}

export function cloneMockBlocked(): BlockedUserOut[] {
  return MOCK_BLOCKED.map((b) => ({ ...b }))
}
