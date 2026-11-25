from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    department: Mapped[str] = mapped_column(String(120))
    college: Mapped[str] = mapped_column(String(64))
    organization: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="member",
        cascade="all, delete-orphan",
    )
    borrow_records = relationship(
        "BorrowRecord",
        back_populates="member",
        cascade="all, delete-orphan",
    )
