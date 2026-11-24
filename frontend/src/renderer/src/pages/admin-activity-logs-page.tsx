import { AdminActivityLogsTable } from "@/components/admin/admin-activity-logs-table"
import { ACTIVITY_LOGS } from "@/data/admin-monitoring"

export function AdminActivityLogsPage() {
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

      <AdminActivityLogsTable rows={ACTIVITY_LOGS} />
    </main>
  )
}
