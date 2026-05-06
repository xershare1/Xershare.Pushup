"""Postgres-backed challenge repository."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.challenges.exceptions import IdempotencyGiftMismatchError
from app.challenges.logic import submit_attempt_blocked_reason
from app.challenges.repository import (
    ChallengeRecord,
    _norm_idempotency_key,
    resolve_actor_clerk_for_role_slot,
)
from app.challenges.schemas import CreateChallengeBody
from app.config import get_challenge_expiry_hours
from app.db.models.challenge import Challenge
from app.db.models.challenge_attempt import ChallengeAttempt
from app.friends.service import is_pair_challenge_blocked, user_ids_for_clerk_pair


def _maybe_expire_orm(session: Session, ch: Challenge) -> bool:
    if ch.status in ("completed", "cancelled", "expired", "declined"):
        return False
    if ch.expires_at is None:
        return False
    if datetime.now(timezone.utc) <= ch.expires_at:
        return False
    if ch.challenger_pushups is not None and ch.opponent_pushups is not None:
        return False
    prev = ch.status
    ch.status = "expired"
    from app.billing.challenge_credits import maybe_refund_proposed_in_session

    maybe_refund_proposed_in_session(
        session,
        challenge_id=ch.id,
        challenger_clerk_user_id=ch.challenger_clerk_user_id,
        prior_status=prev,
        gifted=bool(getattr(ch, "gifted", False)),
        reason="expire",
    )
    return True


def _record_from_orm(ch: Challenge) -> ChallengeRecord:
    return ChallengeRecord(
        id=ch.id,
        challenger_name=ch.challenger_name,
        opponent_name=ch.opponent_name,
        message=ch.message,
        challenger_pushups=ch.challenger_pushups,
        opponent_pushups=ch.opponent_pushups,
        challenger_email=ch.challenger_email,
        opponent_email=ch.opponent_email,
        challenger_clerk_user_id=ch.challenger_clerk_user_id,
        opponent_clerk_user_id=ch.opponent_clerk_user_id,
        status=ch.status or "pending",
        expires_at=ch.expires_at,
        completed_at=ch.completed_at,
        gifted=bool(getattr(ch, "gifted", False)),
    )


def _sync_challenge_status(ch: Challenge) -> None:
    if ch.status in ("cancelled", "expired", "declined", "proposed"):
        return
    a = ch.challenger_pushups is not None
    b = ch.opponent_pushups is not None
    if a and b:
        ch.status = "completed"
        if ch.completed_at is None:
            ch.completed_at = datetime.now(timezone.utc)
    elif a or b:
        ch.status = "active"
    else:
        ch.status = "pending"


class DbChallengeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def clerk_pair_challenge_blocked(
        self, challenger_clerk_user_id: str, opponent_clerk_user_id: str
    ) -> bool:
        pair = user_ids_for_clerk_pair(
            self.session, challenger_clerk_user_id, opponent_clerk_user_id
        )
        if pair is None:
            return False
        uid_a, uid_b = pair
        return is_pair_challenge_blocked(self.session, uid_a, uid_b)

    def create(
        self,
        body: CreateChallengeBody,
        *,
        idempotency_key: str | None = None,
        resolved_opponent_email: str | None = None,
    ) -> ChallengeRecord:
        init = _norm_clerk_id(body.challengerClerkUserId)
        oid = (body.opponentClerkUserId or "").strip()
        ikey = _norm_idempotency_key(idempotency_key) if init else None
        want_gifted = bool(body.coverOpponentEntry)

        if ikey and init:
            existing = self.session.scalars(
                select(Challenge).where(
                    Challenge.initiator_clerk_user_id == init,
                    Challenge.idempotency_key == ikey,
                )
            ).first()
            if existing:
                if bool(existing.gifted) != want_gifted:
                    raise IdempotencyGiftMismatchError(
                        "Idempotency-Key matches an existing challenge with a different "
                        "gift (cover opponent) setting. Use a new Idempotency-Key."
                    )
                _maybe_expire_orm(self.session, existing)
                self.session.flush()
                return _record_from_orm(existing)

        cid = str(uuid.uuid4())
        hours = get_challenge_expiry_hours()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        opponent_email = _norm_email(body.opponentEmail) or _norm_email(resolved_opponent_email)
        ch = Challenge(
            id=cid,
            challenger_name=body.challengerName.strip(),
            opponent_name=body.opponentName.strip(),
            message=body.message.strip() if body.message and body.message.strip() else None,
            challenger_email=_norm_email(body.challengerEmail),
            opponent_email=opponent_email,
            challenger_clerk_user_id=_norm_clerk_id(body.challengerClerkUserId),
            opponent_clerk_user_id=_norm_clerk_id(body.opponentClerkUserId),
            status="proposed",
            initiator_clerk_user_id=init,
            opponent_is_member=bool(oid),
            expires_at=expires_at,
            idempotency_key=ikey,
            gifted=want_gifted,
        )
        self.session.add(ch)
        self.session.flush()
        return _record_from_orm(ch)

    def list_for_clerk_user(self, clerk_user_id: str) -> list[ChallengeRecord]:
        c = (clerk_user_id or "").strip()
        if not c:
            return []
        rows = self.session.scalars(
            select(Challenge)
            .where(
                or_(
                    Challenge.challenger_clerk_user_id == c,
                    Challenge.opponent_clerk_user_id == c,
                )
            )
            .order_by(Challenge.created_at.desc())
        ).all()
        out: list[ChallengeRecord] = []
        for ch in rows:
            _maybe_expire_orm(self.session, ch)
            out.append(_record_from_orm(ch))
        self.session.flush()
        return out

    def get(self, challenge_id: str) -> ChallengeRecord | None:
        ch = self.session.scalars(
            select(Challenge)
            .where(Challenge.id == challenge_id)
            .options(selectinload(Challenge.attempts))
        ).first()
        if not ch:
            return None
        _maybe_expire_orm(self.session, ch)
        self.session.flush()
        return _record_from_orm(ch)

    def upsert(self, rec: ChallengeRecord) -> None:
        ch = self.session.scalars(select(Challenge).where(Challenge.id == rec.id)).first()
        if not ch:
            ch = Challenge(id=rec.id, challenger_name=rec.challenger_name, opponent_name=rec.opponent_name)
            self.session.add(ch)
        ch.challenger_name = rec.challenger_name
        ch.opponent_name = rec.opponent_name
        ch.message = rec.message
        ch.challenger_email = rec.challenger_email
        ch.opponent_email = rec.opponent_email
        ch.challenger_clerk_user_id = rec.challenger_clerk_user_id
        ch.opponent_clerk_user_id = rec.opponent_clerk_user_id
        ch.challenger_pushups = rec.challenger_pushups
        ch.opponent_pushups = rec.opponent_pushups
        if rec.expires_at is not None:
            ch.expires_at = rec.expires_at
        if rec.status:
            ch.status = rec.status
        if rec.completed_at is not None:
            ch.completed_at = rec.completed_at
        ch.gifted = rec.gifted
        _sync_challenge_status(ch)
        self.session.flush()

    def all_records(self) -> list[ChallengeRecord]:
        rows = self.session.scalars(select(Challenge)).all()
        return [_record_from_orm(ch) for ch in rows]

    def apply_attempt(
        self,
        challenge_id: str,
        *,
        role: Literal["challenger", "opponent"],
        pushup_count: int,
        actor_clerk_user_id: str,
        video_s3_key: str | None = None,
    ) -> ChallengeRecord:
        ch = self.session.scalars(
            select(Challenge).where(Challenge.id == challenge_id).options(selectinload(Challenge.attempts))
        ).first()
        if not ch:
            raise KeyError(challenge_id)

        _maybe_expire_orm(self.session, ch)
        self.session.flush()
        rec = _record_from_orm(ch)
        reason = submit_attempt_blocked_reason(rec)
        if reason:
            raise ValueError(reason)

        existing = self.session.scalars(
            select(ChallengeAttempt).where(
                ChallengeAttempt.challenge_id == challenge_id,
                ChallengeAttempt.participant_role == role,
            )
        ).first()
        if existing:
            msg = (
                "Challenger has already submitted."
                if role == "challenger"
                else "Opponent has already submitted."
            )
            raise ValueError(msg)

        if role == "challenger":
            resolved_clerk = resolve_actor_clerk_for_role_slot(
                ch.challenger_clerk_user_id,
                actor_clerk_user_id,
                "challenger",
            )
            ch.challenger_clerk_user_id = resolved_clerk
        else:
            resolved_clerk = resolve_actor_clerk_for_role_slot(
                ch.opponent_clerk_user_id,
                actor_clerk_user_id,
                "opponent",
            )
            ch.opponent_clerk_user_id = resolved_clerk

        att = ChallengeAttempt(
            challenge_id=challenge_id,
            participant_role=role,
            clerk_user_id=resolved_clerk,
            pushup_count=pushup_count,
            video_s3_key=video_s3_key,
        )
        self.session.add(att)

        if role == "challenger":
            ch.challenger_pushups = pushup_count
        else:
            ch.opponent_pushups = pushup_count
        _sync_challenge_status(ch)
        self.session.flush()
        return _record_from_orm(ch)


def _norm_email(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip()


def _norm_clerk_id(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip()
