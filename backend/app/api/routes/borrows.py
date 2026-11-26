from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.borrow import (
    BorrowRankOut,
    BorrowRecordOut,
    BorrowScanCreateRequest,
    BorrowSummaryOut,
    CurrentlyOutOut,
)
from app.services import borrows as borrows_service
from app.services.borrows import BorrowConflictError

router = APIRouter(prefix="/borrows", tags=["borrows"])


@router.post(
    "/scans",
    response_model=BorrowRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def create_scan(
    body: BorrowScanCreateRequest,
    db: Session = Depends(get_db),
) -> BorrowRecordOut:
    try:
        return borrows_service.create_scan(
            db,
            raw_member_id=body.member_id,
            raw_calculator_id=body.calculator_id,
            scan_type=body.type,
            client_id=body.client_id,
            scanned_at=body.scanned_at,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except BorrowConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/scans", response_model=list[BorrowRecordOut])
def list_scans(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> list[BorrowRecordOut]:
    return borrows_service.list_scans(db, from_date=from_date, to_date=to_date)


@router.get("/summary", response_model=BorrowSummaryOut)
def summary(db: Session = Depends(get_db)) -> BorrowSummaryOut:
    return borrows_service.summarize_borrows(db)


@router.get("/ranking", response_model=list[BorrowRankOut])
def ranking(
    group_by: str = Query(default="college", pattern="^(college|organization)$"),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[BorrowRankOut]:
    return borrows_service.rank_borrows(
        db,
        group_by=group_by,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
    )


@router.get("/currently-out", response_model=list[CurrentlyOutOut])
def currently_out(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[CurrentlyOutOut]:
    return borrows_service.list_currently_out(db)
