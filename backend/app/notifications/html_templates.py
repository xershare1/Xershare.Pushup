"""Minimal HTML emails aligned with Pushup Pros tokens (dark surface, orange CTA)."""

from __future__ import annotations

_BG = "#0d0f12"
_SURFACE = "#161a20"
_BORDER = "#2a3140"
_TEXT = "#e8eaed"
_MUTED = "#9aa3af"
_ACCENT = "#ff6b35"
_ACCENT_INK = "#0d0f12"


def wrap_email(inner_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:{_BG};font-family:'Segoe UI',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:{_BG};padding:24px 12px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:{_SURFACE};border:1px solid {_BORDER};
border-radius:12px;padding:28px 24px;text-align:left;">
<tr><td style="color:{_TEXT};font-size:15px;line-height:1.55;">
{inner_html}
</td></tr>
</table>
<p style="color:{_MUTED};font-size:12px;margin-top:16px;">Pushup Pros — social pushup challenges</p>
</td></tr></table>
</body></html>"""


def button_href(label: str, url: str) -> str:
    return (
        f'<a href="{url}" style="display:inline-block;background:{_ACCENT};color:{_ACCENT_INK};'
        f'text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">{label}</a>'
    )


def challenge_created_html(
    *,
    challenger_name: str,
    opponent_name: str,
    challenge_url: str,
    message: str | None,
) -> str:
    msg = (
        f'<p style="color:{_MUTED};margin:12px 0 0;">Message: {message}</p>'
        if message
        else ""
    )
    inner = f"""
<p style="margin:0 0 12px;font-size:18px;font-weight:600;">You have been challenged</p>
<p style="margin:0;"><strong>{challenger_name}</strong> challenged <strong>{opponent_name}</strong> to a push-up battle on Pushup Pros.</p>
{msg}
<p style="margin:20px 0 0;">{button_href("Open challenge", challenge_url)}</p>
"""
    return wrap_email(inner)


def attempt_submitted_html(
    *,
    actor_name: str,
    pushups: int,
    challenge_url: str,
    role_label: str,
) -> str:
    inner = f"""
<p style="margin:0 0 12px;font-size:18px;font-weight:600;">Your opponent logged reps</p>
<p style="margin:0;"><strong>{actor_name}</strong> ({role_label}) logged <strong>{pushups}</strong> push-ups.</p>
<p style="margin:20px 0 0;">{button_href("View challenge", challenge_url)}</p>
"""
    return wrap_email(inner)


def result_ready_html(
    *,
    challenger_name: str,
    opponent_name: str,
    challenger_pushups: int,
    opponent_pushups: int,
    summary: str,
    challenge_url: str,
) -> str:
    inner = f"""
<p style="margin:0 0 12px;font-size:18px;font-weight:600;">Challenge result</p>
<p style="margin:0 0 8px;">{challenger_name}: <strong>{challenger_pushups}</strong> &nbsp;·&nbsp; {opponent_name}: <strong>{opponent_pushups}</strong></p>
<p style="margin:0 0 16px;color:{_MUTED};">{summary}</p>
<p style="margin:0;">{button_href("See results", challenge_url)}</p>
"""
    return wrap_email(inner)
