import type { AttendanceStatus, AttendanceType } from "@/data/attendance"
import type { BorrowType } from "@/data/calculator"

import {
  deleteOpenLoan,
  getAllOpenLoans,
  getCalculator,
  getLocalAttendance,
  getMember,
  getOpenLoan,
  putLocalAttendance,
  putLocalBorrow,
  putOpenLoan,
  putOutboxItem,
} from "./db"
import type {
  AttendanceOutboxPayload,
  BorrowOutboxPayload,
  LocalAttendanceRecord,
  LocalBorrowRecord,
} from "./types"

/** Matches backend default late cutoff (Asia/Manila wall clock). */
const LATE_CUTOFF_MINUTES = 9 * 60

function attendanceStatusFor(iso: string): AttendanceStatus {
  const local = new Date(iso)
  const minutes = local.getHours() * 60 + local.getMinutes()
  return minutes < LATE_CUTOFF_MINUTES ? "Present" : "Late"
}

function sameLocalDay(iso: string, reference = new Date()): boolean {
  const date = new Date(iso)
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  )
}

export type OfflineApplyResult<T> =
  | { ok: true; record: T }
  | { ok: false; message: string }

export async function applyAttendanceOffline(
  rawMemberId: string,
  type: AttendanceType
): Promise<OfflineApplyResult<LocalAttendanceRecord>> {
  const memberId = rawMemberId.trim().toUpperCase()
  if (!memberId) {
    return { ok: false, message: "Enter or scan a member ID." }
  }

  const member = await getMember(memberId)
  if (!member) {
    return {
      ok: false,
      message: `Unknown ID “${rawMemberId.trim()}”. Connect once to download the roster, or check the ID.`,
    }
  }

  const existing = await getLocalAttendance()
  const duplicate = existing.find(
    (row) =>
      row.memberId === member.id &&
      row.type === type &&
      sameLocalDay(row.scannedAt)
  )
  if (duplicate) {
    return {
      ok: false,
      message: `${member.name} already has ${type} recorded today.`,
    }
  }

  const scannedAt = new Date().toISOString()
  const clientId = crypto.randomUUID()
  const record: LocalAttendanceRecord = {
    id: clientId,
    memberId: member.id,
    name: member.name,
    department: member.department,
    type,
    scannedAt,
    status: attendanceStatusFor(scannedAt),
    pending: true,
  }

  const payload: AttendanceOutboxPayload = {
    memberId: member.id,
    type,
    scannedAt,
  }
  await putLocalAttendance(record)
  await putOutboxItem({
    id: clientId,
    kind: "attendance",
    payload,
    createdAt: scannedAt,
    status: "pending",
  })
  return { ok: true, record }
}

export async function applyBorrowOffline(
  rawMemberId: string,
  type: BorrowType,
  rawCalculatorId: string
): Promise<OfflineApplyResult<LocalBorrowRecord>> {
  const memberId = rawMemberId.trim().toUpperCase()
  const calculatorId = rawCalculatorId.trim().toUpperCase()
  if (!memberId) {
    return { ok: false, message: "Enter or scan a member ID." }
  }
  if (!calculatorId) {
    return { ok: false, message: "Enter or scan a calculator ID." }
  }

  const member = await getMember(memberId)
  if (!member) {
    return {
      ok: false,
      message: `Unknown ID “${rawMemberId.trim()}”. Connect once to download the roster, or check the ID.`,
    }
  }
  const calculator = await getCalculator(calculatorId)
  if (!calculator) {
    return {
      ok: false,
      message: `Unknown calculator “${rawCalculatorId.trim()}”.`,
    }
  }

  const openLoan = await getOpenLoan(member.id)
  const openLoans = await getAllOpenLoans()
  const calculatorOut = openLoans.find(
    (loan) => loan.calculatorId === calculator.id
  )

  if (type === "Borrow") {
    if (openLoan) {
      return {
        ok: false,
        message: `${member.name} already has a calculator out.`,
      }
    }
    if (calculatorOut) {
      return {
        ok: false,
        message: `${calculator.id} is already checked out.`,
      }
    }
  } else {
    if (!openLoan) {
      return {
        ok: false,
        message: `${member.name} has nothing to return.`,
      }
    }
    if (openLoan.calculatorId !== calculator.id) {
      return {
        ok: false,
        message: `${member.name} must return ${openLoan.calculatorId}, not ${calculator.id}.`,
      }
    }
  }

  const scannedAt = new Date().toISOString()
  const clientId = crypto.randomUUID()
  const record: LocalBorrowRecord = {
    id: clientId,
    memberId: member.id,
    calculatorId: calculator.id,
    name: member.name,
    college: member.college,
    organization: member.organization,
    type,
    scannedAt,
    status: type === "Borrow" ? "Out" : "Returned",
    pending: true,
  }

  const payload: BorrowOutboxPayload = {
    memberId: member.id,
    calculatorId: calculator.id,
    type,
    scannedAt,
  }

  await putLocalBorrow(record)
  await putOutboxItem({
    id: clientId,
    kind: "borrow",
    payload,
    createdAt: scannedAt,
    status: "pending",
  })

  if (type === "Borrow") {
    await putOpenLoan({
      memberId: member.id,
      calculatorId: calculator.id,
      name: member.name,
    })
  } else {
    await deleteOpenLoan(member.id)
  }

  return { ok: true, record }
}
