import { useCallback, useEffect, useState } from "react"

import { AdminActivityLogsTable } from "@/components/admin/admin-activity-logs-table"
import { Button } from "@/components/ui/button"
import type { AdminActivityRow } from "@/data/admin"
import { toDateInputValue } from "@/data/admin-monitoring"
import { fetchAdminActivity } from "@/lib/api"

export function AdminActivityLogsPage() {
  const today = toDateInputValue(new Date())
  const weekAgo = toDateInputValue(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  )

  const [fromDate, setFromDate] = useState(weekAgo)
  const [toDate, setToDate] = useState(today)
  const [rows, setRows] = useState<AdminActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadActivity = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchAdminActivity({ from, to })
      setRows(next)
    } catch (err) {
      setRows([])
      setError(
        err instanceof Error ? err.message : "Failed to load activity logs."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadActivity(fromDate, toDate)
  }, [fromDate, toDate, loadActivity])

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-2 py-4 sm:px-4 md:px-6 md:py-6">
      <header className="space-y-2.5">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Admin · Activity
        </p>
        <h1 className="text-4xl font-black tracking-[-0.05em] text-foreground md:text-5xl">
          Activity Logs
        </h1>
        <p className="font-serif max-w-2xl text-lg text-foreground/80 italic">
          Combined attendance and borrowing history in one timeline.
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
            onClick={() => void loadActivity(fromDate, toDate)}
          >
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="surface-card px-5 py-10">
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        </div>
      ) : (
        <AdminActivityLogsTable
          rows={rows}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onTodayClick={() => {
            const nextToday = toDateInputValue(new Date())
            setFromDate(nextToday)
            setToDate(nextToday)
          }}
        />
      )}
    </main>
  )
}
