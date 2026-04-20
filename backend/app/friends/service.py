"""Friend invitations, friendships, and challenge blocks."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, delete, or_, select
from sqlalchemy.orm import Session

from app.billing.user_service import get_or_create_user_by_clerk_id
from app.db.models.friend_invitation import FriendInvitation
from app.db.models.friendship import Friendship
from app.db.models.user import User
from app.db.models.user_challenge_block import UserChallengeBlock


def _ordered_pair(a: uuid.UUID, b: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
    return (a, b) if a < b else (b, a)


def is_pair_challenge_blocked(session: Session, user_id_a: uuid.UUID, user_id_b: uuid.UUID) -> bool:
    row = session.scalars(
        select(UserChallengeBlock).where(
            or_(
                and_(
                    UserChallengeBlock.blocker_user_id == user_id_a,
                    UserChallengeBlock.blocked_user_id == user_id_b,
                ),
                and_(
                    UserChallengeBlock.blocker_user_id == user_id_b,
                    UserChallengeBlock.blocked_user_id == user_id_a,
                ),
            )
        )
    ).first()
    return row is not None


def user_ids_for_clerk_pair(
    session: Session, clerk_a: str, clerk_b: str
) -> tuple[uuid.UUID, uuid.UUID] | None:
    """Return both user ids only if both Clerk users already exist locally."""
    a = (clerk_a or "").strip()
    b = (clerk_b or "").strip()
    if not a or not b or a == b:
        return None
    ua = session.scalars(select(User).where(User.clerk_user_id == a)).first()
    ub = session.scalars(select(User).where(User.clerk_user_id == b)).first()
    if ua is None or ub is None:
        return None
    return ua.id, ub.id


def _friendship_exists(session: Session, u1: uuid.UUID, u2: uuid.UUID) -> bool:
    low, high = _ordered_pair(u1, u2)
    return (
        session.scalars(
            select(Friendship).where(
                Friendship.user_low_id == low,
                Friendship.user_high_id == high,
            )
        ).first()
        is not None
    )


def _pending_invite_between(session: Session, u1: uuid.UUID, u2: uuid.UUID) -> FriendInvitation | None:
    return session.scalars(
        select(FriendInvitation).where(
            FriendInvitation.status == "pending",
            or_(
                and_(
                    FriendInvitation.inviter_user_id == u1,
                    FriendInvitation.invitee_user_id == u2,
                ),
                and_(
                    FriendInvitation.inviter_user_id == u2,
                    FriendInvitation.invitee_user_id == u1,
                ),
            ),
        )
    ).first()


def _close_pending_between(
    session: Session,
    u1: uuid.UUID,
    u2: uuid.UUID,
    *,
    skip_invitation_id: uuid.UUID | None = None,
    terminal_status: str = "cancelled",
) -> None:
    now = datetime.now(timezone.utc)
    for inv in session.scalars(
        select(FriendInvitation).where(
            FriendInvitation.status == "pending",
            or_(
                and_(
                    FriendInvitation.inviter_user_id == u1,
                    FriendInvitation.invitee_user_id == u2,
                ),
                and_(
                    FriendInvitation.inviter_user_id == u2,
                    FriendInvitation.invitee_user_id == u1,
                ),
            ),
        )
    ).all():
        if skip_invitation_id is not None and inv.id == skip_invitation_id:
            continue
        inv.status = terminal_status
        inv.responded_at = now


def create_invitation(
    session: Session,
    *,
    inviter_clerk_user_id: str,
    invitee_clerk_user_id: str,
) -> FriendInvitation:
    inviter_clerk = (inviter_clerk_user_id or "").strip()
    invitee_clerk = (invitee_clerk_user_id or "").strip()
    if not invitee_clerk:
        raise ValueError("inviteeClerkUserId is required.")
    inviter_id = get_or_create_user_by_clerk_id(session, inviter_clerk)
    invitee_id = get_or_create_user_by_clerk_id(session, invitee_clerk)
    if inviter_id == invitee_id:
        raise ValueError("Cannot invite yourself.")
    if is_pair_challenge_blocked(session, inviter_id, invitee_id):
        raise PermissionError("You cannot invite this user.")
    if _friendship_exists(session, inviter_id, invitee_id):
        raise ValueError("You are already friends with this user.")
    if _pending_invite_between(session, inviter_id, invitee_id) is not None:
        raise ValueError("A pending invitation already exists between you and this user.")

    inv = FriendInvitation(
        inviter_user_id=inviter_id,
        invitee_user_id=invitee_id,
        status="pending",
    )
    session.add(inv)
    session.flush()
    return inv


def list_invitations(
    session: Session,
    *,
    clerk_user_id: str,
) -> tuple[list[FriendInvitation], list[FriendInvitation]]:
    uid = get_or_create_user_by_clerk_id(session, (clerk_user_id or "").strip())
    incoming = list(
        session.scalars(
            select(FriendInvitation)
            .where(
                FriendInvitation.invitee_user_id == uid,
                FriendInvitation.status == "pending",
            )
            .order_by(FriendInvitation.created_at.desc())
        ).all()
    )
    outgoing = list(
        session.scalars(
            select(FriendInvitation)
            .where(
                FriendInvitation.inviter_user_id == uid,
                FriendInvitation.status == "pending",
            )
            .order_by(FriendInvitation.created_at.desc())
        ).all()
    )
    return incoming, outgoing


def _user_by_id(session: Session, user_id: uuid.UUID) -> User | None:
    return session.scalars(select(User).where(User.id == user_id)).first()


def invitation_to_out(session: Session, inv: FriendInvitation) -> dict:
    iu = _user_by_id(session, inv.inviter_user_id)
    ie = _user_by_id(session, inv.invitee_user_id)
    return {
        "id": str(inv.id),
        "inviterUserId": str(inv.inviter_user_id),
        "inviteeUserId": str(inv.invitee_user_id),
        "inviterClerkUserId": iu.clerk_user_id if iu else "",
        "inviteeClerkUserId": ie.clerk_user_id if ie else "",
        "inviterDisplayName": iu.display_name if iu else None,
        "inviteeDisplayName": ie.display_name if ie else None,
        "status": inv.status,
        "createdAt": inv.created_at.isoformat() if inv.created_at else "",
    }


def accept_invitation(
    session: Session,
    *,
    invitation_id: uuid.UUID,
    invitee_clerk_user_id: str,
) -> None:
    uid = get_or_create_user_by_clerk_id(session, (invitee_clerk_user_id or "").strip())
    inv = session.scalars(select(FriendInvitation).where(FriendInvitation.id == invitation_id)).first()
    if inv is None:
        raise LookupError("Invitation not found.")
    if inv.status != "pending":
        raise ValueError("This invitation is no longer pending.")
    if inv.invitee_user_id != uid:
        raise PermissionError("You cannot accept this invitation.")

    low, high = _ordered_pair(inv.inviter_user_id, inv.invitee_user_id)
    if not _friendship_exists(session, inv.inviter_user_id, inv.invitee_user_id):
        session.add(Friendship(user_low_id=low, user_high_id=high))

    now = datetime.now(timezone.utc)
    inv.status = "accepted"
    inv.responded_at = now
    _close_pending_between(
        session,
        inv.inviter_user_id,
        inv.invitee_user_id,
        skip_invitation_id=inv.id,
        terminal_status="cancelled",
    )


def decline_invitation(
    session: Session,
    *,
    invitation_id: uuid.UUID,
    actor_clerk_user_id: str,
) -> None:
    uid = get_or_create_user_by_clerk_id(session, (actor_clerk_user_id or "").strip())
    inv = session.scalars(select(FriendInvitation).where(FriendInvitation.id == invitation_id)).first()
    if inv is None:
        raise LookupError("Invitation not found.")
    if inv.status != "pending":
        raise ValueError("This invitation is no longer pending.")
    if inv.invitee_user_id != uid:
        raise PermissionError("You cannot decline this invitation.")
    inv.status = "declined"
    inv.responded_at = datetime.now(timezone.utc)


def cancel_invitation(
    session: Session,
    *,
    invitation_id: uuid.UUID,
    actor_clerk_user_id: str,
) -> None:
    uid = get_or_create_user_by_clerk_id(session, (actor_clerk_user_id or "").strip())
    inv = session.scalars(select(FriendInvitation).where(FriendInvitation.id == invitation_id)).first()
    if inv is None:
        raise LookupError("Invitation not found.")
    if inv.status != "pending":
        raise ValueError("This invitation is no longer pending.")
    if inv.inviter_user_id != uid:
        raise PermissionError("You cannot cancel this invitation.")
    inv.status = "cancelled"
    inv.responded_at = datetime.now(timezone.utc)


def list_friends(session: Session, *, clerk_user_id: str) -> list[dict]:
    uid = get_or_create_user_by_clerk_id(session, (clerk_user_id or "").strip())
    rows = session.scalars(
        select(Friendship).where(
            or_(
                Friendship.user_low_id == uid,
                Friendship.user_high_id == uid,
            )
        )
    ).all()
    out: list[dict] = []
    for f in rows:
        other_id = f.user_high_id if f.user_low_id == uid else f.user_low_id
        u = _user_by_id(session, other_id)
        if u is None:
            continue
        out.append(
            {
                "userId": str(u.id),
                "clerkUserId": u.clerk_user_id,
                "displayName": u.display_name,
            }
        )
    out.sort(key=lambda x: (x.get("displayName") or x["clerkUserId"]).lower())
    return out


def remove_friendship(
    session: Session,
    *,
    actor_clerk_user_id: str,
    friend_clerk_user_id: str,
) -> None:
    actor_id = get_or_create_user_by_clerk_id(session, (actor_clerk_user_id or "").strip())
    friend_id = get_or_create_user_by_clerk_id(session, (friend_clerk_user_id or "").strip())
    if actor_id == friend_id:
        raise ValueError("Invalid friend.")
    low, high = _ordered_pair(actor_id, friend_id)
    result = session.execute(
        delete(Friendship).where(
            Friendship.user_low_id == low,
            Friendship.user_high_id == high,
        )
    )
    if getattr(result, "rowcount", 0) == 0:
        raise LookupError("Friendship not found.")


def add_block(
    session: Session,
    *,
    blocker_clerk_user_id: str,
    blocked_clerk_user_id: str,
) -> None:
    blocker_id = get_or_create_user_by_clerk_id(session, (blocker_clerk_user_id or "").strip())
    blocked_id = get_or_create_user_by_clerk_id(session, (blocked_clerk_user_id or "").strip())
    if blocker_id == blocked_id:
        raise ValueError("Cannot block yourself.")
    existing = session.scalars(
        select(UserChallengeBlock).where(
            UserChallengeBlock.blocker_user_id == blocker_id,
            UserChallengeBlock.blocked_user_id == blocked_id,
        )
    ).first()
    if existing is not None:
        return

    low, high = _ordered_pair(blocker_id, blocked_id)
    session.execute(delete(Friendship).where(Friendship.user_low_id == low, Friendship.user_high_id == high))
    _close_pending_between(session, blocker_id, blocked_id, terminal_status="cancelled")

    session.add(
        UserChallengeBlock(
            blocker_user_id=blocker_id,
            blocked_user_id=blocked_id,
        )
    )


def remove_block(
    session: Session,
    *,
    blocker_clerk_user_id: str,
    blocked_clerk_user_id: str,
) -> None:
    blocker_id = get_or_create_user_by_clerk_id(session, (blocker_clerk_user_id or "").strip())
    blocked_id = get_or_create_user_by_clerk_id(session, (blocked_clerk_user_id or "").strip())
    session.execute(
        delete(UserChallengeBlock).where(
            UserChallengeBlock.blocker_user_id == blocker_id,
            UserChallengeBlock.blocked_user_id == blocked_id,
        )
    )


def list_blocks(session: Session, *, blocker_clerk_user_id: str) -> list[dict]:
    blocker_id = get_or_create_user_by_clerk_id(session, (blocker_clerk_user_id or "").strip())
    rows = session.scalars(
        select(UserChallengeBlock)
        .where(UserChallengeBlock.blocker_user_id == blocker_id)
        .order_by(UserChallengeBlock.created_at.desc())
    ).all()
    out: list[dict] = []
    for b in rows:
        u = _user_by_id(session, b.blocked_user_id)
        if u is None:
            continue
        out.append(
            {
                "userId": str(u.id),
                "clerkUserId": u.clerk_user_id,
                "displayName": u.display_name,
                "createdAt": b.created_at.isoformat() if b.created_at else "",
            }
        )
    return out
