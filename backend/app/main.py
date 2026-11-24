import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import attendance, auth, health, members
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.seed import ensure_seed_admin, ensure_seed_members

logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(members.router)


@app.on_event("startup")
def seed_on_startup() -> None:
    if not settings.is_development:
        return

    db = SessionLocal()
    try:
        created_admin = ensure_seed_admin(db, settings)
        if created_admin is not None:
            logger.info("Seeded admin user %s", created_admin.email)

        created_members = ensure_seed_members(db)
        if created_members:
            logger.info("Seeded %s members", created_members)
    except Exception:
        logger.exception("Failed to seed development data")
    finally:
        db.close()


@app.get("/")
def root() -> dict[str, str]:
    return {"message": settings.app_name}
