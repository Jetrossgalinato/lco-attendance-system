from datetime import date, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.models.borrow import BorrowRecord, BorrowStatus, BorrowType
from app.models.calculator import Calculator
from app.models.member import Member
from app.schemas.borrow import (
    BorrowRankOut,
    BorrowRecordOut,
    BorrowStatusApi,
    BorrowSummaryOut,
    BorrowTypeApi,
    CurrentlyOutOut,
    LoanStatusApi,
)
from app.services.attendance import LOCAL_TZ, parse_day_bounds

COLLEGE_ORDER = ["CCIS", "COFES", "CED", "CMNS", "CEGS"]


class BorrowConflictError(Exception):
    pass


def api_type_to_db(value: BorrowTypeApi) -> BorrowType:
    return (
        BorrowType.borrow
        if value == BorrowTypeApi.borrow
        else BorrowType.return_
    )


def db_type_to_api(value: BorrowType) -> BorrowTypeApi:
    return (
        BorrowTypeApi.borrow
        if value == BorrowType.borrow
        else BorrowTypeApi.return_
    )


def db_status_to_api(value: BorrowStatus) -> BorrowStatusApi:
    return (
        BorrowStatusApi.out
        if value == BorrowStatus.out
        else BorrowStatusApi.returned
    )


def records_query(
    from_date: date | None = None,
    to_date: date | None = None,
) -> Select[tuple[BorrowRecord]]:
    stmt = select(BorrowRecord).options(joinedload(BorrowRecord.member))
    start, end = parse_day_bounds(from_date, to_date)
    if start is not None:
        stmt = stmt.where(BorrowRecord.scanned_at >= start)
    if end is not None:
        stmt = stmt.where(BorrowRecord.scanned_at < end)
    return stmt.order_by(BorrowRecord.scanned_at.desc())


def serialize_record(record: BorrowRecord) -> BorrowRecordOut:
    return BorrowRecordOut(
        id=record.id,
        member_id=record.member_id,
        calculator_id=record.calculator_id,
        name=record.member.name,
        college=record.member.college,
        organization=record.member.organization,
        type=db_type_to_api(record.type),
        scanned_at=record.scanned_at,
        status=db_status_to_api(record.status),
    )


