"""ORM models — import all for Alembic metadata."""

from app.db.models.challenge import Challenge
from app.db.models.challenge_attempt import ChallengeAttempt
from app.db.models.challenge_invite import ChallengeInvite
from app.db.models.credit_account import CreditAccount
from app.db.models.credit_transaction import CreditTransaction
from app.db.models.email_suppression import EmailSuppression
from app.db.models.friend_invitation import FriendInvitation
from app.db.models.friendship import Friendship
from app.db.models.notification import Notification
from app.db.models.payment_transaction import PaymentTransaction
from app.db.models.rate_limit_counter import RateLimitCounter
from app.db.models.stripe_customer import StripeCustomer
from app.db.models.stripe_event import StripeEvent
from app.db.models.solo_session import SoloSession
from app.db.models.user import User
from app.db.models.user_challenge_block import UserChallengeBlock

__all__ = [
    "Challenge",
    "ChallengeAttempt",
    "ChallengeInvite",
    "CreditAccount",
    "CreditTransaction",
    "EmailSuppression",
    "FriendInvitation",
    "Friendship",
    "Notification",
    "PaymentTransaction",
    "RateLimitCounter",
    "StripeCustomer",
    "SoloSession",
    "StripeEvent",
    "User",
    "UserChallengeBlock",
]
