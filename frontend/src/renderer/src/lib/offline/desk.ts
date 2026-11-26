import type { AttendanceType } from "@/data/attendance"
import type { BorrowType } from "@/data/calculator"
import {
  createAttendanceScan,
  createBorrowScan,
  type BorrowScanCreateResult,
  type ScanCreateResult,
} from "@/lib/api"

import { applyAttendanceOffline, applyBorrowOffline } from "./apply"
import { probeApiHealth } from "./connectivity"
import { getLocalAttendance, getLocalBorrows, getOutboxItems } from "./db"
import { hasDeskSnapshot, pullDeskSnapshotIfOnline } from "./snapshot"
import { drainOutbox } from "./sync-worker"
import type {
  DeskSyncStatus,
  LocalAttendanceRecord,
  LocalBorrowRecord,
} from "./types"

export async function getDeskSyncStatus(): Promise<DeskSyncStatus> {
  const outbox = await getOutboxItems()
  const pendingCount = outbox.filter(
    (item) => item.status === "pending" || item.status === "syncing"
  ).length
  const failed = outbox.find((item) => item.status === "failed")
  return {
    online: await probeApiHealth(),
    pendingCount,
    syncing: outbox.some((item) => item.status === "syncing"),
    lastError: failed?.lastError ?? null,
    hasSnapshot: await hasDeskSnapshot(),
  }
}

export async function ensureDeskSnapshot(): Promise<boolean> {
  if (await hasDeskSnapshot()) {
    void pullDeskSnapshotIfOnline()
    return true
  }
  return pullDeskSnapshotIfOnline()
}

export async function recordAttendanceScan(
  memberId: string,
  type: AttendanceType
): Promise<ScanCreateResult & { offline?: boolean }> {
  const onlineResult = await createAttendanceScan(memberId, type)
  if (onlineResult.ok) {
    void pullDeskSnapshotIfOnline()
    void drainOutbox()
    return onlineResult
  }
  if (!onlineResult.network) {
    return onlineResult
  }

  if (!(await hasDeskSnapshot())) {
    return {
      ok: false,
      message:
        "Connect once to download the roster before recording offline scans.",
      network: true,
    }
  }

  const offline = await applyAttendanceOffline(memberId, type)
  if (!offline.ok) {
    return { ok: false, message: offline.message }
  }
  return { ok: true, record: offline.record, offline: true }
}

export async function recordBorrowScan(
  memberId: string,
  type: BorrowType,
  calculatorId: string
): Promise<BorrowScanCreateResult & { offline?: boolean }> {
  const onlineResult = await createBorrowScan(memberId, type, calculatorId)
  if (onlineResult.ok) {
    void pullDeskSnapshotIfOnline()
    void drainOutbox()
    return onlineResult
  }
  if (!onlineResult.network) {
    return onlineResult
  }

  if (!(await hasDeskSnapshot())) {
    return {
      ok: false,
      message:
        "Connect once to download the roster before recording offline scans.",
      network: true,
    }
  }

  const offline = await applyBorrowOffline(memberId, type, calculatorId)
  if (!offline.ok) {
    return { ok: false, message: offline.message }
  }
  return { ok: true, record: offline.record, offline: true }
}

export function mergeAttendanceRecords(
  server: LocalAttendanceRecord[],
  local: LocalAttendanceRecord[]
): LocalAttendanceRecord[] {
  const byId = new Map<string, LocalAttendanceRecord>()
  for (const row of server) byId.set(row.id, row)
  for (const row of local) byId.set(row.id, { ...row, pending: true })
  return [...byId.values()].sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )
}

export function mergeBorrowRecords(
  server: LocalBorrowRecord[],
  local: LocalBorrowRecord[]
): LocalBorrowRecord[] {
  const byId = new Map<string, LocalBorrowRecord>()
  for (const row of server) byId.set(row.id, row)
  for (const row of local) byId.set(row.id, { ...row, pending: true })
  return [...byId.values()].sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )
}

export async function loadMergedAttendance(
  server: LocalAttendanceRecord[]
): Promise<LocalAttendanceRecord[]> {
  const local = await getLocalAttendance()
  return mergeAttendanceRecords(server, local)
}

export async function loadMergedBorrows(
  server: LocalBorrowRecord[]
): Promise<LocalBorrowRecord[]> {
  const local = await getLocalBorrows()
  return mergeBorrowRecords(server, local)
}

export { drainOutbox, pullDeskSnapshotIfOnline, getLocalAttendance, getLocalBorrows }
