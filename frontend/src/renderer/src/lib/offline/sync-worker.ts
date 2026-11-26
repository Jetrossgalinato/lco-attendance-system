import {
  createAttendanceScan,
  createBorrowScan,
} from "@/lib/api"

import { probeApiHealth } from "./connectivity"
import {
  clearLocalAttendance,
  clearLocalBorrows,
  deleteLocalAttendance,
  deleteLocalBorrow,
  deleteOutboxItem,
  getOutboxItems,
  putOutboxItem,
} from "./db"
import { pullDeskSnapshot } from "./snapshot"
import type {
  AttendanceOutboxPayload,
  BorrowOutboxPayload,
  OutboxItem,
} from "./types"

let syncing = false
const statusListeners = new Set<() => void>()

export function isSyncing(): boolean {
  return syncing
}

export function subscribeSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

function emitStatus() {
  for (const listener of statusListeners) listener()
}

async function syncOne(item: OutboxItem): Promise<"ok" | "conflict" | "network"> {
  const next: OutboxItem = { ...item, status: "syncing" }
  await putOutboxItem(next)

  if (item.kind === "attendance") {
    const payload = item.payload as AttendanceOutboxPayload
    const result = await createAttendanceScan(payload.memberId, payload.type, {
      clientId: item.id,
      scannedAt: payload.scannedAt,
    })
    if (result.ok) {
      await deleteOutboxItem(item.id)
      await deleteLocalAttendance(item.id)
      return "ok"
    }
    if (result.network) {
      await putOutboxItem({
        ...item,
        status: "pending",
        lastError: result.message,
      })
      return "network"
    }
    await putOutboxItem({
      ...item,
      status: "failed",
      lastError: result.message,
    })
    return "conflict"
  }

  const payload = item.payload as BorrowOutboxPayload
  const result = await createBorrowScan(
    payload.memberId,
    payload.type,
    payload.calculatorId,
    { clientId: item.id, scannedAt: payload.scannedAt }
  )
  if (result.ok) {
    await deleteOutboxItem(item.id)
    await deleteLocalBorrow(item.id)
    return "ok"
  }
  if (result.network) {
    await putOutboxItem({
      ...item,
      status: "pending",
      lastError: result.message,
    })
    return "network"
  }
  await putOutboxItem({
    ...item,
    status: "failed",
    lastError: result.message,
  })
  return "conflict"
}

export async function drainOutbox(): Promise<{
  synced: number
  failed: number
  errors: string[]
}> {
  if (syncing) {
    return { synced: 0, failed: 0, errors: [] }
  }
  syncing = true
  emitStatus()

  let synced = 0
  let failed = 0
  const errors: string[] = []

  try {
    const online = await probeApiHealth()
    if (!online) {
      return { synced, failed, errors }
    }

    const items = await getOutboxItems()
    for (const item of items) {
      if (item.status === "failed") continue
      const outcome = await syncOne(item)
      if (outcome === "ok") {
        synced += 1
      } else if (outcome === "conflict") {
        failed += 1
        const refreshed = (await getOutboxItems()).find((row) => row.id === item.id)
        if (refreshed?.lastError) errors.push(refreshed.lastError)
      } else {
        break
      }
    }

    if (synced > 0 || failed > 0) {
      try {
        await pullDeskSnapshot()
      } catch {
        // keep previous cache
      }
    }

    // Drop successfully synced locals already deleted; clear leftover locals if outbox empty of pending
    const remaining = await getOutboxItems()
    const pendingLeft = remaining.some(
      (row) => row.status === "pending" || row.status === "syncing"
    )
    if (!pendingLeft) {
      await clearLocalAttendance()
      await clearLocalBorrows()
    }
  } finally {
    syncing = false
    emitStatus()
  }

  return { synced, failed, errors }
}
