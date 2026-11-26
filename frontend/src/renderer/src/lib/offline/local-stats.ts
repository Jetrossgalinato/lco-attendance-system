import type {
  AttendanceRank,
  AttendanceRecord,
  AttendanceSummary,
} from "@/data/attendance"
import type {
  CalculatorRecord,
  CalculatorSummary,
  GroupRank,
} from "@/data/calculator"
import { COLLEGE_ORDER } from "@/data/calculator"
import { getAllOpenLoans } from "./db"

function isSameLocalDay(iso: string, day = new Date()): boolean {
  const date = new Date(iso)
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  )
}

export function summarizeAttendanceLocal(
  records: AttendanceRecord[]
): AttendanceSummary {
  const unique = new Map<string, AttendanceRecord["status"]>()
  for (const row of records) {
    if (!unique.has(row.memberId)) {
      unique.set(row.memberId, row.status)
    }
  }
  let present = 0
  let late = 0
  for (const status of unique.values()) {
    if (status === "Present") present += 1
    else late += 1
  }
  const total = unique.size
  return {
    present,
    late,
    total,
    rate: total === 0 ? 0 : Math.round((present / total) * 100),
  }
}

export function rankAttendanceLocal(
  records: AttendanceRecord[],
  limit = 5
): AttendanceRank[] {
  const counts = new Map<string, AttendanceRank>()
  for (const row of records) {
    const existing = counts.get(row.memberId)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(row.memberId, {
        memberId: row.memberId,
        name: row.name,
        department: row.department,
        count: 1,
      })
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export async function summarizeBorrowsLocal(
  records: CalculatorRecord[]
): Promise<CalculatorSummary> {
  const openLoans = await getAllOpenLoans()
  let borrowedToday = 0
  let returnedToday = 0
  for (const row of records) {
    if (!isSameLocalDay(row.scannedAt)) continue
    if (row.type === "Borrow") borrowedToday += 1
    else returnedToday += 1
  }
  return {
    outNow: openLoans.length,
    borrowedToday,
    returnedToday,
    returnRate:
      borrowedToday === 0
        ? 0
        : Math.round((returnedToday / borrowedToday) * 100),
  }
}

export function rankBorrowsByCollegeLocal(
  records: CalculatorRecord[]
): GroupRank[] {
  const counts = Object.fromEntries(COLLEGE_ORDER.map((name) => [name, 0])) as Record<
    string,
    number
  >
  for (const row of records) {
    if (row.type !== "Borrow") continue
    if (row.college in counts) counts[row.college] += 1
  }
  return COLLEGE_ORDER.map((name) => ({
    key: name,
    label: name,
    count: counts[name] ?? 0,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function rankBorrowsByOrgLocal(
  records: CalculatorRecord[],
  limit = 5
): GroupRank[] {
  const counts = new Map<string, number>()
  for (const row of records) {
    if (row.type !== "Borrow") continue
    counts.set(row.organization, (counts.get(row.organization) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}
