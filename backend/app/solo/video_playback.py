"""Video playback URLs: CloudFront signed GET when configured, else S3 presigned GET."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Callable
from urllib.parse import quote

from app.config import get_cloudfront_key_pair_id, get_cloudfront_private_key_pem, get_cloudfront_video_domain
from app.solo.s3_storage import presigned_video_url


@lru_cache
def _cf_sign_callable(pem_normalized: str) -> Callable[[bytes], bytes] | None:
    if not pem_normalized:
        return None

    try:
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        pk = serialization.load_pem_private_key(
            pem_normalized.encode("utf-8"),
            password=None,
            backend=default_backend(),
        )

        def _sign(blob: bytes) -> bytes:
            return pk.sign(blob, padding.PKCS1v15(), hashes.SHA1())

        return _sign
    except Exception:
        return None


def cloudfront_signed_video_url(base_path: str, *, expires_seconds: int) -> str | None:
    """
    Signed CloudFront GET URL for an S3 object key (no scheme on base_path).
    Returns None if CloudFront signer is misconfigured or base_path empty.
    """
    domain = get_cloudfront_video_domain()
    key_id = get_cloudfront_key_pair_id()
    signer_fn = _cf_sign_callable(get_cloudfront_private_key_pem() or "")
    if not domain or not key_id or not signer_fn or not base_path.strip():
        return None

    from botocore.signers import CloudFrontSigner

    # Encode each path segment safely (keys may contain no unsafe chars beyond solo/*/uuid...)
    escaped = quote(base_path.strip().lstrip("/"), safe="/~")
    url = f"https://{domain}/{escaped}"
    ttl = max(60, min(expires_seconds, 604800))

    cfs = CloudFrontSigner(key_id, signer_fn)

    try:
        exp = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        return cfs.generate_presigned_url(url, date_less_than=exp)
    except Exception:
        return None


def playback_url_for_video_key(s3_key: str, *, expires_seconds: int) -> str:
    """
    Prefer CloudFront signed URL for GET; fallback to legacy S3 presigned GET during migration.
    """
    trimmed = (s3_key or "").strip()
    if not trimmed:
        return ""

    cf = cloudfront_signed_video_url(trimmed, expires_seconds=expires_seconds)
    if cf:
        return cf

    return presigned_video_url(trimmed, expires_seconds=expires_seconds)
