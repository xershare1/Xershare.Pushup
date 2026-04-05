"""Solo session API — unlimited reps; optional ephemeral video (S3 + TTL)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.billing.clerk_auth import require_clerk_user_id
from app.billing.user_service import get_or_create_user_by_clerk_id
from app.config import get_solo_max_reps, get_solo_max_video_bytes, get_video_ttl_hours
from app.db.deps import get_db_required_session
from app.db.models.solo_session import SoloSession
from app.solo.schemas import SoloSessionListItem, SoloSessionListOut, SoloSessionOut
from app.solo.s3_storage import presigned_video_url, upload_solo_video

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/solo", tags=["solo"])


def _solo_session_out(row: SoloSession) -> SoloSessionOut:
    now = datetime.now(timezone.utc)
    video_url: str | None = None
    if row.video_s3_key:
        remaining = int((row.expires_at - now).total_seconds())
        video_url = presigned_video_url(
            row.video_s3_key,
            expires_seconds=max(60, remaining),
        ) or None
    return SoloSessionOut(
        sessionId=str(row.session_id),
        reps=row.reps,
        videoUrl=video_url,
    )


def _parse_client_session_id(raw: str | None) -> uuid.UUID | None:
    if raw is None or not str(raw).strip():
        return None
    try:
        return uuid.UUID(str(raw).strip())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id: expected a UUID.",
        ) from e


async def _drain_upload(upload: UploadFile | None) -> None:
    if upload is None:
        return
    if not (upload.filename or "").strip():
        return
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break


@router.get("/sessions", response_model=SoloSessionListOut)
def list_solo_sessions(
    limit: int = Query(50, ge=1, le=100),
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloSessionListOut:
    """List non-expired solo sessions for the signed-in user (newest first). Presigned video URLs when stored."""
    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    now = datetime.now(timezone.utc)
    rows = db.scalars(
        select(SoloSession)
        .where(
            SoloSession.user_id == user_uuid,
            SoloSession.expires_at > now,
        )
        .order_by(SoloSession.created_at.desc())
        .limit(limit)
    ).all()

    items: list[SoloSessionListItem] = []
    for row in rows:
        video_url: str | None = None
        if row.video_s3_key:
            remaining = int((row.expires_at - now).total_seconds())
            raw_url = presigned_video_url(
                row.video_s3_key,
                expires_seconds=max(60, remaining),
            )
            video_url = raw_url or None
        items.append(
            SoloSessionListItem(
                sessionId=str(row.session_id),
                reps=row.reps,
                createdAt=row.created_at.isoformat(),
                expiresAt=row.expires_at.isoformat(),
                videoUrl=video_url,
            )
        )

    return SoloSessionListOut(sessions=items)


async def _read_video_limited(upload: UploadFile, max_bytes: int) -> bytes:
    total = 0
    parts: list[bytes] = []
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video file exceeds maximum size ({max_bytes} bytes).",
            )
        parts.append(chunk)
    return b"".join(parts)


@router.post("/session", response_model=SoloSessionOut)
async def create_solo_session(
    reps: int = Form(..., ge=1),
    session_id: str | None = Form(None),
    video: UploadFile | None = File(None),
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloSessionOut:
    """
    Record a solo session. Pass ``session_id`` (UUID) for idempotent retries; optional multipart ``video``
    requires ``AWS_S3_BUCKET``. Rows and S3 objects expire after ``VIDEO_TTL_HOURS`` (default 24).
    """
    max_reps = get_solo_max_reps()
    if reps > max_reps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reps must be between 1 and {max_reps}.",
        )

    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    parsed = _parse_client_session_id(session_id)
    business_session_id = parsed if parsed is not None else uuid.uuid4()

    existing = db.scalar(
        select(SoloSession).where(
            SoloSession.user_id == user_uuid,
            SoloSession.session_id == business_session_id,
        )
    )
    if existing is not None:
        await _drain_upload(video)
        logger.info(
            "solo_session_idempotent_hit",
            extra={
                "session_id": str(business_session_id),
                "user_id": str(user_uuid),
            },
        )
        return _solo_session_out(existing)

    ttl_hours = get_video_ttl_hours()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
    row_pk = uuid.uuid4()

    video_key: str | None = None
    if video is not None and (video.filename or "").strip():
        max_bytes = get_solo_max_video_bytes()
        body = await _read_video_limited(video, max_bytes)
        if not body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty video upload.",
            )
        try:
            video_key = upload_solo_video(
                user_id=user_uuid,
                session_id=business_session_id,
                body=body,
                content_type=video.content_type,
            )
        except ValueError as e:
            msg = str(e)
            if "AWS_S3_BUCKET" in msg or "not set" in msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Video uploads require AWS S3 configuration (AWS_S3_BUCKET).",
                ) from e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            ) from e

    row = SoloSession(
        id=row_pk,
        user_id=user_uuid,
        session_id=business_session_id,
        reps=reps,
        video_s3_key=video_key,
        expires_at=expires_at,
    )
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        replay = db.scalar(
            select(SoloSession).where(
                SoloSession.user_id == user_uuid,
                SoloSession.session_id == business_session_id,
            )
        )
        if replay is not None:
            logger.info(
                "solo_session_idempotent_race",
                extra={
                    "session_id": str(business_session_id),
                    "user_id": str(user_uuid),
                },
            )
            return _solo_session_out(replay)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create solo session.",
        ) from None

    logger.info(
        "solo_session_created",
        extra={
            "session_id": str(business_session_id),
            "row_id": str(row_pk),
            "user_id": str(user_uuid),
            "reps": reps,
            "has_video": bool(video_key),
        },
    )

    return _solo_session_out(row)
