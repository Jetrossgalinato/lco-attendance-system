import { useCallback, useEffect, useState } from "react"

import { AdminCurrentlyOutTable } from "@/components/admin/admin-currently-out-table"
import { Button } from "@/components/ui/button"
import type { CurrentlyOutRow } from "@/data/admin-monitoring"
import { fetchBorrowCurrentlyOut } from "@/lib/api"

export function AdminBorrowingMonitoringPage() {
  const [currentlyOut, setCurrentlyOut] = useState<CurrentlyOutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCurrentlyOut = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchBorrowCurrentlyOut()
      setCurrentlyOut(rows)
    } catch (err) {
      setCurrentlyOut([])
      setError(
        err instanceof Error ? err.message : "Failed to load currently out."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCurrentlyOut()
  }, [loadCurrentlyOut])

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

      {error ? (
        <div className="surface-card flex flex-col items-start gap-3 px-5 py-6">
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void loadCurrentlyOut()}
          >
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="surface-card px-5 py-10">
          <p className="text-sm text-muted-foreground">Loading currently out…</p>
        </div>
      ) : (
        <AdminCurrentlyOutTable
          rows={currentlyOut}
          className="min-h-0 flex-1"
        />
      )}
    </main>
  )
}
