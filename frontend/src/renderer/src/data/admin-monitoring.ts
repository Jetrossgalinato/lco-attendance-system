import type { AdminActivityRow } from "./admin"
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
} from "./attendance"
import type { BorrowStatus, BorrowType, CalculatorRecord } from "./calculator"
import { getMembersOut } from "./calculator"
import {
  MEMBER_COLLEGES,
  MEMBER_ORGANIZATIONS,
  MOCK_MEMBERS,
  type Member,
} from "./members"

export type EmployeeAttendanceStats = Member & {
  presentWeek: number
  lateWeek: number
  scanCountWeek: number
  lastScanAt: string | null
}

export type CurrentlyOutRow = {
  memberId: string
  name: string
  college: string
  organization: string
  borrowedAt: string
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function atLocalTime(
  day: Date,
  hour: number,
  minute: number,
  second = 0
): Date {
  const next = new Date(day)
  next.setHours(hour, minute, second, 0)
  return next
}

function weekStart(reference: Date = new Date()): Date {
  const day = startOfLocalDay(reference)
  const weekday = day.getDay() // 0 Sun … 6 Sat
  const offset = weekday === 0 ? -6 : 1 - weekday
  return addDays(day, offset)
}

function isInCurrentWeek(iso: string, reference: Date = new Date()): boolean {
  const value = new Date(iso).getTime()
  const start = weekStart(reference).getTime()
  const end = addDays(weekStart(reference), 7).getTime()
  return value >= start && value < end
}

function attendanceStatusFor(date: Date): AttendanceStatus {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes < 9 * 60 ? "Present" : "Late"
}

/** Deterministic attendance log across recent days (newest first). */
function buildAttendanceLog(members: Member[]): AttendanceRecord[] {
  const today = startOfLocalDay(new Date())
  const records: AttendanceRecord[] = []
  let seq = 0

  for (let dayOffset = 0; dayOffset < 10; dayOffset += 1) {
    const day = addDays(today, -dayOffset)
    const memberCount = 10 + ((dayOffset * 3) % 8)

    for (let index = 0; index < memberCount; index += 1) {
      const member = members[(dayOffset * 5 + index * 2) % members.length]
      const inHour = 7 + ((index + dayOffset) % 3)
      const inMinute = (index * 7 + dayOffset * 3) % 55
      const timeIn = atLocalTime(day, inHour, inMinute, (index * 5) % 50)

      seq += 1
      records.push({
        id: `mon-att-${seq}`,
        memberId: member.id,
        name: member.name,
        department: member.department,
        type: "Time In",
        scannedAt: timeIn.toISOString(),
        status: attendanceStatusFor(timeIn),
      })

      if (index % 3 !== 0) {
        const outHour = 16 + (index % 3)
        const outMinute = (index * 11 + dayOffset) % 50
        const timeOut = atLocalTime(day, outHour, outMinute, (index * 7) % 50)
        seq += 1
        records.push({
          id: `mon-att-${seq}`,
          memberId: member.id,
          name: member.name,
          department: member.department,
          type: "Time Out",
          scannedAt: timeOut.toISOString(),
          status: attendanceStatusFor(timeOut),
        })
      }
    }
  }

  return records.sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )
}

/** Deterministic borrow/return log (newest first). */
function buildBorrowLog(members: Member[]): CalculatorRecord[] {
  const today = startOfLocalDay(new Date())
  const records: CalculatorRecord[] = []
  let seq = 0

  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const day = addDays(today, -dayOffset)
    const eventCount = 8 + ((dayOffset * 2) % 6)

    for (let index = 0; index < eventCount; index += 1) {
      const member = members[(dayOffset * 4 + index * 3) % members.length]
      const borrowHour = 8 + ((index + dayOffset) % 5)
      const borrowMinute = (index * 9 + dayOffset * 5) % 55
      const borrowedAt = atLocalTime(
        day,
        borrowHour,
        borrowMinute,
        (index * 4) % 50
      )

      seq += 1
      records.push({
        id: `mon-bor-${seq}`,
        memberId: member.id,
        name: member.name,
        college: member.college,
        organization: member.organization,
        type: "Borrow",
        scannedAt: borrowedAt.toISOString(),
        status: "Out",
      })

      // Leave some calculators still out (especially recent borrows).
      const leaveOut = dayOffset === 0 ? index % 4 === 0 : index % 5 === 0
      if (!leaveOut) {
        const returnHour = Math.min(18, borrowHour + 2 + (index % 3))
        const returnMinute = (borrowMinute + 17) % 60
        const returnedAt = atLocalTime(
          day,
          returnHour,
          returnMinute,
          (index * 6) % 50
        )
        seq += 1
        records.push({
          id: `mon-bor-${seq}`,
          memberId: member.id,
          name: member.name,
          college: member.college,
          organization: member.organization,
          type: "Return",
          scannedAt: returnedAt.toISOString(),
          status: "Returned",
        })
      }
    }
  }

  return records.sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )
}

