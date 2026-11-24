export type AttendanceStatus = "Present" | "Late"
export type AttendanceType = "Time In" | "Time Out"

export const SCAN_COOLDOWN_MS = 1500
/** How long "Reading…" / success-error strip stay visible after a scan. */
export const SCAN_FEEDBACK_MS = 1600

export type AttendanceRecord = {
  id: string
  memberId: string
  name: string
  department: string
  type: AttendanceType
  scannedAt: string
  status: AttendanceStatus
}

export type AttendanceSummary = {
  present: number
  late: number
  total: number
  rate: number
}

export type AttendanceRank = {
  memberId: string
  name: string
  department: string
  count: number
}

export function formatScanTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function toDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
