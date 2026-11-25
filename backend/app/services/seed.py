from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_password
from app.data.seed_calculators import build_seed_calculators
from app.data.seed_members import build_seed_members
from app.models.calculator import Calculator
from app.models.member import Member
from app.models.user import User, UserRole


def ensure_seed_admin(db: Session, settings: Settings) -> User | None:
    """Create the seeded admin user if it does not already exist."""
    email = settings.seed_admin_email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        return None

    user = User(
        email=email,
        password_hash=hash_password(settings.seed_admin_password),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_seed_members(db: Session) -> int:
    """Insert missing roster members. Returns number of rows created."""
    created = 0
    for item in build_seed_members(48):
        existing = db.get(Member, item["id"])
        if existing is not None:
            continue
        db.add(
            Member(
                id=item["id"],
                name=item["name"],
                department=item["department"],
                college=item["college"],
                organization=item["organization"],
                is_active=True,
            )
        )
        created += 1

    if created:
        db.commit()
    return created


def ensure_seed_calculators(db: Session) -> int:
    """Insert missing calculators. Returns number of rows created."""
    created = 0
    for item in build_seed_calculators(16):
        existing = db.get(Calculator, item["id"])
        if existing is not None:
            continue
        db.add(
            Calculator(
                id=item["id"],
                label=item["label"],
                is_active=True,
            )
        )
        created += 1

    if created:
        db.commit()
    return created
