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
import {
  formatScanTime,
  toDateInputValue,
  type AttendanceRecord,
} from "@/data/attendance"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 5

type AttendanceTableProps = {
  records: AttendanceRecord[]
  fromDate: string
  toDate: string
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
}

export function AttendanceTable({
  records,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: AttendanceTableProps) {
  const today = toDateInputValue()
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [fromDate, toDate, records.length])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return records.slice(start, start + PAGE_SIZE)
  }, [page, records])

  const rangeLabel =
    records.length === 0
      ? "0 rows"
      : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, records.length)} of ${records.length}`

  return (
    <section className="surface-card flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-[-0.03em]">Live scans</h2>
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
            onClick={() => {
              onFromDateChange(today)
              onToDateChange(today)
            }}
          >
            Today
          </Button>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="flex-1 px-5 py-10 text-sm text-muted-foreground">
          No scans in this date range.
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Time</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium tabular-nums">
                      {formatScanTime(record.scannedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs tracking-wide">
                      {record.memberId}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {record.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "surface-chip inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                          record.type === "Time In"
                            ? "bg-lime/40 text-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {record.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "surface-chip inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                          record.status === "Present"
                            ? "bg-lime/40 text-foreground"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {record.status}
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
