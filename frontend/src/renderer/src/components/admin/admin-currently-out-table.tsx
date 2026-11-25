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
import {
  formatMonitoringDateTime,
  formatRelativeDuration,
  MEMBER_COLLEGES,
  type CurrentlyOutRow,
  type LoanMonitorStatus,
} from "@/data/admin-monitoring"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type AdminCurrentlyOutTableProps = {
  rows: CurrentlyOutRow[]
  className?: string
}

export function AdminCurrentlyOutTable({
  rows,
  className,
}: AdminCurrentlyOutTableProps) {
  const [search, setSearch] = useState("")
  const [college, setCollege] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | LoanMonitorStatus>(
    "all"
  )
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (college !== "all" && row.college !== college) return false
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (!query) return true
      return (
        row.name.toLowerCase().includes(query) ||
        row.memberId.toLowerCase().includes(query) ||
        row.organization.toLowerCase().includes(query)
      )
    })
  }, [college, rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [search, college, statusFilter, rows.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  const rangeLabel =
    filteredRows.length === 0
      ? "0 loans"
      : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}`

  return (
    <section
      className={cn("surface-card flex flex-col overflow-hidden", className)}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-[-0.03em]">Loans</h2>
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
              College
            </span>
            <MonitoringSelect
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              className="w-[8.5rem]"
            >
              <option value="all">All</option>
              {MEMBER_COLLEGES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </MonitoringSelect>
          </label>
          <label className="w-fit space-y-1">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Status
            </span>
            <MonitoringSelect
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | LoanMonitorStatus
                )
              }
              className="min-w-[9.5rem]"
            >
              <option value="all">All</option>
              <option value="Not Returned">Not Returned</option>
              <option value="Returned">Returned</option>
            </MonitoringSelect>
          </label>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="flex flex-1 items-center px-5 py-10 text-sm text-muted-foreground">
          No loans match these filters.
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Member ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Borrowed at</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.memberId}>
                    <TableCell className="font-medium tabular-nums">
                      {row.memberId}
                    </TableCell>
                    <TableCell className="font-semibold">{row.name}</TableCell>
                    <TableCell>{row.college}</TableCell>
                    <TableCell>{row.organization}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatMonitoringDateTime(row.borrowedAt)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatRelativeDuration(row.borrowedAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "surface-chip inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                          row.status === "Returned"
                            ? "bg-lime/40 text-foreground"
                            : "bg-destructive/10 text-destructive"
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
