from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.borrow import BorrowType
from app.models.calculator import Calculator
from app.models.member import Member
from app.schemas.sync import (
    DeskSnapshotOut,
    SnapshotCalculatorOut,
    SnapshotMemberOut,
    SnapshotOpenLoanOut,
)
from app.services.attendance import LOCAL_TZ
from app.services.borrows import _latest_by_member


def build_desk_snapshot(db: Session) -> DeskSnapshotOut:
    members = db.scalars(
        select(Member)
        .where(Member.is_active.is_(True))
        .order_by(Member.id)
    ).all()
    calculators = db.scalars(
        select(Calculator)
        .where(Calculator.is_active.is_(True))
        .order_by(Calculator.id)
    ).all()

    open_loans: list[SnapshotOpenLoanOut] = []
    for member_id, record in _latest_by_member(db).items():
        if record.type != BorrowType.borrow:
            continue
        open_loans.append(
            SnapshotOpenLoanOut(
                member_id=member_id,
                calculator_id=record.calculator_id,
                name=record.member.name,
            )
        )
    open_loans.sort(key=lambda row: row.member_id)

    return DeskSnapshotOut(
        generated_at=datetime.now(tz=LOCAL_TZ),
        members=[
            SnapshotMemberOut(
                id=member.id,
                name=member.name,
                department=member.department,
                college=member.college,
                organization=member.organization,
            )
            for member in members
        ],
        calculators=[
            SnapshotCalculatorOut(id=calc.id, label=calc.label)
            for calc in calculators
        ],
        open_loans=open_loans,
    )
