"""Background-task-safe notification entrypoints (sync). Emails only to Clerk-verified addresses."""

from __future__ import annotations

from app.challenges.logic import lifecycle, outcome_from
from app.challenges.repo_access import challenge_repo_context
from app.clerk.backend_client import (
    challenge_notifications_enabled,
    fetch_clerk_user,
    primary_email,
)
from app.config import get_database_url, get_frontend_url, is_email_enabled
from app.email.resend_service import send_html_email
from app.notifications import html_templates as T
from app.notifications.notification_log import log_email_notification
from app.notifications.suppression import is_suppressed


def _challenge_url(challenge_id: str) -> str:
    return f"{get_frontend_url()}/c/{challenge_id}"


def _result_url(challenge_id: str) -> str:
    return f"{get_frontend_url()}/c/{challenge_id}/result"


def _recipient_email_for_clerk_user(user_id: str | None) -> str | None:
    if not user_id:
        return None
    user = fetch_clerk_user(user_id)
    if not user:
        return None
    if not challenge_notifications_enabled(user):
        return None
    em = primary_email(user)
    if not em or is_suppressed(em):
        return None
    return em


def notify_challenge_created(challenge_id: str) -> None:
    with challenge_repo_context() as repo:
        rec = repo.get(challenge_id)
    if not rec or not rec.opponent_clerk_user_id:
        return
    email = _recipient_email_for_clerk_user(rec.opponent_clerk_user_id)
    if not email:
        return
    html = T.challenge_created_html(
        challenger_name=rec.challenger_name,
        opponent_name=rec.opponent_name,
        challenge_url=_challenge_url(challenge_id),
        message=rec.message,
    )
    subject = "You have been challenged on Pushup Pros"
    mid = send_html_email(to=[email], subject=subject, html=html)
    if get_database_url() and is_email_enabled():
        log_email_notification(
            type_="challenge_created",
            recipient_email=email,
            subject=subject,
            challenge_id=challenge_id,
            provider_message_id=mid,
            error=None if mid else "no provider id",
        )


def notify_result_ready(challenge_id: str) -> None:
    with challenge_repo_context() as repo:
        rec = repo.get(challenge_id)
    if not rec or lifecycle(rec) != "complete":
        return
    a, b, winner = outcome_from(rec)
    if winner == "tie":
        summary = "It is a tie."
    elif winner == "challenger":
        summary = f"{rec.challenger_name} wins."
    else:
        summary = f"{rec.opponent_name} wins."

    html = T.result_ready_html(
        challenger_name=rec.challenger_name,
        opponent_name=rec.opponent_name,
        challenger_pushups=a,
        opponent_pushups=b,
        summary=summary,
        challenge_url=_result_url(challenge_id),
    )
    recipients: list[str] = []
    for uid in (rec.challenger_clerk_user_id, rec.opponent_clerk_user_id):
        em = _recipient_email_for_clerk_user(uid)
        if em and em not in recipients:
            recipients.append(em)
    if not recipients:
        return
    subject = "Challenge result — Pushup Pros"
    mid = send_html_email(to=recipients, subject=subject, html=html)
    if get_database_url() and is_email_enabled():
        log_email_notification(
            type_="result_ready",
            recipient_email=",".join(recipients),
            subject=subject,
            challenge_id=challenge_id,
            provider_message_id=mid,
            error=None if mid else "no provider id",
        )
