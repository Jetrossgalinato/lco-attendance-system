from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class AttendanceTypeApi(str, Enum):
    time_in = "Time In"
    time_out = "Time Out"


class AttendanceStatusApi(str, Enum):
    present = "Present"
    late = "Late"


class ScanCreateRequest(BaseModel):
    member_id: str = Field(min_length=1)
    type: AttendanceTypeApi


class AttendanceRecordOut(BaseModel):
    id: UUID
    member_id: str
    name: str
    department: str
    type: AttendanceTypeApi
    scanned_at: datetime
    status: AttendanceStatusApi


class AttendanceSummaryOut(BaseModel):
    present: int
    late: int
    total: int
    rate: int


class AttendanceRankOut(BaseModel):
    member_id: str
    name: str
    department: str
    count: int
