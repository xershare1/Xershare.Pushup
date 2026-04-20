"""Friends API (camelCase JSON)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FriendInviteBody(BaseModel):
    inviteeClerkUserId: str = Field(..., min_length=1)


class FriendBlockBody(BaseModel):
    blockedClerkUserId: str = Field(..., min_length=1)


class FriendOut(BaseModel):
    userId: str
    clerkUserId: str
    displayName: str | None = None


class FriendsListOut(BaseModel):
    friends: list[FriendOut]


class FriendInvitationOut(BaseModel):
    id: str
    inviterUserId: str
    inviteeUserId: str
    inviterClerkUserId: str
    inviteeClerkUserId: str
    inviterDisplayName: str | None = None
    inviteeDisplayName: str | None = None
    status: str
    createdAt: str


class FriendInvitationsListOut(BaseModel):
    incoming: list[FriendInvitationOut]
    outgoing: list[FriendInvitationOut]


class BlockedUserOut(BaseModel):
    userId: str
    clerkUserId: str
    displayName: str | None = None
    createdAt: str


class BlocksListOut(BaseModel):
    blocked: list[BlockedUserOut]


class OkFriendsOut(BaseModel):
    ok: bool = True
