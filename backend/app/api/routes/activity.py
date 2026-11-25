from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.activity import ActivityItemOut
from app.services import activity as activity_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/activity", response_model=list[ActivityItemOut])
def list_activity(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[ActivityItemOut]:
    return activity_service.list_activity(
        db, from_date=from_date, to_date=to_date
    )
