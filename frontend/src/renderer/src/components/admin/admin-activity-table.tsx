import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
import { cn } from "@/lib/utils"

const PAGE_SIZE = 5

type AdminActivityTableProps = {
  rows: AdminActivityRow[]
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfDay(dateValue: string): Date {
  return new Date(`${dateValue}T00:00:00`)
}

function endOfDay(dateValue: string): Date {
  return new Date(`${dateValue}T23:59:59.999`)
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

export function AdminActivityTable({ rows }: AdminActivityTableProps) {
  const today = toDateInputValue(new Date())
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const from = fromDate ? startOfDay(fromDate).getTime() : null
    const to = toDate ? endOfDay(toDate).getTime() : null

    return rows.filter((row) => {
      const occurred = new Date(row.occurredAt).getTime()
      if (from !== null && occurred < from) return false
      if (to !== null && occurred > to) return false
      return true
    })
  }, [fromDate, rows, toDate])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [fromDate, toDate, rows.length])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  const rangeLabel =
    filteredRows.length === 0
      ? "0 rows"
      : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}`

  return (
    <section className="surface-card flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-[-0.03em]">Recent activity</h2>
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {rangeLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <label className="w-fit space-y-1">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              From
            </span>
            <Input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
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
              onChange={(event) => setToDate(event.target.value)}
              className="block h-9 w-[9.5rem] cursor-pointer px-2"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer"
            onClick={() => {
              setFromDate(today)
              setToDate(today)
            }}
          >
            Today
          </Button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="px-5 py-10 text-sm text-muted-foreground">
          No activity in this date range.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Time</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium tabular-nums">
                    {row.time}
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
