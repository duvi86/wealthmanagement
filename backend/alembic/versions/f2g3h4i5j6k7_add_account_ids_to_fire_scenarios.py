"""add account_ids to fire scenarios

Revision ID: f2g3h4i5j6k7
Revises: e1f2a3b4c5d6
Create Date: 2026-04-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f2g3h4i5j6k7"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "wealth_fire_scenarios",
        sa.Column("account_ids", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("wealth_fire_scenarios", "account_ids")
