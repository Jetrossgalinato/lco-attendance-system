from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.sync import DeskSnapshotOut
from app.services import sync as sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/desk-snapshot", response_model=DeskSnapshotOut)
def desk_snapshot(db: Session = Depends(get_db)) -> DeskSnapshotOut:
    return sync_service.build_desk_snapshot(db)
