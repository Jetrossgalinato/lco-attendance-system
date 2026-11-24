"""members and attendance records

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-24 23:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    attendance_type = postgresql.ENUM(
        "time_in", "time_out", name="attendance_type", create_type=False
    )
    attendance_status = postgresql.ENUM(
        "present", "late", name="attendance_status", create_type=False
    )
    postgresql.ENUM(
        "time_in", "time_out", name="attendance_type"
    ).create(op.get_bind(), checkfirst=True)
    postgresql.ENUM(
        "present", "late", name="attendance_status"
    ).create(op.get_bind(), checkfirst=True)

    op.create_table(
        "members",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=120), nullable=False),
        sa.Column("college", sa.String(length=64), nullable=False),
        sa.Column("organization", sa.String(length=120), nullable=False),
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

    op.create_table(
        "attendance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_id", sa.String(length=32), nullable=False),
        sa.Column("type", attendance_type, nullable=False),
        sa.Column("status", attendance_status, nullable=False),
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
        "ix_attendance_records_member_type",
        "attendance_records",
        ["member_id", "type"],
    )
    op.create_index(
        "ix_attendance_records_scanned_at",
        "attendance_records",
        ["scanned_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_attendance_records_scanned_at", table_name="attendance_records"
    )
    op.drop_index(
        "ix_attendance_records_member_type", table_name="attendance_records"
    )
    op.drop_table("attendance_records")
    op.drop_table("members")
    postgresql.ENUM(name="attendance_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="attendance_type").drop(op.get_bind(), checkfirst=True)
