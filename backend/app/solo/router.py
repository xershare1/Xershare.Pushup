"""Solo session API — unlimited reps; optional ephemeral video (S3 + TTL)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.billing.clerk_auth import require_clerk_user_id
from app.billing.user_service import get_or_create_user_by_clerk_id
from app.config import get_solo_max_reps, get_solo_max_video_bytes, get_video_ttl_hours
from app.db.deps import get_db_required_session
from app.db.models.solo_session import SoloSession
from app.solo.schemas import SoloSessionOut
from app.solo.s3_storage import presigned_video_url, upload_solo_video

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/solo", tags=["solo"])

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
    video: UploadFile | None = File(None),
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloSessionOut:
    """
    Record a solo pushup session. Optional multipart ``video`` requires ``AWS_S3_BUCKET``.
    Rows and S3 objects expire after ``VIDEO_TTL_HOURS`` (default 24).
    """
    max_reps = get_solo_max_reps()
    if reps > max_reps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reps must be between 1 and {max_reps}.",
        )

    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    session_id = uuid.uuid4()
    ttl_hours = get_video_ttl_hours()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)

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
                session_id=session_id,
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
        id=session_id,
        user_id=user_uuid,
        reps=reps,
        video_s3_key=video_key,
        expires_at=expires_at,
    )
    db.add(row)
    db.flush()

    video_url: str | None = None
    if video_key:
        remaining = int((expires_at - datetime.now(timezone.utc)).total_seconds())
        video_url = presigned_video_url(video_key, expires_seconds=max(60, remaining))

    logger.info(
        "solo_session_created",
        extra={
            "session_id": str(session_id),
            "user_id": str(user_uuid),
            "reps": reps,
            "has_video": bool(video_key),
        },
    )

    return SoloSessionOut(
        sessionId=str(session_id),
        reps=reps,
        videoUrl=video_url or None,
    )