def list_scans(
    db: Session,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[BorrowRecordOut]:
    rows = db.scalars(records_query(from_date, to_date)).unique().all()
    return [serialize_record(row) for row in rows]


def _latest_by_member(db: Session) -> dict[str, BorrowRecord]:
    rows = db.scalars(
        select(BorrowRecord)
        .options(joinedload(BorrowRecord.member))
        .order_by(BorrowRecord.scanned_at.desc())
    ).unique().all()
    latest: dict[str, BorrowRecord] = {}
    for row in rows:
        if row.member_id not in latest:
            latest[row.member_id] = row
    return latest


def _latest_by_calculator(db: Session) -> dict[str, BorrowRecord]:
    rows = db.scalars(
        select(BorrowRecord).order_by(BorrowRecord.scanned_at.desc())
    ).all()
    latest: dict[str, BorrowRecord] = {}
    for row in rows:
        if row.calculator_id not in latest:
            latest[row.calculator_id] = row
    return latest


def members_currently_out(db: Session) -> set[str]:
    return {
        member_id
        for member_id, record in _latest_by_member(db).items()
        if record.type == BorrowType.borrow
    }


def calculators_currently_out(db: Session) -> set[str]:
    return {
        calculator_id
        for calculator_id, record in _latest_by_calculator(db).items()
        if record.type == BorrowType.borrow
    }


def summarize_borrows(db: Session) -> BorrowSummaryOut:
    out_now = len(members_currently_out(db))
    today = datetime.now(tz=LOCAL_TZ).date()
    day_start, day_end = parse_day_bounds(today, today)
    assert day_start is not None and day_end is not None

    today_rows = db.scalars(
        select(BorrowRecord).where(
            BorrowRecord.scanned_at >= day_start,
            BorrowRecord.scanned_at < day_end,
        )
    ).all()

    borrowed_today = sum(1 for row in today_rows if row.type == BorrowType.borrow)
    returned_today = sum(
        1 for row in today_rows if row.type == BorrowType.return_
    )
    return_rate = (
        0
        if borrowed_today == 0
        else round((returned_today / borrowed_today) * 100)
    )
    return BorrowSummaryOut(
        out_now=out_now,
        borrowed_today=borrowed_today,
        returned_today=returned_today,
        return_rate=return_rate,
    )


def rank_borrows(
    db: Session,
    *,
    group_by: str = "college",
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = 5,
) -> list[BorrowRankOut]:
    rows = db.scalars(records_query(from_date, to_date)).unique().all()
    borrow_rows = [row for row in rows if row.type == BorrowType.borrow]

    if group_by == "college":
        counts = {college: 0 for college in COLLEGE_ORDER}
        for row in borrow_rows:
            if row.member.college in counts:
                counts[row.member.college] += 1
        ranked = [
            BorrowRankOut(key=college, label=college, count=counts[college])
            for college in COLLEGE_ORDER
        ]
        return sorted(ranked, key=lambda item: (-item.count, item.label))

    counts: dict[str, int] = {}
    for row in borrow_rows:
        key = row.member.organization
        counts[key] = counts.get(key, 0) + 1
    ranked = [
        BorrowRankOut(key=label, label=label, count=count)
        for label, count in counts.items()
    ]
    return sorted(ranked, key=lambda item: (-item.count, item.label))[:limit]


def list_currently_out(db: Session) -> list[CurrentlyOutOut]:
    """Latest loan state per member who has borrow history (out or returned)."""
    rows = db.scalars(
        select(BorrowRecord)
        .options(joinedload(BorrowRecord.member))
        .order_by(BorrowRecord.scanned_at.desc())
    ).unique().all()

    by_member: dict[str, list[BorrowRecord]] = {}
    for row in rows:
        by_member.setdefault(row.member_id, []).append(row)

    out_rows: list[CurrentlyOutOut] = []
    for member_id, member_rows in by_member.items():
        # member_rows already newest-first
        latest_event = member_rows[0]
        if latest_event.type == BorrowType.borrow:
            status = LoanStatusApi.not_returned
            borrowed_at = latest_event.scanned_at
            calculator_id = latest_event.calculator_id
        else:
            status = LoanStatusApi.returned
            prior_borrow = next(
                (r for r in member_rows if r.type == BorrowType.borrow),
                None,
            )
            borrowed_at = (
                prior_borrow.scanned_at
                if prior_borrow is not None
                else latest_event.scanned_at
            )
            calculator_id = (
                prior_borrow.calculator_id
                if prior_borrow is not None
                else latest_event.calculator_id
            )

        out_rows.append(
            CurrentlyOutOut(
                member_id=member_id,
                calculator_id=calculator_id,
                name=latest_event.member.name,
                college=latest_event.member.college,
                organization=latest_event.member.organization,
                borrowed_at=borrowed_at,
                status=status,
            )
        )
    return sorted(out_rows, key=lambda row: row.borrowed_at, reverse=True)


def create_scan(
    db: Session,
    *,
    raw_member_id: str,
    raw_calculator_id: str,
    scan_type: BorrowTypeApi,
    client_id: str | None = None,
    scanned_at: datetime | None = None,
) -> BorrowRecordOut:
    normalized_client_id = (client_id or "").strip() or None
    if normalized_client_id is not None:
        existing = db.scalar(
            select(BorrowRecord)
            .options(joinedload(BorrowRecord.member))
            .where(BorrowRecord.client_id == normalized_client_id)
        )
        if existing is not None:
            return serialize_record(existing)

    member_id = raw_member_id.strip().upper()
    if not member_id:
        raise ValueError("Enter or scan a member ID.")

    calculator_id = raw_calculator_id.strip().upper()
    if not calculator_id:
        raise ValueError("Enter or scan a calculator ID.")

    member = db.get(Member, member_id)
    if member is None or not member.is_active:
        raise LookupError(f"Unknown ID “{raw_member_id.strip()}”.")

    calculator = db.get(Calculator, calculator_id)
    if calculator is None or not calculator.is_active:
        raise LookupError(f"Unknown calculator “{raw_calculator_id.strip()}”.")

    latest_by_member = _latest_by_member(db)
    open_loan = latest_by_member.get(member.id)
    member_is_out = (
        open_loan is not None and open_loan.type == BorrowType.borrow
    )
    calculator_is_out = calculator.id in calculators_currently_out(db)

    if scan_type == BorrowTypeApi.borrow:
        if member_is_out:
            raise BorrowConflictError(
                f"{member.name} already has a calculator out."
            )
        if calculator_is_out:
            raise BorrowConflictError(
                f"{calculator.id} is already checked out."
            )
    else:
        if not member_is_out or open_loan is None:
            raise BorrowConflictError(
                f"{member.name} has nothing to return."
            )
        if open_loan.calculator_id != calculator.id:
            raise BorrowConflictError(
                f"{member.name} must return {open_loan.calculator_id}, "
                f"not {calculator.id}."
            )

    db_type = api_type_to_db(scan_type)
    status = (
        BorrowStatus.out
        if db_type == BorrowType.borrow
        else BorrowStatus.returned
    )
    event_at = scanned_at.astimezone(LOCAL_TZ) if scanned_at else datetime.now(tz=LOCAL_TZ)
    record = BorrowRecord(
        member_id=member.id,
        calculator_id=calculator.id,
        type=db_type,
        status=status,
        scanned_at=event_at,
        client_id=normalized_client_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    loaded = db.scalar(
        select(BorrowRecord)
        .options(joinedload(BorrowRecord.member))
        .where(BorrowRecord.id == record.id)
    )
    assert loaded is not None
    return serialize_record(loaded)
