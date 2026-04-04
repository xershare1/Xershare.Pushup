"""Future: email_suppressions table. Stub returns False (not suppressed)."""


def is_suppressed(email: str) -> bool:
    # TODO: query email_suppressions when DB exists
    _ = email
    return False
