from datetime import datetime

from pydantic import BaseModel, Field


class MemberOut(BaseModel):
    id: str
    name: str
    department: str
    college: str
    organization: str
    is_active: bool
    created_at: datetime


class MemberCreateRequest(BaseModel):
    id: str | None = Field(default=None, min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=255)
    department: str = Field(min_length=1, max_length=120)
    college: str = Field(min_length=1, max_length=64)
    organization: str = Field(min_length=1, max_length=120)


class MemberUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    department: str | None = Field(default=None, min_length=1, max_length=120)
    college: str | None = Field(default=None, min_length=1, max_length=64)
    organization: str | None = Field(default=None, min_length=1, max_length=120)
    is_active: bool | None = None


class NextMemberIdOut(BaseModel):
    id: str
