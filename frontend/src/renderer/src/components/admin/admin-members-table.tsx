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
  MEMBER_COLLEGES,
  MEMBER_ORGANIZATIONS,
} from "@/data/members"
import type { ManagedMember } from "@/lib/api"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type AdminMembersTableProps = {
  rows: ManagedMember[]
  className?: string
  onAdd: () => void
  onEdit: (member: ManagedMember) => void
  onToggleActive: (member: ManagedMember) => void
  togglingId?: string | null
}

export function AdminMembersTable({
  rows,
  className,
  onAdd,
  onEdit,
  onToggleActive,
  togglingId = null,
}: AdminMembersTableProps) {
  const [search, setSearch] = useState("")
  const [college, setCollege] = useState("all")
  const [organization, setOrganization] = useState("all")
  const [activeFilter, setActiveFilter] = useState("all")
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows
      .filter((row) => {
        if (college !== "all" && row.college !== college) return false
        if (organization !== "all" && row.organization !== organization) {
          return false
        }
        if (activeFilter === "active" && !row.isActive) return false
        if (activeFilter === "inactive" && row.isActive) return false
        if (!query) return true
        return (
          row.name.toLowerCase().includes(query) ||
          row.id.toLowerCase().includes(query) ||
          row.department.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeFilter, college, organization, rows, search])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [search, college, organization, activeFilter, rows.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  const rangeLabel =
    filteredRows.length === 0
      ? "0 members"
      : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}`

  return (
    <section
      className={cn("surface-card flex flex-col overflow-hidden", className)}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-[-0.03em]">Members</h2>
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
              placeholder="Name, ID, or department"
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
              Organization
            </span>
            <MonitoringSelect
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              className="min-w-[10rem]"
            >
              <option value="all">All</option>
              {MEMBER_ORGANIZATIONS.map((value) => (
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
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="w-[8.5rem]"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </MonitoringSelect>
          </label>
          <Button
            type="button"
            className="h-9 cursor-pointer bg-lime text-[#181a17] hover:bg-lime/90"
            onClick={onAdd}
          >
            Add member
          </Button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="flex flex-1 items-center px-5 py-10 text-sm text-muted-foreground">
          No members match these filters.
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs tracking-wide">
                      {row.id}
                    </TableCell>
                    <TableCell className="font-semibold">{row.name}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>{row.college}</TableCell>
                    <TableCell>{row.organization}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "surface-chip inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                          row.isActive
                            ? "bg-lime/40 text-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => onEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant={row.isActive ? "destructive" : "outline"}
                          size="sm"
                          className="cursor-pointer"
                          disabled={togglingId === row.id}
                          onClick={() => onToggleActive(row)}
                        >
                          {row.isActive ? "Deactivate" : "Reactivate"}
                        </Button>
                      </div>
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
