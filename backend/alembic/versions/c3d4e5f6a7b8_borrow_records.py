"""borrow records

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-11-25 13:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    postgresql.ENUM("borrow", "return", name="borrow_type").create(
        op.get_bind(), checkfirst=True
    )
    postgresql.ENUM("out", "returned", name="borrow_status").create(
        op.get_bind(), checkfirst=True
    )

    borrow_type = postgresql.ENUM(
        "borrow", "return", name="borrow_type", create_type=False
    )
    borrow_status = postgresql.ENUM(
        "out", "returned", name="borrow_status", create_type=False
    )

    op.create_table(
        "borrow_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_id", sa.String(length=32), nullable=False),
        sa.Column("type", borrow_type, nullable=False),
        sa.Column("status", borrow_status, nullable=False),
        sa.Column(
            "scanned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_borrow_records_member_scanned_at",
        "borrow_records",
        ["member_id", "scanned_at"],
        unique=False,
    )
    op.create_index(
        "ix_borrow_records_scanned_at",
        "borrow_records",
        ["scanned_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_borrow_records_scanned_at", table_name="borrow_records")
    op.drop_index(
        "ix_borrow_records_member_scanned_at", table_name="borrow_records"
    )
    op.drop_table("borrow_records")
    postgresql.ENUM(name="borrow_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="borrow_type").drop(op.get_bind(), checkfirst=True)
