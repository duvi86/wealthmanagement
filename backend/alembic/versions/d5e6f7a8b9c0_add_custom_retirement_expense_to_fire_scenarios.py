"""add custom retirement expense fields to fire scenarios

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-05-25
"""

from alembic import op
import sqlalchemy as sa


revision = "d5e6f7a8b9c0"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("wealth_fire_scenarios") as batch_op:
        batch_op.add_column(
            sa.Column("use_custom_retirement_expense", sa.Boolean(), nullable=False, server_default=sa.text("0"))
        )
        batch_op.add_column(
            sa.Column("retirement_annual_expense_eur", sa.Float(), nullable=False, server_default=sa.text("0.0"))
        )

    # Keep existing scenarios behavior unchanged and provide sensible prefill when toggled on later.
    op.execute(
        """
        UPDATE wealth_fire_scenarios
        SET retirement_annual_expense_eur = annual_expenses_eur
        """
    )


def downgrade() -> None:
    with op.batch_alter_table("wealth_fire_scenarios") as batch_op:
        batch_op.drop_column("retirement_annual_expense_eur")
        batch_op.drop_column("use_custom_retirement_expense")
