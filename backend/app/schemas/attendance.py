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
    client_id: str | None = Field(default=None, max_length=64)
    scanned_at: datetime | None = None


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


class EmployeeAttendanceOut(BaseModel):
    id: str
    name: str
    department: str
    college: str
    organization: str
    present_week: int
    late_week: int
    scan_count_week: int
    last_scan_at: datetime | None
