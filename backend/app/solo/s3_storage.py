"""S3 upload, delete, and presigned URLs for solo session videos."""

from __future__ import annotations

import logging
import uuid

from app.config import get_aws_region, get_aws_s3_bucket, get_video_ttl_hours

logger = logging.getLogger(__name__)

_ALLOWED_VIDEO_TYPES = frozenset(
    {
        "video/mp4",
        "video/quicktime",
        "video/webm",
        "application/octet-stream",
    }
)


def _client():
    import boto3

    return boto3.client("s3", region_name=get_aws_region())


def upload_solo_video(
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    body: bytes,
    content_type: str | None,
) -> str:
    """Upload bytes to S3. Returns object key ``solo/{user_id}/{session_id}.mp4``."""
    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    key = f"solo/{user_id}/{session_id}.mp4"
    ct = (content_type or "video/mp4").split(";")[0].strip().lower()
    if ct not in _ALLOWED_VIDEO_TYPES:
        raise ValueError(f"Unsupported video content type: {content_type!r}")
    _client().put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType=ct if ct != "application/octet-stream" else "video/mp4",
    )
    return key


def upload_challenge_attempt_video(
    *,
    challenge_id: str,
    clerk_user_id: str,
    role: str,
    body: bytes,
    content_type: str | None,
) -> str:
    """Upload bytes to S3. Returns ``challenge/{challenge_id}/{clerk_user_id}/{role}.mp4``."""
    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    safe_challenge = (challenge_id or "").strip().replace("/", "_")[:40]
    safe_clerk = "".join(c if c.isalnum() or c in "-_" else "_" for c in (clerk_user_id or ""))[:128]
    safe_role = "challenger" if role == "challenger" else "opponent"
    ct_lower = (content_type or "").lower()
    ext = "webm" if "webm" in ct_lower else "mp4"
    key = f"challenge/{safe_challenge}/{safe_clerk}/{safe_role}.{ext}"
    ct = (content_type or "video/mp4").split(";")[0].strip().lower()
    if ct not in _ALLOWED_VIDEO_TYPES:
        raise ValueError(f"Unsupported video content type: {content_type!r}")
    _client().put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType=ct if ct != "application/octet-stream" else "video/mp4",
    )
    return key


def delete_s3_object(key: str) -> None:
    bucket = get_aws_s3_bucket()
    if not bucket or not key:
        return
    try:
        _client().delete_object(Bucket=bucket, Key=key)
    except Exception:
        logger.exception("S3 delete_object failed key=%s", key)


def presigned_video_url(s3_key: str, *, expires_seconds: int) -> str:
    bucket = get_aws_s3_bucket()
    if not bucket or not s3_key:
        return ""
    ttl = max(60, min(expires_seconds, int(get_video_ttl_hours() * 3600 * 2)))
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": s3_key},
        ExpiresIn=ttl,
    )
