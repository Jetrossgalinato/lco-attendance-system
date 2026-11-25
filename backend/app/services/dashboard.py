from calendar import monthrange
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.borrow import BorrowRecord, BorrowType
from app.models.member import Member
from app.schemas.dashboard import (
    DashboardKpiOut,
    DashboardOut,
    NamedCountOut,
    StatusSliceOut,
    WeeklyAttendancePointOut,
)
from app.services.attendance import LOCAL_TZ, current_week_dates, parse_day_bounds
from app.services.borrows import rank_borrows

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _pct_change(current: int, previous: int) -> str:
    if previous == 0:
        return "—" if current == 0 else "+100% vs last week"
    change = round(((current - previous) / previous) * 100)
    sign = "+" if change >= 0 else ""
    return f"{sign}{change}% vs last week"


def _count_members_created(
    db: Session, *, from_date: date, to_date: date
) -> int:
    start, end = parse_day_bounds(from_date, to_date)
    assert start is not None and end is not None
    return int(
        db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.created_at >= start, Member.created_at < end)
        )
        or 0
    )


def _count_borrow_events(
    db: Session,
    *,
    from_date: date,
    to_date: date,
    borrow_type: BorrowType,
) -> int:
    start, end = parse_day_bounds(from_date, to_date)
    assert start is not None and end is not None
    return int(
        db.scalar(
            select(func.count())
            .select_from(BorrowRecord)
            .where(
                BorrowRecord.scanned_at >= start,
                BorrowRecord.scanned_at < end,
                BorrowRecord.type == borrow_type,
            )
        )
        or 0
    )


def _active_attendance_days(
    db: Session, *, from_date: date, to_date: date
) -> int:
    start, end = parse_day_bounds(from_date, to_date)
    assert start is not None and end is not None
    rows = db.scalars(
        select(AttendanceRecord.scanned_at).where(
            AttendanceRecord.scanned_at >= start,
            AttendanceRecord.scanned_at < end,
        )
    ).all()
    days = {
        scanned_at.astimezone(LOCAL_TZ).date()
        for scanned_at in rows
    }
    return len(days)


def _build_kpis(db: Session, *, today: date) -> list[DashboardKpiOut]:
    week_from, week_to = current_week_dates(
        datetime.combine(today, datetime.min.time(), tzinfo=LOCAL_TZ)
    )
    # Prior calendar week (Mon–Sun before this week's Monday).
    prior_week_to = week_from - timedelta(days=1)
    prior_week_from = prior_week_to - timedelta(days=6)

    month_from = today.replace(day=1)
    if today.month == 1:
        prior_month_last = today.replace(year=today.year - 1, month=12, day=31)
        prior_month_from = prior_month_last.replace(day=1)
    else:
        prior_month_last_day = monthrange(today.year, today.month - 1)[1]
        prior_month_from = today.replace(
            month=today.month - 1, day=1
        )
        prior_month_last = today.replace(
            month=today.month - 1, day=prior_month_last_day
        )

    active_members = int(
        db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.is_active.is_(True))
        )
        or 0
    )
    created_this_week = _count_members_created(
        db, from_date=week_from, to_date=today
    )
    created_prior_week = _count_members_created(
        db, from_date=prior_week_from, to_date=prior_week_to
    )

    active_days_month = _active_attendance_days(
        db, from_date=month_from, to_date=today
    )
    active_days_prior_month = _active_attendance_days(
        db, from_date=prior_month_from, to_date=prior_month_last
    )
    active_days_delta = active_days_month - active_days_prior_month
    active_days_delta_str = (
        f"+{active_days_delta} this month"
        if active_days_delta >= 0
        else f"{active_days_delta} this month"
    )

    borrows_week = _count_borrow_events(
        db,
        from_date=week_from,
        to_date=today,
        borrow_type=BorrowType.borrow,
    )
    borrows_prior = _count_borrow_events(
        db,
        from_date=prior_week_from,
        to_date=prior_week_to,
        borrow_type=BorrowType.borrow,
    )
    returns_week = _count_borrow_events(
        db,
        from_date=week_from,
        to_date=today,
        borrow_type=BorrowType.return_,
    )
    return_rate = (
        0
        if borrows_week == 0
        else round((returns_week / borrows_week) * 100)
    )

    return [
        DashboardKpiOut(
            key="members",
            label="Members",
            value=active_members,
            delta=_pct_change(created_this_week, created_prior_week),
        ),
        DashboardKpiOut(
            key="active_days",
            label="Active days",
            value=active_days_month,
            delta=active_days_delta_str,
        ),
        DashboardKpiOut(
            key="borrows",
            label="Borrows",
            value=borrows_week,
            delta=_pct_change(borrows_week, borrows_prior),
        ),
        DashboardKpiOut(
            key="returns",
            label="Returns",
            value=returns_week,
            delta=f"{return_rate}% return rate",
        ),
    ]


def _weekly_attendance(
    db: Session, *, week_from: date, week_to: date, today: date
) -> list[WeeklyAttendancePointOut]:
    start, end = parse_day_bounds(week_from, week_to)
    assert start is not None and end is not None

    rows = db.execute(
        select(
            AttendanceRecord.scanned_at,
            AttendanceRecord.status,
        ).where(
            AttendanceRecord.scanned_at >= start,
            AttendanceRecord.scanned_at < end,
        )
    ).all()

    by_day: dict[date, dict[str, int]] = {
        week_from + timedelta(days=offset): {"present": 0, "late": 0}
        for offset in range(7)
    }
    for scanned_at, status in rows:
        local_day = scanned_at.astimezone(LOCAL_TZ).date()
        bucket = by_day.get(local_day)
        if bucket is None:
            continue
        if status == AttendanceStatus.present:
            bucket["present"] += 1
        elif status == AttendanceStatus.late:
            bucket["late"] += 1

    points: list[WeeklyAttendancePointOut] = []
    for offset in range(7):
        day = week_from + timedelta(days=offset)
        counts = by_day[day]
        # Future days in the week stay at zero.
        if day > today:
            points.append(
                WeeklyAttendancePointOut(
                    day=DAY_LABELS[offset], present=0, late=0
                )
            )
        else:
            points.append(
                WeeklyAttendancePointOut(
                    day=DAY_LABELS[offset],
                    present=counts["present"],
                    late=counts["late"],
                )
            )
    return points


def build_dashboard(db: Session) -> DashboardOut:
    today = datetime.now(tz=LOCAL_TZ).date()
    week_from, week_to = current_week_dates(
        datetime.combine(today, datetime.min.time(), tzinfo=LOCAL_TZ)
    )

    weekly = _weekly_attendance(
        db, week_from=week_from, week_to=week_to, today=today
    )
    present_total = sum(point.present for point in weekly)
    late_total = sum(point.late for point in weekly)

    college_ranks = rank_borrows(
        db,
        group_by="college",
        from_date=week_from,
        to_date=today,
    )
    org_ranks = rank_borrows(
        db,
        group_by="organization",
        from_date=week_from,
        to_date=today,
        limit=5,
    )

    return DashboardOut(
        kpis=_build_kpis(db, today=today),
        weekly_attendance=weekly,
        attendance_status=[
            StatusSliceOut(name="Present", value=present_total),
            StatusSliceOut(name="Late", value=late_total),
        ],
        borrows_by_college=[
            NamedCountOut(name=rank.label, count=rank.count)
            for rank in college_ranks
        ],
        top_organizations=[
            NamedCountOut(name=rank.label, count=rank.count)
            for rank in org_ranks
        ],
    )
