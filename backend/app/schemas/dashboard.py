from pydantic import BaseModel


class DashboardKpiOut(BaseModel):
    key: str
    label: str
    value: int
    delta: str


class WeeklyAttendancePointOut(BaseModel):
    day: str
    present: int
    late: int


class NamedCountOut(BaseModel):
    name: str
    count: int


class StatusSliceOut(BaseModel):
    name: str
    value: int


class DashboardOut(BaseModel):
    kpis: list[DashboardKpiOut]
    weekly_attendance: list[WeeklyAttendancePointOut]
    attendance_status: list[StatusSliceOut]
    borrows_by_college: list[NamedCountOut]
    top_organizations: list[NamedCountOut]
