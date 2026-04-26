"""add ownership_split to wealth_accounts

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-26
"""

from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("wealth_accounts") as batch_op:
        batch_op.add_column(sa.Column("ownership_split", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("wealth_accounts") as batch_op:
        batch_op.drop_column("ownership_split")
