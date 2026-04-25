"""add expected return pct to wealth accounts

Revision ID: 95c5e26b9f6a
Revises: 3a036e0f855f
Create Date: 2026-04-19 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "95c5e26b9f6a"
down_revision = "3a036e0f855f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "wealth_accounts",
        sa.Column("expected_return_pct", sa.Float(), nullable=False, server_default="0.0"),
    )


def downgrade() -> None:
    op.drop_column("wealth_accounts", "expected_return_pct")
