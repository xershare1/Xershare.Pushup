"""Domain errors for challenge flows."""


class IdempotencyGiftMismatchError(ValueError):
    """Idempotency-Key matches a stored challenge but ``coverOpponentEntry`` (gift) differs."""


__all__ = ("IdempotencyGiftMismatchError",)
