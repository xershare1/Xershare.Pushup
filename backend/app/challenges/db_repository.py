"""Postgres-backed challenge repository."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.challenges.logic import submit_attempt_blocked_reason
from app.challenges.repository import ChallengeRecord, _norm_idempotency_key
from app.challenges.schemas import CreateChallengeBody
from app.config import get_challenge_expiry_hours
from app.db.models.challenge import Challenge
from app.db.models.challenge_attempt import ChallengeAttempt


def _maybe_expire_orm(ch: Challenge) -> bool:
    if ch.status in ("completed", "cancelled", "expired"):
        return False
    if ch.expires_at is None:
        return False
    if datetime.now(timezone.utc) <= ch.expires_at:
        return False
    if ch.challenger_pushups is not None and ch.opponent_pushups is not None:
        return False
    ch.status = "expired"
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
    )


def _sync_challenge_status(ch: Challenge) -> None:
    if ch.status in ("cancelled", "expired"):
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

    def create(
        self, body: CreateChallengeBody, *, idempotency_key: str | None = None
    ) -> ChallengeRecord:
        init = _norm_clerk_id(body.challengerClerkUserId)
        oid = (body.opponentClerkUserId or "").strip()
        ikey = _norm_idempotency_key(idempotency_key) if init else None

        if ikey and init:
            existing = self.session.scalars(
                select(Challenge).where(
                    Challenge.initiator_clerk_user_id == init,
                    Challenge.idempotency_key == ikey,
                )
            ).first()
            if existing:
                _maybe_expire_orm(existing)
                self.session.flush()
                return _record_from_orm(existing)

        cid = str(uuid.uuid4())
        hours = get_challenge_expiry_hours()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        ch = Challenge(
            id=cid,
            challenger_name=body.challengerName.strip(),
            opponent_name=body.opponentName.strip(),
            message=body.message.strip() if body.message and body.message.strip() else None,
            challenger_email=_norm_email(body.challengerEmail),
            opponent_email=_norm_email(body.opponentEmail),
            challenger_clerk_user_id=_norm_clerk_id(body.challengerClerkUserId),
            opponent_clerk_user_id=_norm_clerk_id(body.opponentClerkUserId),
            status="pending",
            initiator_clerk_user_id=init,
            opponent_is_member=bool(oid),
            expires_at=expires_at,
            idempotency_key=ikey,
        )
        self.session.add(ch)
        self.session.flush()
        return _record_from_orm(ch)

    def get(self, challenge_id: str) -> ChallengeRecord | None:
        ch = self.session.scalars(
            select(Challenge)
            .where(Challenge.id == challenge_id)
            .options(selectinload(Challenge.attempts))
        ).first()
        if not ch:
            return None
        _maybe_expire_orm(ch)
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
    ) -> ChallengeRecord:
        ch = self.session.scalars(
            select(Challenge).where(Challenge.id == challenge_id).options(selectinload(Challenge.attempts))
        ).first()
        if not ch:
            raise KeyError(challenge_id)

        _maybe_expire_orm(ch)
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

        clerk_user_id = (
            ch.challenger_clerk_user_id if role == "challenger" else ch.opponent_clerk_user_id
        )

        att = ChallengeAttempt(
            challenge_id=challenge_id,
            participant_role=role,
            clerk_user_id=clerk_user_id,
            pushup_count=pushup_count,
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
