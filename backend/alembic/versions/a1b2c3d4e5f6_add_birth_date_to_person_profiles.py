"""add birth_date to person profiles

Revision ID: a1b2c3d4e5f6
Revises: 0a1b2c3d4e5f
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "0a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("wealth_person_profiles") as batch_op:
        batch_op.add_column(sa.Column("birth_date", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("wealth_person_profiles") as batch_op:
        batch_op.drop_column("birth_date")
