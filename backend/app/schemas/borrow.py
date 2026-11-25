from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class BorrowTypeApi(str, Enum):
    borrow = "Borrow"
    return_ = "Return"


class BorrowStatusApi(str, Enum):
    out = "Out"
    returned = "Returned"


class BorrowScanCreateRequest(BaseModel):
    member_id: str = Field(min_length=1)
    type: BorrowTypeApi


class BorrowRecordOut(BaseModel):
    id: UUID
    member_id: str
    name: str
    college: str
    organization: str
    type: BorrowTypeApi
    scanned_at: datetime
    status: BorrowStatusApi


class BorrowSummaryOut(BaseModel):
    out_now: int
    borrowed_today: int
    returned_today: int
    return_rate: int


class BorrowRankOut(BaseModel):
    key: str
    label: str
    count: int


class LoanStatusApi(str, Enum):
    not_returned = "Not Returned"
    returned = "Returned"


class CurrentlyOutOut(BaseModel):
    member_id: str
    name: str
    college: str
    organization: str
    borrowed_at: datetime
    status: LoanStatusApi
