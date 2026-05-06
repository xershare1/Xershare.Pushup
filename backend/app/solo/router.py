"""Solo session API — unlimited reps; optional ephemeral video (S3 + TTL)."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.billing.clerk_auth import require_clerk_user_id
from app.billing.user_service import get_or_create_user_by_clerk_id
from app.config import (
    get_aws_s3_bucket,
    get_solo_max_reps,
    get_solo_max_video_bytes,
    get_solo_multipart_threshold_bytes,
    get_video_ttl_hours,
)
from app.db.deps import get_db_required_session
from app.db.models.solo_session import SoloSession
from app.solo.schemas import (
    DEFAULT_SOLO_MULTIPART_CONCURRENCY,
    RECOMMENDED_SOLO_MULTIPART_CHUNK_BYTES,
    SoloMultipartAbortIn,
    SoloMultipartCompleteIn,
    SoloMultipartInitIn,
    SoloMultipartInitOut,
    SoloMultipartPresignPartsIn,
    SoloMultipartPresignPartsOut,
    SoloSessionCompleteUploadIn,
    SoloSessionListItem,
    SoloSessionListOut,
    SoloSessionOut,
    SoloSessionPrepareUploadIn,
    SoloSessionPrepareUploadOut,
)
from app.solo.s3_storage import (
    head_solo_video,
    multipart_abort,
    multipart_assert_upload_alive,
    multipart_complete,
    multipart_create_solo_video,
    multipart_list_parts,
    multipart_presigned_part_url,
    presigned_put_solo_video_url,
    solo_session_video_key,
)
from app.solo.video_playback import playback_url_for_video_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/solo", tags=["solo"])


def _video_playback_ttl_seconds(expires_at: datetime, *, now: datetime | None = None) -> int:
    t = now or datetime.now(timezone.utc)
    return max(60, int((expires_at - t).total_seconds()))


def _solo_session_out(row: SoloSession) -> SoloSessionOut:
    now = datetime.now(timezone.utc)
    video_url: str | None = None
    if row.video_s3_key:
        ttl_s = _video_playback_ttl_seconds(row.expires_at, now=now)
        raw = playback_url_for_video_key(row.video_s3_key, expires_seconds=ttl_s)
        video_url = raw or None
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


def _s3_bucket_config_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Video uploads require AWS S3 configuration (AWS_S3_BUCKET).",
    )


def _solo_common_upload_constraints(payload_reps: int, payload_video_size: int) -> None:
    max_reps = get_solo_max_reps()
    if payload_reps > max_reps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reps must be between 1 and {max_reps}.",
        )

    max_bytes = get_solo_max_video_bytes()
    if payload_video_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video file exceeds maximum size ({max_bytes} bytes).",
        )


@router.get("/sessions", response_model=SoloSessionListOut)
def list_solo_sessions(
    limit: int = Query(50, ge=1, le=100),
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloSessionListOut:
    """List non-expired solo sessions for the signed-in user (newest first). CloudFront or S3 video URLs."""

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
            ttl_s = _video_playback_ttl_seconds(row.expires_at, now=now)
            raw_url = playback_url_for_video_key(row.video_s3_key, expires_seconds=ttl_s)
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


def _solo_idempotent_prepare_out(existing: SoloSession, business_session_id: uuid.UUID, user_uuid: uuid.UUID) -> SoloSessionPrepareUploadOut:
    out = _solo_session_out(existing)
    logger.info(
        "solo_session_prepare_idempotent_hit",
        extra={
            "session_id": str(business_session_id),
            "user_id": str(user_uuid),
        },
    )
    return SoloSessionPrepareUploadOut(
        sessionId=out.sessionId,
        reps=out.reps,
        videoUrl=out.videoUrl,
        uploadUrl=None,
        uploadHeaders={},
        uploadStrategy="simple_put",
        multipartThresholdBytes=None,
        multipartRecommendedPartBytes=None,
        multipartMaxConcurrency=None,
    )


@router.post("/session/prepare-upload", response_model=SoloSessionPrepareUploadOut)
def prepare_solo_session_upload(
    payload: SoloSessionPrepareUploadIn,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloSessionPrepareUploadOut:
    """
    Presigned URLs for browser-direct S3 upload (single PUT or multipart via follow-up endpoints).
    Idempotent: if the session already exists, returns ``videoUrl``.
    """
    _solo_common_upload_constraints(payload.reps, payload.videoSizeBytes)

    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    parsed = _parse_client_session_id(payload.sessionId)
    business_session_id = parsed if parsed is not None else uuid.uuid4()
    threshold = get_solo_multipart_threshold_bytes()

    existing = db.scalar(
        select(SoloSession).where(
            SoloSession.user_id == user_uuid,
            SoloSession.session_id == business_session_id,
        )
    )
    if existing is not None:
        return _solo_idempotent_prepare_out(existing, business_session_id, user_uuid)

    if payload.videoSizeBytes >= threshold:
        if not get_aws_s3_bucket():
            raise _s3_bucket_config_error()
        logger.info(
            "solo_session_prepare_multipart_strategy",
            extra={
                "session_id": str(business_session_id),
                "user_id": str(user_uuid),
                "video_bytes": payload.videoSizeBytes,
                "multipart_threshold_bytes": threshold,
            },
        )
        return SoloSessionPrepareUploadOut(
            sessionId=str(business_session_id),
            reps=payload.reps,
            videoUrl=None,
            uploadUrl=None,
            uploadHeaders={},
            uploadStrategy="multipart",
            multipartThresholdBytes=threshold,
            multipartRecommendedPartBytes=RECOMMENDED_SOLO_MULTIPART_CHUNK_BYTES,
            multipartMaxConcurrency=DEFAULT_SOLO_MULTIPART_CONCURRENCY,
        )

    try:
        _, upload_url, headers = presigned_put_solo_video_url(
            user_id=user_uuid,
            session_id=business_session_id,
            content_type=payload.contentType,
            expires_seconds=3600,
        )
    except ValueError as e:
        msg = str(e)
        if "AWS_S3_BUCKET" in msg or "not set" in msg.lower():
            raise _s3_bucket_config_error() from e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        ) from e

    logger.info(
        "solo_session_prepare_upload",
        extra={
            "session_id": str(business_session_id),
            "user_id": str(user_uuid),
            "video_bytes": payload.videoSizeBytes,
        },
    )

    return SoloSessionPrepareUploadOut(
        sessionId=str(business_session_id),
        reps=payload.reps,
        videoUrl=None,
        uploadUrl=upload_url,
        uploadHeaders=headers,
        uploadStrategy="simple_put",
        multipartThresholdBytes=threshold,
        multipartRecommendedPartBytes=None,
        multipartMaxConcurrency=None,
    )


def _solo_parse_session_uuid(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(raw).strip())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id: expected a UUID.",
        ) from e


@router.post("/session/multipart/init", response_model=SoloMultipartInitOut)
def solo_multipart_init(
    payload: SoloMultipartInitIn,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloMultipartInitOut:
    """Begin S3 multipart upload for a solo session video (caller already chose multipart via prepare-upload)."""
    _solo_common_upload_constraints(payload.reps, payload.videoSizeBytes)
    threshold = get_solo_multipart_threshold_bytes()
    if payload.videoSizeBytes < threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multipart upload applies only above the server's configured threshold for this endpoint.",
        )
    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    parsed = _parse_client_session_id(payload.sessionId)
    business_session_id = parsed if parsed is not None else uuid.uuid4()

    existing = db.scalar(
        select(SoloSession).where(
            SoloSession.user_id == user_uuid,
            SoloSession.session_id == business_session_id,
        )
    )
    if existing is not None:
        out = _solo_session_out(existing)
        logger.info(
            "solo_multipart_init_idempotent_hit",
            extra={"session_id": str(business_session_id)},
        )
        return SoloMultipartInitOut(
            sessionId=out.sessionId,
            reps=out.reps,
            videoUrl=out.videoUrl,
            uploadId=None,
            objectKey=None,
            multipartRecommendedPartBytes=RECOMMENDED_SOLO_MULTIPART_CHUNK_BYTES,
            multipartMaxConcurrency=DEFAULT_SOLO_MULTIPART_CONCURRENCY,
        )

    if not get_aws_s3_bucket():
        raise _s3_bucket_config_error()

    try:
        object_key, upload_id = multipart_create_solo_video(
            user_id=user_uuid,
            session_id=business_session_id,
            content_type=payload.contentType,
        )
    except ValueError as e:
        msg = str(e)
        if "AWS_S3_BUCKET" in msg or "not set" in msg.lower():
            raise _s3_bucket_config_error() from e
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg) from e

    logger.info(
        "solo_multipart_init",
        extra={
            "session_id": str(business_session_id),
            "upload_id_tail": upload_id[-8:] if upload_id else "",
            "video_bytes": payload.videoSizeBytes,
        },
    )
    return SoloMultipartInitOut(
        sessionId=str(business_session_id),
        reps=payload.reps,
        videoUrl=None,
        uploadId=upload_id,
        objectKey=object_key,
        multipartRecommendedPartBytes=RECOMMENDED_SOLO_MULTIPART_CHUNK_BYTES,
        multipartMaxConcurrency=DEFAULT_SOLO_MULTIPART_CONCURRENCY,
    )


@router.post("/session/multipart/presign-parts", response_model=SoloMultipartPresignPartsOut)
def solo_multipart_presign_parts(
    payload: SoloMultipartPresignPartsIn,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloMultipartPresignPartsOut:
    """Issue presigned S3 PUT URLs for ``upload_part`` (browser uploads part bodies directly)."""
    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    sid = _solo_parse_session_uuid(payload.sessionId)
    expected_key = solo_session_video_key(user_uuid, sid)
    if not get_aws_s3_bucket():
        raise _s3_bucket_config_error()

    seen: set[int] = set()
    out_urls: dict[str, str] = {}
    try:
        multipart_assert_upload_alive(object_key=expected_key, upload_id=payload.uploadId)
        for pn in payload.partNumbers:
            if pn in seen:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate partNumbers entry: {pn}",
                )
            seen.add(pn)
            if pn < 1 or pn > 10000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid partNumber: {pn}",
                )
            url = multipart_presigned_part_url(
                object_key=expected_key,
                upload_id=payload.uploadId,
                part_number=pn,
                expires_seconds=3600,
            )
            out_urls[str(pn)] = url
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    return SoloMultipartPresignPartsOut(urls=out_urls)


@router.post("/session/multipart/complete", status_code=status.HTTP_204_NO_CONTENT)
async def solo_multipart_complete(
    payload: SoloMultipartCompleteIn,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> None:
    """Assemble multipart parts via S3; client then calls ``complete-upload`` to persist the DB row."""
    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    sid = _solo_parse_session_uuid(payload.sessionId)
    expected_key = solo_session_video_key(user_uuid, sid)
    if not get_aws_s3_bucket():
        raise _s3_bucket_config_error()

    try:
        parts = await asyncio.to_thread(
            multipart_list_parts,
            object_key=expected_key,
            upload_id=payload.uploadId,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if not parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded parts found for multipart upload.",
        )

    try:
        await asyncio.to_thread(
            multipart_complete,
            object_key=expected_key,
            upload_id=payload.uploadId,
            parts=parts,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/session/multipart/abort", status_code=status.HTTP_204_NO_CONTENT)
async def solo_multipart_abort(
    payload: SoloMultipartAbortIn,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> None:
    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    sid = _solo_parse_session_uuid(payload.sessionId)
    expected_key = solo_session_video_key(user_uuid, sid)
    await asyncio.to_thread(
        multipart_abort,
        object_key=expected_key,
        upload_id=payload.uploadId,
    )


@router.post("/session/complete-upload", response_model=SoloSessionOut)
async def complete_solo_session_upload(
    payload: SoloSessionCompleteUploadIn,
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> SoloSessionOut:
    """
    Finalize a solo session after optional direct-to-S3 upload or multipart finalize.
    When ``contentType`` is set, verifies the object exists via ``HeadObject`` before inserting the row.
    """
    max_reps = get_solo_max_reps()
    if payload.reps < 1 or payload.reps > max_reps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reps must be between 1 and {max_reps}.",
        )

    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    try:
        business_session_id = uuid.UUID(str(payload.sessionId).strip())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id: expected a UUID.",
        ) from e

    existing = db.scalar(
        select(SoloSession).where(
            SoloSession.user_id == user_uuid,
            SoloSession.session_id == business_session_id,
        )
    )
    if existing is not None:
        logger.info(
            "solo_session_complete_idempotent_hit",
            extra={
                "session_id": str(business_session_id),
                "user_id": str(user_uuid),
            },
        )
        return _solo_session_out(existing)

    ct_raw = (payload.contentType or "").strip()
    has_video = bool(ct_raw)
    video_key: str | None = None

    if has_video:
        if not get_aws_s3_bucket():
            raise _s3_bucket_config_error()
        key = solo_session_video_key(user_uuid, business_session_id)
        t_head = time.perf_counter()
        try:
            meta = await asyncio.to_thread(head_solo_video, key)
        except Exception:
            logger.exception(
                "solo_session_head_failed",
                extra={"session_id": str(business_session_id), "key": key},
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not verify upload in storage.",
            ) from None

        if meta is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recording not found in storage. The upload may have failed.",
            )

        max_bytes = get_solo_max_video_bytes()
        size = int(meta.get("ContentLength") or 0)
        if size <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recording upload was empty.",
            )
        if size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video file exceeds maximum size ({max_bytes} bytes).",
            )

        logger.info(
            "solo_session_s3_head_ok",
            extra={
                "session_id": str(business_session_id),
                "head_ms": int((time.perf_counter() - t_head) * 1000),
                "video_bytes": size,
            },
        )
        video_key = key

    ttl_hours = get_video_ttl_hours()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
    row_pk = uuid.uuid4()

    row = SoloSession(
        id=row_pk,
        user_id=user_uuid,
        session_id=business_session_id,
        reps=payload.reps,
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
            "reps": payload.reps,
            "has_video": bool(video_key),
        },
    )

    return _solo_session_out(row)
