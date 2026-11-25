import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { MonitoringSelect } from "@/components/admin/monitoring-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminActivityRow } from "@/data/admin"
import { formatMonitoringDateTime } from "@/data/admin-monitoring"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type AdminActivityLogsTableProps = {
  rows: AdminActivityRow[]
  fromDate: string
  toDate: string
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  onTodayClick: () => void
}

function statusClass(status: string): string {
  switch (status) {
    case "Present":
    case "Out":
      return "bg-lime/40 text-foreground"
    case "Late":
      return "bg-destructive/10 text-destructive"
    case "Returned":
      return "bg-muted text-foreground"
    default:
      return "bg-muted text-foreground"
  }
}

export function AdminActivityLogsTable({
  rows,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onTodayClick,
}: AdminActivityLogsTableProps) {
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (!query) return true
      return (
        row.actor.toLowerCase().includes(query) ||
        (row.memberId?.toLowerCase().includes(query) ?? false) ||
        row.detail.toLowerCase().includes(query)
      )
    })
  }, [kindFilter, rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [fromDate, toDate, search, kindFilter, statusFilter, rows.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  const rangeLabel =
    filteredRows.length === 0
      ? "0 records"
      : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}`

  return (
    <section className="surface-card flex flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-[-0.03em]">All activity</h2>
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {rangeLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <label className="min-w-[12rem] flex-1 space-y-1 sm:max-w-[16rem]">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Search
            </span>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or ID"
              className="h-9"
            />
          </label>
          <label className="w-fit space-y-1">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Kind
            </span>
            <MonitoringSelect
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
              className="w-[9.5rem]"
            >
              <option value="all">All</option>
              <option value="Attendance">Attendance</option>
              <option value="Borrow">Borrow</option>
            </MonitoringSelect>
          </label>
          <label className="w-fit space-y-1">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Status
            </span>
            <MonitoringSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-[9.5rem]"
            >
              <option value="all">All</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Out">Out</option>
              <option value="Returned">Returned</option>
            </MonitoringSelect>
          </label>
          <label className="w-fit space-y-1">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              From
            </span>
            <Input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => onFromDateChange(event.target.value)}
              className="block h-9 w-[9.5rem] cursor-pointer px-2"
            />
          </label>
          <label className="w-fit space-y-1">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              To
            </span>
            <Input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => onToDateChange(event.target.value)}
              className="block h-9 w-[9.5rem] cursor-pointer px-2"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={onTodayClick}
          >
            Today
          </Button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="px-5 py-10 text-sm text-muted-foreground">
          No activity matches these filters.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Time</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium tabular-nums">
                      {formatMonitoringDateTime(row.occurredAt)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.memberId ?? "—"}
                    </TableCell>
                    <TableCell className="font-semibold">{row.actor}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "surface-chip inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                          row.kind === "Attendance"
                            ? "bg-lime/40 text-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {row.kind}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.detail}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "surface-chip inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                          statusClass(row.status)
                        )}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/80 px-5 py-3.5">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
