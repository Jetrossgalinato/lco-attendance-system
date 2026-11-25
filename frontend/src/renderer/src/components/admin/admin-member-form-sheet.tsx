import { useEffect, useState, type FormEvent } from "react"

import { MonitoringSelect } from "@/components/admin/monitoring-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  MEMBER_COLLEGES,
  MEMBER_DEPARTMENTS,
  MEMBER_ORGANIZATIONS,
} from "@/data/members"
import type { ManagedMember, MemberWritePayload } from "@/lib/api"

type AdminMemberFormSheetProps = {
  open: boolean
  mode: "create" | "edit"
  member: ManagedMember | null
  defaultId?: string
  submitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: MemberWritePayload) => void | Promise<void>
}

type FormState = {
  id: string
  name: string
  department: string
  college: string
  organization: string
}

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  department: MEMBER_DEPARTMENTS[0] ?? "Worship",
  college: MEMBER_COLLEGES[0] ?? "CCIS",
  organization: MEMBER_ORGANIZATIONS[0] ?? "LCO Core",
}

export function AdminMemberFormSheet({
  open,
  mode,
  member,
  defaultId = "",
  submitting = false,
  onOpenChange,
  onSubmit,
}: AdminMemberFormSheetProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && member) {
      setForm({
        id: member.id,
        name: member.name,
        department: member.department,
        college: member.college,
        organization: member.organization,
      })
      return
    }
    setForm({
      ...EMPTY_FORM,
      id: defaultId,
    })
  }, [defaultId, member, mode, open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      id: mode === "create" ? form.id.trim() : undefined,
      name: form.name.trim(),
      department: form.department,
      college: form.college,
      organization: form.organization,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Add member" : "Edit member"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Create a roster member for attendance scans."
              : "Update member details. ID cannot be changed."}
          </SheetDescription>
        </SheetHeader>

        <form className="flex flex-1 flex-col gap-4 px-4" onSubmit={handleSubmit}>
          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              ID
            </span>
            <Input
              value={form.id}
              onChange={(event) =>
                setForm((current) => ({ ...current, id: event.target.value }))
              }
              disabled={mode === "edit" || submitting}
              className="font-mono tracking-wide"
              required={mode === "create"}
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Name
            </span>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              disabled={submitting}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Department
            </span>
            <MonitoringSelect
              value={form.department}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  department: event.target.value,
                }))
              }
              disabled={submitting}
              className="w-full"
            >
              {MEMBER_DEPARTMENTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </MonitoringSelect>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              College
            </span>
            <MonitoringSelect
              value={form.college}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  college: event.target.value,
                }))
              }
              disabled={submitting}
              className="w-full"
            >
              {MEMBER_COLLEGES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </MonitoringSelect>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Organization
            </span>
            <MonitoringSelect
              value={form.organization}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  organization: event.target.value,
                }))
              }
              disabled={submitting}
              className="w-full"
            >
              {MEMBER_ORGANIZATIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </MonitoringSelect>
          </label>

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="cursor-pointer bg-lime text-[#181a17] hover:bg-lime/90"
              disabled={submitting}
            >
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Add member"
                  : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
