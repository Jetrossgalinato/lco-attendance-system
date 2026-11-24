from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, BaseModel, Field

from app.models.user import UserRole


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    local, _, domain = email.partition("@")
    if not local or not domain or "." not in domain:
        raise ValueError("Invalid email address")
    return email


AppEmail = Annotated[str, AfterValidator(normalize_email)]


class LoginRequest(BaseModel):
    email: AppEmail
    password: str = Field(min_length=1)


class UserPublic(BaseModel):
    id: UUID
    email: AppEmail
    role: UserRole

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