export const MONITORING_ATTENDANCE_LOG: AttendanceRecord[] =
  buildAttendanceLog(MOCK_MEMBERS)

export const MONITORING_BORROW_LOG: CalculatorRecord[] =
  buildBorrowLog(MOCK_MEMBERS)

export function getEmployeeAttendanceStats(
  members: Member[] = MOCK_MEMBERS,
  log: AttendanceRecord[] = MONITORING_ATTENDANCE_LOG,
  reference: Date = new Date()
): EmployeeAttendanceStats[] {
  return members.map((member) => {
    const memberRows = log.filter((row) => row.memberId === member.id)
    const weekRows = memberRows.filter((row) =>
      isInCurrentWeek(row.scannedAt, reference)
    )
    const timeIns = weekRows.filter((row) => row.type === "Time In")

    let presentWeek = 0
    let lateWeek = 0
    for (const row of timeIns) {
      if (row.status === "Present") presentWeek += 1
      else lateWeek += 1
    }

    const lastScanAt =
      memberRows.length === 0
        ? null
        : memberRows.reduce((latest, row) =>
            new Date(row.scannedAt) > new Date(latest.scannedAt) ? row : latest
          ).scannedAt

    return {
      ...member,
      presentWeek,
      lateWeek,
      scanCountWeek: weekRows.length,
      lastScanAt,
    }
  })
}

export function getCurrentlyOutRows(
  log: CalculatorRecord[] = MONITORING_BORROW_LOG
): CurrentlyOutRow[] {
  const outIds = getMembersOut(log)
  const latestBorrow = new Map<string, CalculatorRecord>()

  for (const record of log) {
    if (record.type !== "Borrow") continue
    if (!outIds.has(record.memberId)) continue
    const existing = latestBorrow.get(record.memberId)
    if (!existing || new Date(record.scannedAt) > new Date(existing.scannedAt)) {
      latestBorrow.set(record.memberId, record)
    }
  }

  return [...latestBorrow.values()]
    .map((record) => ({
      memberId: record.memberId,
      name: record.name,
      college: record.college,
      organization: record.organization,
      borrowedAt: record.scannedAt,
    }))
    .sort(
      (a, b) =>
        new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime()
    )
}

export function formatMonitoringDateTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatActivityClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Full merged attendance + borrow timeline (newest first). */
export function getActivityLogs(
  attendanceLog: AttendanceRecord[] = MONITORING_ATTENDANCE_LOG,
  borrowLog: CalculatorRecord[] = MONITORING_BORROW_LOG
): AdminActivityRow[] {
  const attendanceRows: AdminActivityRow[] = attendanceLog.map((row) => ({
    id: `activity-att-${row.id}`,
    time: formatActivityClock(row.scannedAt),
    occurredAt: row.scannedAt,
    actor: row.name,
    memberId: row.memberId,
    kind: "Attendance",
    detail: row.type,
    status: row.status,
  }))

  const borrowRows: AdminActivityRow[] = borrowLog.map((row) => ({
    id: `activity-bor-${row.id}`,
    time: formatActivityClock(row.scannedAt),
    occurredAt: row.scannedAt,
    actor: row.name,
    memberId: row.memberId,
    kind: "Borrow",
    detail:
      row.type === "Borrow"
        ? `Calculator · ${row.college}`
        : `Return · ${row.college}`,
    status: row.status,
  }))

  return [...attendanceRows, ...borrowRows].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

export const ACTIVITY_LOGS: AdminActivityRow[] = getActivityLogs()

export function formatRelativeDuration(
  iso: string,
  now: Date = new Date()
): string {
  const ms = Math.max(0, now.getTime() - new Date(iso).getTime())
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (hours < 24) return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function startOfDay(dateValue: string): Date {
  return new Date(`${dateValue}T00:00:00`)
}

export function endOfDay(dateValue: string): Date {
  return new Date(`${dateValue}T23:59:59.999`)
}

export {
  MEMBER_COLLEGES,
  MEMBER_ORGANIZATIONS,
  type AttendanceRecord,
  type AttendanceStatus,
  type AttendanceType,
  type BorrowStatus,
  type BorrowType,
  type CalculatorRecord,
}
