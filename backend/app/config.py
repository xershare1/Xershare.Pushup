"""Environment-backed settings for billing and Clerk JWT verification."""

from __future__ import annotations

import os
from functools import lru_cache


def _env(name: str, default: str | None = None) -> str | None:
    raw = os.environ.get(name)
    if raw is None or not str(raw).strip():
        return default
    return str(raw).strip()


@lru_cache
def get_frontend_url() -> str:
    url = _env("FRONTEND_URL", "http://localhost:5174")
    assert url is not None
    return url.rstrip("/")


@lru_cache
def get_cors_allow_origins() -> tuple[str, ...]:
    """
    Origins allowed by CORSMiddleware. Includes localhost ↔ 127.0.0.1 swap for
    local dev: the browser treats them as different origins, but Vite is often
    opened as either hostname.
    """
    from urllib.parse import urlparse

    base = get_frontend_url()
    out: list[str] = [base]
    try:
        u = urlparse(base)
        host = (u.hostname or "").lower()
        if host == "localhost":
            alt = base.replace("://localhost", "://127.0.0.1", 1)
            if alt not in out:
                out.append(alt)
        elif host == "127.0.0.1":
            alt = base.replace("://127.0.0.1", "://localhost", 1)
            if alt not in out:
                out.append(alt)
    except Exception:
        pass
    extra = _env("CORS_EXTRA_ORIGINS")
    if extra:
        for part in extra.split(","):
            p = part.strip().rstrip("/")
            if p and p not in out:
                out.append(p)
    return tuple(out)


@lru_cache
def get_stripe_webhook_secret() -> str:
    s = _env("STRIPE_WEBHOOK_SECRET")
    if not s:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is not set")
    return s


def get_stripe_secret_key() -> str:
    s = _env("STRIPE_SECRET_KEY")
    if not s:
        raise RuntimeError("STRIPE_SECRET_KEY is not set")
    return s


def get_clerk_jwks_url() -> str:
    s = _env("CLERK_JWKS_URL")
    if not s:
        raise RuntimeError("CLERK_JWKS_URL is not set (Clerk Dashboard → API keys → JWKS URL)")
    return s


def get_clerk_jwt_issuer() -> str:
    s = _env("CLERK_JWT_ISSUER")
    if not s:
        raise RuntimeError(
            "CLERK_JWT_ISSUER is not set (JWT issuer URL from Clerk, must match session token `iss`)"
        )
    return s


def get_clerk_jwt_leeway_seconds() -> int:
    """
    PyJWT ``leeway`` for ``iat`` / ``nbf`` / ``exp`` (clock skew vs Clerk).
    Optional env ``CLERK_JWT_LEEWAY_SECONDS``; default 60; clamped 0..300.
    """
    raw = _env("CLERK_JWT_LEEWAY_SECONDS", "60") or "60"
    try:
        n = int(raw)
    except ValueError:
        n = 60
    return max(0, min(n, 300))


def get_clerk_secret_key() -> str | None:
    """Clerk Backend API (Bearer). Required for user lookup and public_metadata updates."""
    return _env("CLERK_SECRET_KEY")


def get_clerk_webhook_secret() -> str | None:
    """Svix signing secret for Clerk webhooks (Dashboard → Webhooks → Signing Secret)."""
    return _env("CLERK_WEBHOOK_SECRET")


def is_email_enabled() -> bool:
    """When false, notification code logs and skips Resend (local dev without API key)."""
    return _env("EMAIL_ENABLED", "true").lower() not in ("0", "false", "no")


def get_resend_api_key() -> str | None:
    return _env("RESEND_API_KEY")


def get_email_from() -> str:
    # Resend test sender works without a verified domain; swap in production.
    return _env("EMAIL_FROM", "Pushup Pros <onboarding@resend.dev>")


@lru_cache
def get_database_url() -> str | None:
    """Async/sync SQLAlchemy URL when persisting to Postgres (see Alembic env)."""
    return _env("DATABASE_URL")


def get_challenge_rate_limit_daily() -> int:
    """Max challenges created per Clerk user per day when DATABASE_URL is set."""
    raw = _env("CHALLENGE_RATE_LIMIT_DAILY", "100")
    try:
        return max(1, int(raw or "100"))
    except (TypeError, ValueError):
        return 100


def get_challenge_max_pushups() -> int:
    """Upper bound per attempt (validation). Default 500."""
    raw = _env("CHALLENGE_MAX_PUSHUPS", "500")
    try:
        return max(1, min(100_000, int(raw or "500")))
    except (TypeError, ValueError):
        return 500


def get_challenge_expiry_hours() -> int:
    """Hours until an incomplete challenge expires. Default 168 (7 days)."""
    raw = _env("CHALLENGE_EXPIRY_HOURS", "168")
    try:
        return max(1, min(24 * 365, int(raw or "168")))
    except (TypeError, ValueError):
        return 168


def get_video_ttl_hours() -> int:
    """Solo session video + row retention (TTL). Default 24 hours."""
    raw = _env("VIDEO_TTL_HOURS", "24")
    try:
        return max(1, min(24 * 90, int(raw or "24")))
    except (TypeError, ValueError):
        return 24


def get_aws_s3_bucket() -> str | None:
    return _env("AWS_S3_BUCKET")


def get_aws_region() -> str:
    return _env("AWS_REGION", "us-east-1") or "us-east-1"


def get_solo_max_video_bytes() -> int:
    raw = _env("SOLO_MAX_VIDEO_BYTES", str(50 * 1024 * 1024))
    try:
        return max(1_000_000, min(500 * 1024 * 1024, int(raw or str(50 * 1024 * 1024))))
    except (TypeError, ValueError):
        return 50 * 1024 * 1024


def get_challenge_max_video_bytes() -> int:
    """Max upload size for challenge attempt video (submit only). Defaults to solo limit."""
    raw = _env("CHALLENGE_MAX_VIDEO_BYTES", "")
    if not (raw or "").strip():
        return get_solo_max_video_bytes()
    try:
        return max(1_000_000, min(500 * 1024 * 1024, int(raw)))
    except (TypeError, ValueError):
        return get_solo_max_video_bytes()


def get_solo_max_reps() -> int:
    """Upper bound for solo rep count (client-side counting). Default 1M."""
    raw = _env("SOLO_MAX_REPS", "1000000")
    try:
        return max(1, min(10_000_000, int(raw or "1000000")))
    except (TypeError, ValueError):
        return 1_000_000


def build_bundles() -> dict[str, dict[str, str | int]]:
    """Maps bundle_code → price_id, credits, display name. Omits bundles with missing price env."""
    rows: list[tuple[str, str, int, str]] = [
        ("starter", "STRIPE_PRICE_STARTER", 5, "Pushup Pro Starter Pack"),
        ("challenger", "STRIPE_PRICE_CHALLENGER", 15, "Pushup Pro Challenger Pack"),
        ("pro", "STRIPE_PRICE_PRO", 40, "Pushup Pro Pro Pack"),
    ]
    out: dict[str, dict[str, str | int]] = {}
    for code, env_key, credits, name in rows:
        price_id = _env(env_key)
        if price_id:
            out[code] = {"price_id": price_id, "credits": credits, "name": name}
    return out
