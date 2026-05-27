"""S3 upload, delete, and presigned URLs for solo session videos."""

from __future__ import annotations

import logging
import threading
import uuid
from typing import Any

from app.config import (
    get_aws_region,
    get_aws_s3_bucket,
    get_video_ttl_hours,
    solo_video_default_cache_control,
)

logger = logging.getLogger(__name__)

_s3_lock = threading.Lock()
_s3_client: Any = None

_ALLOWED_VIDEO_TYPES = frozenset(
    {
        "video/mp4",
        "video/quicktime",
        "video/webm",
        "application/octet-stream",
    }
)


def _client():
    """Singleton S3 client — avoids cold client construction per presign/head call."""
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    import boto3

    with _s3_lock:
        if _s3_client is None:
            _s3_client = boto3.client("s3", region_name=get_aws_region())
    return _s3_client


def solo_session_video_key(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
    """S3 key for a solo session recording (``.mp4`` suffix; may store WebM bytes)."""
    return f"solo/{user_id}/{session_id}.mp4"


def normalize_solo_video_content_type(content_type: str | None) -> str:
    ct = (content_type or "video/mp4").split(";")[0].strip().lower()
    if ct not in _ALLOWED_VIDEO_TYPES:
        raise ValueError(f"Unsupported video content type: {content_type!r}")
    return ct if ct != "application/octet-stream" else "video/mp4"


def presigned_put_solo_video_url(
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    content_type: str | None,
    expires_seconds: int = 3600,
) -> tuple[str, str, dict[str, str]]:
    """Return ``(object_key, presigned_put_url, headers)`` matching the signature (Content-Type + Cache-Control)."""
    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    key = solo_session_video_key(user_id, session_id)
    ct = normalize_solo_video_content_type(content_type)
    cache_ctl = solo_video_default_cache_control()
    ttl = max(300, min(int(expires_seconds), 86400))
    url = _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ContentType": ct,
            "CacheControl": cache_ctl,
        },
        ExpiresIn=ttl,
        HttpMethod="PUT",
    )
    return key, url, {"Content-Type": ct, "Cache-Control": cache_ctl}


def multipart_create_solo_video(
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    content_type: str | None,
) -> tuple[str, str]:
    """Returns ``(object_key, upload_id)``. Caller uses presigned ``upload_part`` from browser."""
    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    key = solo_session_video_key(user_id, session_id)
    ct = normalize_solo_video_content_type(content_type)
    cache_ctl = solo_video_default_cache_control()
    out = _client().create_multipart_upload(
        Bucket=bucket,
        Key=key,
        ContentType=ct,
        CacheControl=cache_ctl,
    )
    upload_id = out.get("UploadId") or ""
    if not upload_id:
        raise ValueError("create_multipart_upload did not return UploadId")
    return key, upload_id


def multipart_presigned_part_url(
    *,
    object_key: str,
    upload_id: str,
    part_number: int,
    expires_seconds: int = 3600,
) -> str:
    if part_number < 1 or part_number > 10000:
        raise ValueError("Invalid part_number")
    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    ttl = max(300, min(int(expires_seconds), 86400))
    return _client().generate_presigned_url(
        ClientMethod="upload_part",
        Params={
            "Bucket": bucket,
            "Key": object_key,
            "UploadId": upload_id,
            "PartNumber": part_number,
        },
        HttpMethod="PUT",
        ExpiresIn=ttl,
    )


def multipart_assert_upload_alive(*, object_key: str, upload_id: str) -> None:
    """Cheap check that UploadId exists for Key (does not iterate all parts)."""
    from botocore.exceptions import ClientError

    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    try:
        _client().list_parts(
            Bucket=bucket,
            Key=object_key,
            UploadId=upload_id,
            MaxParts=1,
        )
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("NoSuchUpload", "404"):
            raise ValueError(f"Multipart upload not found: {code}") from e
        raise


def multipart_list_parts(*, object_key: str, upload_id: str) -> list[dict]:
    """Minimal list for validation (caller may omit)."""
    from botocore.exceptions import ClientError

    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    cli = _client()
    paginator = cli.get_paginator("list_parts")
    parts: list[dict] = []
    try:
        for page in paginator.paginate(Bucket=bucket, Key=object_key, UploadId=upload_id):
            for p in page.get("Parts", []) or []:
                parts.append(
                    {
                        "PartNumber": int(p["PartNumber"]),
                        "ETag": str(p["ETag"]),
                    }
                )
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("NoSuchUpload", "404"):
            raise ValueError(f"Multipart upload not found: {code}") from e
        raise
    return sorted(parts, key=lambda x: x["PartNumber"])


def multipart_complete(
    *,
    object_key: str,
    upload_id: str,
    parts: list[dict],
) -> None:
    from botocore.exceptions import ClientError

    bucket = get_aws_s3_bucket()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not set")
    normalized: list[dict] = [{"ETag": str(p["ETag"]), "PartNumber": int(p["PartNumber"])} for p in parts]
    normalized.sort(key=lambda x: x["PartNumber"])
    try:
        _client().complete_multipart_upload(
            Bucket=bucket,
            Key=object_key,
            UploadId=upload_id,
            MultipartUpload={"Parts": normalized},
        )
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        msg = str(e)
        logger.warning(
            "complete_multipart_upload failed key=%s upload_id=%s code=%s",
            object_key,
            upload_id,
            code,
        )
        raise ValueError(f"S3 multipart complete failed: {code or msg}") from e


def multipart_abort(*, object_key: str, upload_id: str) -> None:
    bucket = get_aws_s3_bucket()
    if not bucket:
        return
    try:
        _client().abort_multipart_upload(Bucket=bucket, Key=object_key, UploadId=upload_id)
    except Exception:
        logger.warning("abort_multipart_upload failed key=%s", object_key)


def head_solo_video(key: str) -> dict | None:
    """Return S3 ``head_object`` response metadata, or ``None`` if the object is absent."""
    from botocore.exceptions import ClientError

    bucket = get_aws_s3_bucket()
    if not bucket or not key:
        return None
    try:
        return _client().head_object(Bucket=bucket, Key=key)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("404", "NotFound", "NoSuchKey"):
            return None
        raise


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
    key = solo_session_video_key(user_id, session_id)
    ct = normalize_solo_video_content_type(content_type)
    _client().put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType=ct,
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
