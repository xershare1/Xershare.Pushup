"""Friends, invitations, and challenge blocks API."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.billing.clerk_auth import require_clerk_user_id
from app.db.deps import get_db_required_session
from app.friends import service as friend_service
from app.friends.schemas import (
    BlockedUserOut,
    BlocksListOut,
    FriendBlockBody,
    FriendInvitationOut,
    FriendInvitationsListOut,
    FriendInviteBody,
    FriendOut,
    FriendsListOut,
    OkFriendsOut,
)

router = APIRouter(prefix="/friends", tags=["friends"])


def _http_from_service_err(e: Exception) -> HTTPException:
    if isinstance(e, LookupError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e) or "Not found.")
    if isinstance(e, PermissionError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e) or "Forbidden.")
    if isinstance(e, ValueError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    raise e


@router.get("", response_model=FriendsListOut)
def get_friends(
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> FriendsListOut:
    rows = friend_service.list_friends(db, clerk_user_id=clerk_user_id)
    return FriendsListOut(friends=[FriendOut(**r) for r in rows])


@router.get("/invitations", response_model=FriendInvitationsListOut)
def get_invitations(
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> FriendInvitationsListOut:
    incoming, outgoing = friend_service.list_invitations(db, clerk_user_id=clerk_user_id)
    return FriendInvitationsListOut(
        incoming=[
            FriendInvitationOut(**friend_service.invitation_to_out(db, inv)) for inv in incoming
        ],
        outgoing=[
            FriendInvitationOut(**friend_service.invitation_to_out(db, inv)) for inv in outgoing
        ],
    )


@router.post("/invitations", response_model=FriendInvitationOut)
def post_invitation(
    body: FriendInviteBody,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> FriendInvitationOut:
    try:
        inv = friend_service.create_invitation(
            db,
            inviter_clerk_user_id=clerk_user_id,
            invitee_clerk_user_id=body.inviteeClerkUserId,
        )
    except PermissionError as e:
        raise _http_from_service_err(e) from e
    except ValueError as e:
        raise _http_from_service_err(e) from e
    return FriendInvitationOut(**friend_service.invitation_to_out(db, inv))


@router.post("/invitations/{invitation_id}/accept", response_model=OkFriendsOut)
def post_accept_invitation(
    invitation_id: uuid.UUID,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> OkFriendsOut:
    try:
        friend_service.accept_invitation(
            db,
            invitation_id=invitation_id,
            invitee_clerk_user_id=clerk_user_id,
        )
    except (LookupError, PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    return OkFriendsOut()


@router.post("/invitations/{invitation_id}/decline", response_model=OkFriendsOut)
def post_decline_invitation(
    invitation_id: uuid.UUID,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> OkFriendsOut:
    try:
        friend_service.decline_invitation(
            db,
            invitation_id=invitation_id,
            actor_clerk_user_id=clerk_user_id,
        )
    except (LookupError, PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    return OkFriendsOut()


@router.delete("/invitations/{invitation_id}", response_model=OkFriendsOut)
def delete_invitation(
    invitation_id: uuid.UUID,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> OkFriendsOut:
    try:
        friend_service.cancel_invitation(
            db,
            invitation_id=invitation_id,
            actor_clerk_user_id=clerk_user_id,
        )
    except (LookupError, PermissionError, ValueError) as e:
        raise _http_from_service_err(e) from e
    return OkFriendsOut()


@router.delete("/with/{friend_clerk_user_id}", response_model=OkFriendsOut)
def delete_friend(
    friend_clerk_user_id: str,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> OkFriendsOut:
    try:
        friend_service.remove_friendship(
            db,
            actor_clerk_user_id=clerk_user_id,
            friend_clerk_user_id=friend_clerk_user_id,
        )
        db.commit()
    except (LookupError, ValueError) as e:
        db.rollback()
        raise _http_from_service_err(e) from e
    return OkFriendsOut()


@router.get("/blocks", response_model=BlocksListOut)
def get_blocks(
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> BlocksListOut:
    rows = friend_service.list_blocks(db, blocker_clerk_user_id=clerk_user_id)
    return BlocksListOut(blocked=[BlockedUserOut(**r) for r in rows])


@router.post("/blocks", response_model=OkFriendsOut)
def post_block(
    body: FriendBlockBody,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> OkFriendsOut:
    try:
        friend_service.add_block(
            db,
            blocker_clerk_user_id=clerk_user_id,
            blocked_clerk_user_id=body.blockedClerkUserId,
        )
    except ValueError as e:
        raise _http_from_service_err(e) from e
    return OkFriendsOut()


@router.delete("/blocks/{blocked_clerk_user_id}", response_model=OkFriendsOut)
def delete_block(
    blocked_clerk_user_id: str,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> OkFriendsOut:
    friend_service.remove_block(
        db,
        blocker_clerk_user_id=clerk_user_id,
        blocked_clerk_user_id=blocked_clerk_user_id,
    )
    return OkFriendsOut()
