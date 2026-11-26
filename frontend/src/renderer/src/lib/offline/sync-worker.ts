import { createAttendanceScan, createBorrowScan } from "@/lib/api"

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

/** Server already has equivalent state — safe to drop the outbox item. */
function isAlreadyAppliedConflict(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("already has") ||
    lower.includes("already checked out") ||
    lower.includes("already recorded") ||
    lower.includes("has nothing to return")
  )
}

async function markResolved(item: OutboxItem): Promise<void> {
  await deleteOutboxItem(item.id)
  if (item.kind === "attendance") {
    await deleteLocalAttendance(item.id)
  } else {
    await deleteLocalBorrow(item.id)
  }
}

async function syncOne(
  item: OutboxItem
): Promise<"ok" | "conflict" | "network"> {
  const next: OutboxItem = { ...item, status: "syncing", lastError: undefined }
  await putOutboxItem(next)

  if (item.kind === "attendance") {
    const payload = item.payload as AttendanceOutboxPayload
    const result = await createAttendanceScan(payload.memberId, payload.type, {
      clientId: item.id,
      scannedAt: payload.scannedAt,
    })
    if (result.ok) {
      await markResolved(item)
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
    if (isAlreadyAppliedConflict(result.message)) {
      await markResolved(item)
      return "ok"
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
    await markResolved(item)
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
  if (isAlreadyAppliedConflict(result.message)) {
    await markResolved(item)
    return "ok"
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
    // Retry previously failed items too (they used to stick forever).
    for (const item of items) {
      if (item.status === "failed") {
        await putOutboxItem({ ...item, status: "pending", lastError: undefined })
      }
    }

    const queue = await getOutboxItems()
    for (const item of queue) {
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

    const remaining = await getOutboxItems()
    const unfinished = remaining.some(
      (row) =>
        row.status === "pending" ||
        row.status === "syncing" ||
        row.status === "failed"
    )
    if (!unfinished) {
      await clearLocalAttendance()
      await clearLocalBorrows()
    }
  } finally {
    syncing = false
    emitStatus()
  }

  return { synced, failed, errors }
}

/** Drop all failed outbox rows (user-facing dismiss / cleanup). */
export async function clearFailedOutbox(): Promise<void> {
  const items = await getOutboxItems()
  for (const item of items) {
    if (item.status !== "failed") continue
    await markResolved(item)
  }
  emitStatus()
}
