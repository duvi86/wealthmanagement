"""add co_owner to wealth accounts

Revision ID: e1f2a3b4c5d6
Revises: c4b8a2f1d6e7
Create Date: 2026-04-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e1f2a3b4c5d6"
down_revision = "c4b8a2f1d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "wealth_accounts",
        sa.Column("co_owner_name", sa.String(), nullable=True),
    )
    op.add_column(
        "wealth_accounts",
        sa.Column("co_owner_id", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("wealth_accounts", "co_owner_id")
    op.drop_column("wealth_accounts", "co_owner_name")
