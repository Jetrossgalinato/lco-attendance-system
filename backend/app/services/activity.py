from datetime import date

from sqlalchemy.orm import Session

from app.schemas.activity import ActivityItemOut, ActivityKindApi
from app.services import attendance as attendance_service
from app.services import borrows as borrows_service


def list_activity(
    db: Session,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[ActivityItemOut]:
    items: list[ActivityItemOut] = []

    for row in attendance_service.list_scans(
        db, from_date=from_date, to_date=to_date
    ):
        items.append(
            ActivityItemOut(
                id=f"attendance:{row.id}",
                occurred_at=row.scanned_at,
                member_id=row.member_id,
                actor=row.name,
                kind=ActivityKindApi.attendance,
                detail=row.type.value,
                status=row.status.value,
            )
        )

    for row in borrows_service.list_scans(
        db, from_date=from_date, to_date=to_date
    ):
        detail = (
            f"Calculator · {row.college}"
            if row.type.value == "Borrow"
            else f"Return · {row.college}"
        )
        items.append(
            ActivityItemOut(
                id=f"borrow:{row.id}",
                occurred_at=row.scanned_at,
                member_id=row.member_id,
                actor=row.name,
                kind=ActivityKindApi.borrow,
                detail=detail,
                status=row.status.value,
            )
        )

    items.sort(key=lambda item: item.occurred_at, reverse=True)
    return items
