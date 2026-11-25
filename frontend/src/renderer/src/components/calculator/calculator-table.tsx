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
  formatBorrowTime,
  type CalculatorRecord,
} from "@/data/calculator"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 12

type CalculatorTableProps = {
  records: CalculatorRecord[]
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

export function CalculatorTable({ records }: CalculatorTableProps) {
  const today = toDateInputValue(new Date())
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [page, setPage] = useState(1)

  const filteredRecords = useMemo(() => {
    const from = fromDate ? startOfDay(fromDate).getTime() : null
    const to = toDate ? endOfDay(toDate).getTime() : null

    return records.filter((record) => {
      const scanned = new Date(record.scannedAt).getTime()
      if (from !== null && scanned < from) return false
      if (to !== null && scanned > to) return false
      return true
    })
  }, [fromDate, records, toDate])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))

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
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, page])

  const rangeLabel =
    filteredRecords.length === 0
      ? "0 rows"
      : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredRecords.length)} of ${filteredRecords.length}`

  return (
    <section className="surface-card flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-[-0.03em]">Live borrows</h2>
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

      {filteredRecords.length === 0 ? (
        <p className="flex-1 px-5 py-10 text-sm text-muted-foreground">
          No borrows in this date range.
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
                  <TableHead>Calculator</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium tabular-nums">
                      {formatBorrowTime(record.scannedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs tracking-wide">
                      {record.memberId}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {record.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs tracking-wide">
                      {record.calculatorId}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "surface-chip inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                          record.type === "Borrow"
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
                          record.status === "Out"
                            ? "bg-lime/40 text-foreground"
                            : "bg-muted text-foreground"
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
