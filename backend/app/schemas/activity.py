from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ActivityKindApi(str, Enum):
    attendance = "Attendance"
    borrow = "Borrow"


class ActivityItemOut(BaseModel):
    id: str
    occurred_at: datetime
    member_id: str
    actor: str
    kind: ActivityKindApi
    detail: str
    status: str
