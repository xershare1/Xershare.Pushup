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
    url = _env("FRONTEND_URL", "http://localhost:5173")
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
