import { useCallback, useEffect, useState } from "react"

import { AdminMemberFormSheet } from "@/components/admin/admin-member-form-sheet"
import { AdminMembersTable } from "@/components/admin/admin-members-table"
import { useAlert } from "@/components/alert-provider"
import { Button } from "@/components/ui/button"
import {
  createMember,
  fetchMembers,
  fetchNextMemberId,
  updateMember,
  type ManagedMember,
  type MemberWritePayload,
} from "@/lib/api"

export function AdminMembersPage() {
  const { showAlert } = useAlert()
  const [members, setMembers] = useState<ManagedMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<ManagedMember | null>(null)
  const [nextId, setNextId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchMembers("all")
      setMembers(rows)
    } catch (err) {
      setMembers([])
      setError(err instanceof Error ? err.message : "Failed to load members.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  async function openCreate() {
    setSheetMode("create")
    setEditing(null)
    try {
      const id = await fetchNextMemberId()
      setNextId(id)
    } catch {
      setNextId("")
    }
    setSheetOpen(true)
  }

  function openEdit(member: ManagedMember) {
    setSheetMode("edit")
    setEditing(member)
    setNextId("")
    setSheetOpen(true)
  }

  async function handleSubmit(payload: MemberWritePayload) {
    setSubmitting(true)
    try {
      if (sheetMode === "create") {
        const created = await createMember(payload)
        setMembers((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name))
        )
        showAlert({
          tone: "success",
          title: "Member added",
          message: `${created.name} (${created.id}) is on the roster.`,
        })
      } else if (editing) {
        const updated = await updateMember(editing.id, {
          name: payload.name,
          department: payload.department,
          college: payload.college,
          organization: payload.organization,
        })
        setMembers((current) =>
          current
            .map((row) => (row.id === updated.id ? updated : row))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
        showAlert({
          tone: "success",
          title: "Member updated",
          message: `${updated.name} was saved.`,
        })
      }
      setSheetOpen(false)
    } catch (err) {
      showAlert({
        tone: "error",
        title: sheetMode === "create" ? "Could not add member" : "Could not save",
        message: err instanceof Error ? err.message : "Something went wrong.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(member: ManagedMember) {
    setTogglingId(member.id)
    try {
      const updated = await updateMember(member.id, {
        is_active: !member.isActive,
      })
      setMembers((current) =>
        current.map((row) => (row.id === updated.id ? updated : row))
      )
      showAlert({
        tone: "success",
        title: updated.isActive ? "Member reactivated" : "Member deactivated",
        message: updated.isActive
          ? `${updated.name} can scan again.`
          : `${updated.name} can no longer scan.`,
      })
    } catch (err) {
      showAlert({
        tone: "error",
        title: "Could not update status",
        message: err instanceof Error ? err.message : "Something went wrong.",
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-2 py-4 sm:px-4 md:px-6 md:py-6">
      <header className="shrink-0 space-y-2.5">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Admin · Members
        </p>
        <h1 className="text-4xl font-black tracking-[-0.05em] text-foreground md:text-5xl">
          Manage Members
        </h1>
        <p className="font-serif max-w-2xl text-lg text-foreground/80 italic">
          Add, edit, or deactivate people on the LCO attendance roster.
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
            onClick={() => void loadMembers()}
          >
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="surface-card px-5 py-10">
          <p className="text-sm text-muted-foreground">Loading members…</p>
        </div>
      ) : (
        <AdminMembersTable
          rows={members}
          className="min-h-0 flex-1"
          onAdd={() => void openCreate()}
          onEdit={openEdit}
          onToggleActive={(member) => void handleToggleActive(member)}
          togglingId={togglingId}
        />
      )}

      <AdminMemberFormSheet
        open={sheetOpen}
        mode={sheetMode}
        member={editing}
        defaultId={nextId}
        submitting={submitting}
        onOpenChange={setSheetOpen}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
