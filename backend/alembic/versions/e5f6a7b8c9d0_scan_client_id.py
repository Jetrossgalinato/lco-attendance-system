"""scan client_id for offline idempotency

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-11-26 10:05:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "attendance_records",
        sa.Column("client_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "uq_attendance_records_client_id",
        "attendance_records",
        ["client_id"],
        unique=True,
    )

    op.add_column(
        "borrow_records",
        sa.Column("client_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "uq_borrow_records_client_id",
        "borrow_records",
        ["client_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_borrow_records_client_id", table_name="borrow_records")
    op.drop_column("borrow_records", "client_id")
    op.drop_index(
        "uq_attendance_records_client_id", table_name="attendance_records"
    )
    op.drop_column("attendance_records", "client_id")
