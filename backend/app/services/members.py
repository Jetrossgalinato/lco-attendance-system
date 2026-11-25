import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.schemas.member import (
    MemberCreateRequest,
    MemberOut,
    MemberUpdateRequest,
    NextMemberIdOut,
)

LCO_ID_PATTERN = re.compile(r"^LCO-(\d+)$", re.IGNORECASE)


class MemberConflictError(Exception):
    pass


def serialize_member(member: Member) -> MemberOut:
    return MemberOut(
        id=member.id,
        name=member.name,
        department=member.department,
        college=member.college,
        organization=member.organization,
        is_active=member.is_active,
        created_at=member.created_at,
    )


def list_members(
    db: Session,
    *,
    active: str = "all",
) -> list[MemberOut]:
    stmt = select(Member).order_by(Member.name.asc())
    if active == "true":
        stmt = stmt.where(Member.is_active.is_(True))
    elif active == "false":
        stmt = stmt.where(Member.is_active.is_(False))

    rows = db.scalars(stmt).all()
    return [serialize_member(row) for row in rows]


def next_member_id(db: Session) -> NextMemberIdOut:
    ids = db.scalars(select(Member.id)).all()
    max_num = 1000
    for member_id in ids:
        match = LCO_ID_PATTERN.match(member_id.strip())
        if match:
            max_num = max(max_num, int(match.group(1)))
    return NextMemberIdOut(id=f"LCO-{max_num + 1}")


def create_member(db: Session, body: MemberCreateRequest) -> MemberOut:
    name = body.name.strip()
    department = body.department.strip()
    college = body.college.strip()
    organization = body.organization.strip()
    if not name or not department or not college or not organization:
        raise ValueError("Name, department, college, and organization are required.")

    if body.id and body.id.strip():
        member_id = body.id.strip().upper()
    else:
        member_id = next_member_id(db).id

    if db.get(Member, member_id) is not None:
        raise MemberConflictError(f"Member ID “{member_id}” already exists.")

    member = Member(
        id=member_id,
        name=name,
        department=department,
        college=college,
        organization=organization,
        is_active=True,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return serialize_member(member)


def update_member(
    db: Session,
    member_id: str,
    body: MemberUpdateRequest,
) -> MemberOut:
    member = db.get(Member, member_id.strip().upper())
    if member is None:
        raise LookupError(f"Member “{member_id}” not found.")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise ValueError("Name cannot be empty.")
        member.name = name
    if body.department is not None:
        department = body.department.strip()
        if not department:
            raise ValueError("Department cannot be empty.")
        member.department = department
    if body.college is not None:
        college = body.college.strip()
        if not college:
            raise ValueError("College cannot be empty.")
        member.college = college
    if body.organization is not None:
        organization = body.organization.strip()
        if not organization:
            raise ValueError("Organization cannot be empty.")
        member.organization = organization
    if body.is_active is not None:
        member.is_active = body.is_active

    db.commit()
    db.refresh(member)
    return serialize_member(member)
