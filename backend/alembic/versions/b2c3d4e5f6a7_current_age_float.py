"""change current_age to float in person profiles

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("wealth_person_profiles") as batch_op:
        batch_op.alter_column("current_age", type_=sa.Float(), existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("wealth_person_profiles") as batch_op:
        batch_op.alter_column("current_age", type_=sa.Integer(), existing_type=sa.Float(), nullable=True)
