import { useCallback, useEffect, useState } from "react"

import {
  AttendanceStatusChart,
  BorrowsByCollegeChart,
  TopOrganizationsChart,
  WeeklyAttendanceChart,
} from "@/components/admin/admin-charts"
import { AdminActivityTable } from "@/components/admin/admin-activity-table"
import { AdminKpiCards } from "@/components/admin/admin-kpi-cards"
import { Button } from "@/components/ui/button"
import type { AdminActivityRow, AdminDashboardData } from "@/data/admin"
import { weekToDateRange } from "@/data/attendance"
import { fetchAdminActivity, fetchAdminDashboard } from "@/lib/api"

const RECENT_ACTIVITY_LIMIT = 10

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [activity, setActivity] = useState<AdminActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    const rankingRange = weekToDateRange()
    try {
      const [nextDashboard, nextActivity] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminActivity(rankingRange),
      ])
      setDashboard(nextDashboard)
      setActivity(nextActivity.slice(0, RECENT_ACTIVITY_LIMIT))
    } catch (err) {
      setDashboard(null)
      setActivity([])
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-2 py-4 sm:px-4 md:px-6 md:py-6">
      <header className="space-y-2.5">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Admin · Overview
        </p>
        <h1 className="text-4xl font-black tracking-[-0.05em] text-foreground md:text-5xl">
          Admin Dashboard
        </h1>
        <p className="font-serif max-w-2xl text-lg text-foreground/80 italic">
          Live overview from attendance and borrowing.
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
            onClick={() => void loadDashboard()}
          >
            Retry
          </Button>
        </div>
      ) : loading || !dashboard ? (
        <div className="surface-card px-5 py-10">
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      ) : (
        <>
          <AdminKpiCards kpis={dashboard.kpis} />

          <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <WeeklyAttendanceChart data={dashboard.weeklyAttendance} />
            <BorrowsByCollegeChart data={dashboard.borrowsByCollege} />
          </div>

          <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
            <AttendanceStatusChart data={dashboard.attendanceStatus} />
            <TopOrganizationsChart data={dashboard.topOrganizations} />
          </div>

          <AdminActivityTable rows={activity} />
        </>
      )}
    </main>
  )
}
