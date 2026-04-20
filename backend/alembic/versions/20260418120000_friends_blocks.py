"""friend_invitations, friendships, user_challenge_blocks."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260418120000"
down_revision = "20260401120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "friend_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inviter_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invitee_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "inviter_user_id <> invitee_user_id",
            name="ck_friend_invitations_distinct_users",
        ),
        sa.ForeignKeyConstraint(["invitee_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["inviter_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_friend_invitations_invitee_user_id",
        "friend_invitations",
        ["invitee_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_friend_invitations_inviter_user_id",
        "friend_invitations",
        ["inviter_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_friend_invitations_status",
        "friend_invitations",
        ["status"],
        unique=False,
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_friend_invitations_pending_pair
        ON friend_invitations (inviter_user_id, invitee_user_id)
        WHERE status = 'pending';
        """
    )

    op.create_table(
        "friendships",
        sa.Column("user_low_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_high_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "user_low_id < user_high_id",
            name="ck_friendships_ordered_pair",
        ),
        sa.ForeignKeyConstraint(["user_high_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_low_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_low_id", "user_high_id"),
    )

    op.create_table(
        "user_challenge_blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blocker_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blocked_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "blocker_user_id <> blocked_user_id",
            name="ck_user_challenge_blocks_distinct",
        ),
        sa.ForeignKeyConstraint(["blocked_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocker_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "blocker_user_id",
            "blocked_user_id",
            name="uq_user_challenge_blocks_pair",
        ),
    )
    op.create_index(
        "ix_user_challenge_blocks_blocked_user_id",
        "user_challenge_blocks",
        ["blocked_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_user_challenge_blocks_blocker_user_id",
        "user_challenge_blocks",
        ["blocker_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_challenge_blocks_blocker_user_id", table_name="user_challenge_blocks")
    op.drop_index("ix_user_challenge_blocks_blocked_user_id", table_name="user_challenge_blocks")
    op.drop_table("user_challenge_blocks")
    op.drop_table("friendships")
    op.execute("DROP INDEX IF EXISTS uq_friend_invitations_pending_pair")
    op.drop_index("ix_friend_invitations_status", table_name="friend_invitations")
    op.drop_index("ix_friend_invitations_inviter_user_id", table_name="friend_invitations")
    op.drop_index("ix_friend_invitations_invitee_user_id", table_name="friend_invitations")
    op.drop_table("friend_invitations")
