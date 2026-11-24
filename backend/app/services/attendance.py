from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import Settings
from app.models.attendance import AttendanceRecord, AttendanceStatus, AttendanceType
from app.models.member import Member
from app.schemas.attendance import (
    AttendanceRankOut,
    AttendanceRecordOut,
    AttendanceStatusApi,
    AttendanceSummaryOut,
    AttendanceTypeApi,
)

LOCAL_TZ = ZoneInfo("Asia/Manila")


def api_type_to_db(value: AttendanceTypeApi) -> AttendanceType:
    return (
        AttendanceType.time_in
        if value == AttendanceTypeApi.time_in
        else AttendanceType.time_out
    )


def db_type_to_api(value: AttendanceType) -> AttendanceTypeApi:
    return (
        AttendanceTypeApi.time_in
        if value == AttendanceType.time_in
        else AttendanceTypeApi.time_out
    )


def db_status_to_api(value: AttendanceStatus) -> AttendanceStatusApi:
    return (
        AttendanceStatusApi.present
        if value == AttendanceStatus.present
        else AttendanceStatusApi.late
    )


def attendance_status_for(
    scanned_at: datetime, settings: Settings
) -> AttendanceStatus:
    local = scanned_at.astimezone(LOCAL_TZ)
    minutes = local.hour * 60 + local.minute
    cutoff = settings.late_cutoff_hour * 60 + settings.late_cutoff_minute
    return (
        AttendanceStatus.present if minutes < cutoff else AttendanceStatus.late
    )


def parse_day_bounds(
    from_date: date | None, to_date: date | None
) -> tuple[datetime | None, datetime | None]:
    start = (
        datetime.combine(from_date, time.min, tzinfo=LOCAL_TZ)
        if from_date
        else None
    )
    end = (
        datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=LOCAL_TZ)
        if to_date
        else None
    )
    return start, end


def records_query(
    from_date: date | None = None,
    to_date: date | None = None,
) -> Select[tuple[AttendanceRecord]]:
    stmt = select(AttendanceRecord).options(joinedload(AttendanceRecord.member))
    start, end = parse_day_bounds(from_date, to_date)
    if start is not None:
        stmt = stmt.where(AttendanceRecord.scanned_at >= start)
    if end is not None:
        stmt = stmt.where(AttendanceRecord.scanned_at < end)
    return stmt.order_by(AttendanceRecord.scanned_at.desc())


def serialize_record(record: AttendanceRecord) -> AttendanceRecordOut:
    return AttendanceRecordOut(
        id=record.id,
        member_id=record.member_id,
        name=record.member.name,
        department=record.member.department,
        type=db_type_to_api(record.type),
        scanned_at=record.scanned_at,
        status=db_status_to_api(record.status),
    )


def list_scans(
    db: Session,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[AttendanceRecordOut]:
    rows = db.scalars(records_query(from_date, to_date)).unique().all()
    return [serialize_record(row) for row in rows]


def summarize_scans(
    db: Session,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> AttendanceSummaryOut:
    rows = db.scalars(records_query(from_date, to_date)).unique().all()
    unique_members: dict[str, AttendanceStatus] = {}
    for row in rows:
        if row.member_id not in unique_members:
            unique_members[row.member_id] = row.status

    present = sum(
        1 for status in unique_members.values() if status == AttendanceStatus.present
    )
    late = sum(
        1 for status in unique_members.values() if status == AttendanceStatus.late
    )
    total = len(unique_members)
    rate = 0 if total == 0 else round((present / total) * 100)
    return AttendanceSummaryOut(
        present=present, late=late, total=total, rate=rate
    )


def rank_scans(
    db: Session,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = 5,
) -> list[AttendanceRankOut]:
    rows = db.scalars(records_query(from_date, to_date)).unique().all()
    counts: dict[str, AttendanceRankOut] = {}
    for row in rows:
        existing = counts.get(row.member_id)
        if existing:
            existing.count += 1
        else:
            counts[row.member_id] = AttendanceRankOut(
                member_id=row.member_id,
                name=row.member.name,
                department=row.member.department,
                count=1,
            )
    return sorted(
        counts.values(),
        key=lambda item: (-item.count, item.name),
    )[:limit]


def create_scan(
    db: Session,
    *,
    raw_member_id: str,
    scan_type: AttendanceTypeApi,
    settings: Settings,
) -> AttendanceRecordOut:
    member_id = raw_member_id.strip().upper()
    if not member_id:
        raise ValueError("Enter or scan a member ID.")

    member = db.get(Member, member_id)
    if member is None or not member.is_active:
        raise LookupError(f"Unknown ID “{raw_member_id.strip()}”.")

    db_type = api_type_to_db(scan_type)
    duplicate = db.scalar(
        select(AttendanceRecord.id).where(
            AttendanceRecord.member_id == member.id,
            AttendanceRecord.type == db_type,
        )
    )
    if duplicate is not None:
        label = scan_type.value
        raise ConflictError(f"{member.name} already has {label} recorded.")

    scanned_at = datetime.now(tz=LOCAL_TZ)
    record = AttendanceRecord(
        member_id=member.id,
        type=db_type,
        status=attendance_status_for(scanned_at, settings),
        scanned_at=scanned_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    record = db.scalar(
        select(AttendanceRecord)
        .options(joinedload(AttendanceRecord.member))
        .where(AttendanceRecord.id == record.id)
    )
    assert record is not None
    return serialize_record(record)


class ConflictError(Exception):
    pass
