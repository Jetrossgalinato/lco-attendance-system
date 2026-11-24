from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.member import (
    MemberCreateRequest,
    MemberOut,
    MemberUpdateRequest,
    NextMemberIdOut,
)
from app.services import members as members_service
from app.services.members import MemberConflictError

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=list[MemberOut])
def list_members(
    active: str = Query(default="all", pattern="^(all|true|false)$"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[MemberOut]:
    return members_service.list_members(db, active=active)


@router.get("/next-id", response_model=NextMemberIdOut)
def get_next_member_id(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> NextMemberIdOut:
    return members_service.next_member_id(db)


@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(
    body: MemberCreateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> MemberOut:
    try:
        return members_service.create_member(db, body)
    except MemberConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.patch("/{member_id}", response_model=MemberOut)
def update_member(
    member_id: str,
    body: MemberUpdateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> MemberOut:
    try:
        return members_service.update_member(db, member_id, body)
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
