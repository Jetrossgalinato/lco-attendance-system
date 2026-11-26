import type { AttendanceRecord, AttendanceType } from "@/data/attendance"
import type { BorrowType, CalculatorRecord } from "@/data/calculator"

export type CachedMember = {
  id: string
  name: string
  department: string
  college: string
  organization: string
}

export type CachedCalculator = {
  id: string
  label: string | null
}

export type CachedOpenLoan = {
  memberId: string
  calculatorId: string
  name: string
}

export type OutboxKind = "attendance" | "borrow"

export type AttendanceOutboxPayload = {
  memberId: string
  type: AttendanceType
  scannedAt: string
}

export type BorrowOutboxPayload = {
  memberId: string
  calculatorId: string
  type: BorrowType
  scannedAt: string
}

export type OutboxItem = {
  id: string
  kind: OutboxKind
  payload: AttendanceOutboxPayload | BorrowOutboxPayload
  createdAt: string
  status: "pending" | "syncing" | "failed"
  lastError?: string
}

export type DeskSnapshot = {
  generatedAt: string
  members: CachedMember[]
  calculators: CachedCalculator[]
  openLoans: CachedOpenLoan[]
}

export type DeskSyncStatus = {
  online: boolean
  pendingCount: number
  syncing: boolean
  lastError: string | null
  hasSnapshot: boolean
}

export type LocalAttendanceRecord = AttendanceRecord & { pending?: boolean }
export type LocalBorrowRecord = CalculatorRecord & { pending?: boolean }
