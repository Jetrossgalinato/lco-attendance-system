import { API_URL } from "@/lib/api"

import {
  getMeta,
  replaceCalculators,
  replaceMembers,
  replaceOpenLoans,
  setMeta,
} from "./db"
import type { DeskSnapshot } from "./types"

type SnapshotApi = {
  generated_at: string
  members: {
    id: string
    name: string
    department: string
    college: string
    organization: string
  }[]
  calculators: { id: string; label: string | null }[]
  open_loans: { member_id: string; calculator_id: string; name: string }[]
}

export async function hasDeskSnapshot(): Promise<boolean> {
  const generatedAt = await getMeta<string>("snapshotGeneratedAt")
  return Boolean(generatedAt)
}

export async function pullDeskSnapshot(): Promise<DeskSnapshot> {
  const response = await fetch(`${API_URL}/sync/desk-snapshot`, {
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(`Failed to load desk snapshot (${response.status})`)
  }
  const row = (await response.json()) as SnapshotApi
  const snapshot: DeskSnapshot = {
    generatedAt: row.generated_at,
    members: row.members.map((member) => ({
      id: member.id,
      name: member.name,
      department: member.department,
      college: member.college,
      organization: member.organization,
    })),
    calculators: row.calculators.map((calculator) => ({
      id: calculator.id,
      label: calculator.label,
    })),
    openLoans: row.open_loans.map((loan) => ({
      memberId: loan.member_id,
      calculatorId: loan.calculator_id,
      name: loan.name,
    })),
  }

  await replaceMembers(snapshot.members)
  await replaceCalculators(snapshot.calculators)
  await replaceOpenLoans(snapshot.openLoans)
  await setMeta("snapshotGeneratedAt", snapshot.generatedAt)
  return snapshot
}

export async function pullDeskSnapshotIfOnline(): Promise<boolean> {
  try {
    await pullDeskSnapshot()
    return true
  } catch {
    return false
  }
}
