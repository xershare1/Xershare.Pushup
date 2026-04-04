"""Resend API wrapper — failures are logged; callers must not rely on return for HTTP success."""

from __future__ import annotations

import logging
from typing import Any

import resend

from app.config import get_email_from, get_resend_api_key, is_email_enabled

logger = logging.getLogger(__name__)


def send_html_email(*, to: list[str], subject: str, html: str) -> str | None:
    """Returns provider message id when available."""
    if not is_email_enabled():
        logger.info("email skipped: EMAIL_ENABLED is false")
        return None
    recipients = [e.strip() for e in to if e and str(e).strip()]
    if not recipients:
        logger.info("email skipped: no recipients")
        return None
    key = get_resend_api_key()
    if not key:
        logger.warning("email skipped: RESEND_API_KEY is not set")
        return None
    resend.api_key = key
    try:
        result: Any = resend.Emails.send(
            {
                "from": get_email_from(),
                "to": recipients,
                "subject": subject,
                "html": html,
            }
        )
        mid = None
        if isinstance(result, dict):
            mid = result.get("id")
        logger.info("email sent subject=%s to=%s id=%s", subject, recipients, mid)
        return str(mid) if mid else None
    except Exception:
        logger.exception("Resend send failed subject=%s", subject)
        return None
