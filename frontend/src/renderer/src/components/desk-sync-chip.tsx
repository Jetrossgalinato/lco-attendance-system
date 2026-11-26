import type { DeskSyncStatus } from "@/lib/offline/types"
import { cn } from "@/lib/utils"

type DeskSyncChipProps = {
  status: DeskSyncStatus
  className?: string
}

export function DeskSyncChip({ status, className }: DeskSyncChipProps) {
  let label = "Online"
  if (!status.hasSnapshot && !status.online) {
    label = "Offline · no roster"
  } else if (status.syncing) {
    label = `Syncing… · ${status.pendingCount} pending`
  } else if (!status.online && status.pendingCount > 0) {
    label = `Offline · ${status.pendingCount} pending`
  } else if (!status.online) {
    label = "Offline"
  } else if (status.pendingCount > 0) {
    label = `Online · ${status.pendingCount} pending`
  } else if (status.lastError) {
    label = "Online · sync conflict"
  }

  return (
    <p
      className={cn(
        "text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase",
        className
      )}
      title={status.lastError ?? undefined}
    >
      {label}
    </p>
  )
}
