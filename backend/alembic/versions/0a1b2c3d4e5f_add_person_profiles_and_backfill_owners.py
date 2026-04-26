"""add person profiles and backfill owners

Revision ID: 0a1b2c3d4e5f
Revises: f2g3h4i5j6k7
Create Date: 2026-04-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0a1b2c3d4e5f"
down_revision = "f2g3h4i5j6k7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("wealth_person_profiles"):
        op.create_table(
            "wealth_person_profiles",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("owner_user_id", sa.String(), nullable=True),
            sa.Column("email", sa.String(), nullable=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("current_age", sa.Integer(), nullable=True),
            sa.Column("expected_lifetime", sa.Integer(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.String(), nullable=False),
            sa.Column("updated_at", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    # Backfill from legacy account ownership fields so existing owner/co-owner IDs remain valid.
    op.execute(
        """
        INSERT INTO wealth_person_profiles (id, owner_user_id, email, name, current_age, expected_lifetime, is_active, created_at, updated_at)
                SELECT owner_id, NULL, NULL, MIN(owner_name), NULL, NULL, 1, datetime('now'), datetime('now')
        FROM wealth_accounts
        WHERE owner_id IS NOT NULL
          AND owner_id <> ''
          AND owner_name IS NOT NULL
          AND owner_name <> ''
          AND owner_id NOT IN (SELECT id FROM wealth_person_profiles)
                GROUP BY owner_id
        """
    )

    op.execute(
        """
        INSERT INTO wealth_person_profiles (id, owner_user_id, email, name, current_age, expected_lifetime, is_active, created_at, updated_at)
                SELECT co_owner_id, NULL, NULL, MIN(co_owner_name), NULL, NULL, 1, datetime('now'), datetime('now')
        FROM wealth_accounts
        WHERE co_owner_id IS NOT NULL
          AND co_owner_id <> ''
          AND co_owner_name IS NOT NULL
          AND co_owner_name <> ''
          AND co_owner_id NOT IN (SELECT id FROM wealth_person_profiles)
                GROUP BY co_owner_id
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("wealth_person_profiles"):
        op.drop_table("wealth_person_profiles")
