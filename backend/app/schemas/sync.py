from datetime import datetime

from pydantic import BaseModel


class SnapshotMemberOut(BaseModel):
    id: str
    name: str
    department: str
    college: str
    organization: str


class SnapshotCalculatorOut(BaseModel):
    id: str
    label: str | None


class SnapshotOpenLoanOut(BaseModel):
    member_id: str
    calculator_id: str
    name: str


class DeskSnapshotOut(BaseModel):
    generated_at: datetime
    members: list[SnapshotMemberOut]
    calculators: list[SnapshotCalculatorOut]
    open_loans: list[SnapshotOpenLoanOut]
