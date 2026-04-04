"""Resend API wrapper — failures are logged; callers must not rely on return for HTTP success."""

from __future__ import annotations

import logging

import resend

from app.config import get_email_from, get_resend_api_key, is_email_enabled

logger = logging.getLogger(__name__)


def send_html_email(*, to: list[str], subject: str, html: str) -> None:
    if not is_email_enabled():
        logger.info("email skipped: EMAIL_ENABLED is false")
        return
    recipients = [e.strip() for e in to if e and str(e).strip()]
    if not recipients:
        logger.info("email skipped: no recipients")
        return
    key = get_resend_api_key()
    if not key:
        logger.warning("email skipped: RESEND_API_KEY is not set")
        return
    resend.api_key = key
    try:
        resend.Emails.send(
            {
                "from": get_email_from(),
                "to": recipients,
                "subject": subject,
                "html": html,
            }
        )
        logger.info("email sent subject=%s to=%s", subject, recipients)
    except Exception:
        logger.exception("Resend send failed subject=%s", subject)
