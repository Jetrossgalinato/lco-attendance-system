"""calculators inventory + borrow calculator_id

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-11-25 14:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calculators",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Existing borrow rows have no calculator_id; clear them for a clean NOT NULL FK.
    op.execute(sa.text("DELETE FROM borrow_records"))

    op.add_column(
        "borrow_records",
        sa.Column("calculator_id", sa.String(length=32), nullable=False),
    )
    op.create_foreign_key(
        "fk_borrow_records_calculator_id",
        "borrow_records",
        "calculators",
        ["calculator_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_borrow_records_calculator_scanned_at",
        "borrow_records",
        ["calculator_id", "scanned_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_borrow_records_calculator_scanned_at",
        table_name="borrow_records",
    )
    op.drop_constraint(
        "fk_borrow_records_calculator_id",
        "borrow_records",
        type_="foreignkey",
    )
    op.drop_column("borrow_records", "calculator_id")
    op.drop_table("calculators")
