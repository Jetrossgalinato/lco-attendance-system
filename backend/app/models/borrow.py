import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BorrowType(str, enum.Enum):
    borrow = "borrow"
    return_ = "return"


class BorrowStatus(str, enum.Enum):
    out = "out"
    returned = "returned"


class BorrowRecord(Base):
    __tablename__ = "borrow_records"
    __table_args__ = (
        Index("ix_borrow_records_member_scanned_at", "member_id", "scanned_at"),
        Index("ix_borrow_records_scanned_at", "scanned_at"),
        Index(
            "ix_borrow_records_calculator_scanned_at",
            "calculator_id",
            "scanned_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    member_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("members.id", ondelete="CASCADE"),
        nullable=False,
    )
    calculator_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("calculators.id", ondelete="RESTRICT"),
        nullable=False,
    )
    type: Mapped[BorrowType] = mapped_column(
        Enum(
            BorrowType,
            name="borrow_type",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        )
    )
    status: Mapped[BorrowStatus] = mapped_column(
        Enum(BorrowStatus, name="borrow_status")
    )
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    client_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        unique=True,
    )

    member = relationship("Member", back_populates="borrow_records")
    calculator = relationship("Calculator", back_populates="borrow_records")
