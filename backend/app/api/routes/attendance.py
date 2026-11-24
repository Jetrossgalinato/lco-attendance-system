from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.schemas.attendance import (
    AttendanceRankOut,
    AttendanceRecordOut,
    AttendanceSummaryOut,
    ScanCreateRequest,
)
from app.services import attendance as attendance_service
from app.services.attendance import ConflictError

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post(
    "/scans",
    response_model=AttendanceRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def create_scan(
    body: ScanCreateRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AttendanceRecordOut:
    try:
        return attendance_service.create_scan(
            db,
            raw_member_id=body.member_id,
            scan_type=body.type,
            settings=settings,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/scans", response_model=list[AttendanceRecordOut])
def list_scans(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> list[AttendanceRecordOut]:
    return attendance_service.list_scans(db, from_date=from_date, to_date=to_date)


@router.get("/summary", response_model=AttendanceSummaryOut)
def summary(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> AttendanceSummaryOut:
    return attendance_service.summarize_scans(
        db, from_date=from_date, to_date=to_date
    )


@router.get("/ranking", response_model=list[AttendanceRankOut])
def ranking(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[AttendanceRankOut]:
    return attendance_service.rank_scans(
        db, from_date=from_date, to_date=to_date, limit=limit
    )
