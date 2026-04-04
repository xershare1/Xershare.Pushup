"""Background-task-safe notification entrypoints (sync). Emails only to Clerk-verified addresses."""

from __future__ import annotations

from typing import Literal

from app.challenges.logic import lifecycle, outcome_from
from app.challenges.repository import repo
from app.clerk.backend_client import (
    challenge_notifications_enabled,
    fetch_clerk_user,
    primary_email,
)
from app.config import get_frontend_url
from app.email.resend_service import send_html_email
from app.notifications import html_templates as T
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
    send_html_email(
        to=[email],
        subject="You have been challenged on Pushup Pros",
        html=html,
    )


def notify_attempt_submitted(
    challenge_id: str,
    submitter_role: Literal["challenger", "opponent"],
) -> None:
    rec = repo.get(challenge_id)
    if not rec:
        return
    if submitter_role == "challenger":
        clerk_id = rec.opponent_clerk_user_id
        actor = rec.challenger_name
        count = rec.challenger_pushups
        role_label = "challenger"
    else:
        clerk_id = rec.challenger_clerk_user_id
        actor = rec.opponent_name
        count = rec.opponent_pushups
        role_label = "opponent"
    if count is None:
        return
    email = _recipient_email_for_clerk_user(clerk_id)
    if not email:
        return
    html = T.attempt_submitted_html(
        actor_name=actor,
        pushups=count,
        challenge_url=_challenge_url(challenge_id),
        role_label=role_label,
    )
    send_html_email(
        to=[email],
        subject=f"{actor} logged push-ups on Pushup Pros",
        html=html,
    )


def notify_result_ready(challenge_id: str) -> None:
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
    send_html_email(
        to=recipients,
        subject="Challenge result — Pushup Pros",
        html=html,
    )
