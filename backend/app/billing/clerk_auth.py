"""Verify Clerk session JWT from Authorization: Bearer and return Clerk user id (`sub`)."""

from __future__ import annotations

import logging

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import get_clerk_jwt_issuer, get_clerk_jwks_url

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)
_jwks_client: PyJWKClient | None = None


def _jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(get_clerk_jwks_url())
    return _jwks_client


def clerk_user_id_from_token(token: str) -> str:
    try:
        signing_key = _jwks().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=get_clerk_jwt_issuer(),
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as e:
        logger.warning("Clerk JWT verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from e
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token",
        )
    return sub


async def require_clerk_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if creds is None or (creds.scheme or "").lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
        )
    return clerk_user_id_from_token(creds.credentials)
