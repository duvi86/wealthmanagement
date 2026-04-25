"""add expected return pct to wealth portfolio lines

Revision ID: c4b8a2f1d6e7
Revises: 95c5e26b9f6a
Create Date: 2026-04-19 13:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c4b8a2f1d6e7"
down_revision = "95c5e26b9f6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "wealth_portfolio_lines",
        sa.Column("expected_return_pct", sa.Float(), nullable=False, server_default="0.0"),
    )


def downgrade() -> None:
    op.drop_column("wealth_portfolio_lines", "expected_return_pct")
