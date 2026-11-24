import { useMemo } from "react"

import { AdminCurrentlyOutTable } from "@/components/admin/admin-currently-out-table"
import { getCurrentlyOutRows } from "@/data/admin-monitoring"

export function AdminBorrowingMonitoringPage() {
  const currentlyOut = useMemo(() => getCurrentlyOutRows(), [])

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-2 py-4 sm:px-4 md:px-6 md:py-6">
      <header className="shrink-0 space-y-2.5">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Admin · Borrowing
        </p>
        <h1 className="text-4xl font-black tracking-[-0.05em] text-foreground md:text-5xl">
          Borrowing Monitoring
        </h1>
        <p className="font-serif max-w-2xl text-lg text-foreground/80 italic">
          Calculator loans currently out across LCO.
        </p>
      </header>

      <AdminCurrentlyOutTable rows={currentlyOut} className="min-h-0 flex-1" />
    </main>
  )
}
