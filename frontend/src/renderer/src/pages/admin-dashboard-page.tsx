import {
  AttendanceStatusChart,
  BorrowsByCollegeChart,
  TopOrganizationsChart,
  WeeklyAttendanceChart,
} from "@/components/admin/admin-charts"
import { AdminActivityTable } from "@/components/admin/admin-activity-table"
import { AdminKpiCards } from "@/components/admin/admin-kpi-cards"
import {
  ADMIN_KPIS,
  ATTENDANCE_STATUS,
  BORROWS_BY_COLLEGE,
  RECENT_ACTIVITY,
  TOP_ORGANIZATIONS,
  WEEKLY_ATTENDANCE,
} from "@/data/admin"

export function AdminDashboardPage() {
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
          Live overview from this session’s mock data.
        </p>
      </header>

      <AdminKpiCards kpis={ADMIN_KPIS} />

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <WeeklyAttendanceChart data={WEEKLY_ATTENDANCE} />
        <BorrowsByCollegeChart data={BORROWS_BY_COLLEGE} />
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
        <AttendanceStatusChart data={ATTENDANCE_STATUS} />
        <TopOrganizationsChart data={TOP_ORGANIZATIONS} />
      </div>

      <AdminActivityTable rows={RECENT_ACTIVITY} />
    </main>
  )
}
