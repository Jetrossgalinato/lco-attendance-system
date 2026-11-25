import { findMemberById, type Member } from "./members"

export type BorrowType = "Borrow" | "Return"
export type BorrowStatus = "Out" | "Returned"

export const SCAN_COOLDOWN_MS = 1500

export type CalculatorRecord = {
  id: string
  memberId: string
  calculatorId: string
  name: string
  college: string
  organization: string
  type: BorrowType
  scannedAt: string
  status: BorrowStatus
}

export type CalculatorSummary = {
  outNow: number
  borrowedToday: number
  returnedToday: number
  returnRate: number
}

export type GroupRank = {
  key: string
  label: string
  count: number
}

let scanSeq = 0

export function createBorrowId(): string {
  scanSeq += 1
  return `borrow-${Date.now()}-${scanSeq}`
}

export function formatBorrowTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function isSameLocalDay(iso: string, day: Date = new Date()): boolean {
  const date = new Date(iso)
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  )
}

/** Latest event per member determines whether they currently have a calculator out. */
export function getMembersOut(records: CalculatorRecord[]): Set<string> {
  const latest = new Map<string, CalculatorRecord>()
  for (const record of records) {
    const existing = latest.get(record.memberId)
    if (!existing) {
      latest.set(record.memberId, record)
      continue
    }
    if (new Date(record.scannedAt) > new Date(existing.scannedAt)) {
      latest.set(record.memberId, record)
    }
  }

  const out = new Set<string>()
  for (const [memberId, record] of latest) {
    if (record.type === "Borrow") out.add(memberId)
  }
  return out
}

export function recordFromMember(
  member: Member,
  type: BorrowType,
  scannedAt: Date = new Date(),
  calculatorId = "CALC-01"
): CalculatorRecord {
  return {
    id: createBorrowId(),
    memberId: member.id,
    calculatorId,
    name: member.name,
    college: member.college,
    organization: member.organization,
    type,
    scannedAt: scannedAt.toISOString(),
    status: type === "Borrow" ? "Out" : "Returned",
  }
}

export function summarizeCalculator(
  records: CalculatorRecord[]
): CalculatorSummary {
  const outNow = getMembersOut(records).size

  let borrowedToday = 0
  let returnedToday = 0
  for (const record of records) {
    if (!isSameLocalDay(record.scannedAt)) continue
    if (record.type === "Borrow") borrowedToday += 1
    else returnedToday += 1
  }

  const returnRate =
    borrowedToday === 0
      ? 0
      : Math.round((returnedToday / borrowedToday) * 100)

  return { outNow, borrowedToday, returnedToday, returnRate }
}

/** Fixed college set shown in ranking. */
export const COLLEGE_ORDER = [
  "CCIS",
  "COFES",
  "CED",
  "CMNS",
  "CEGS",
] as const

function rankByField(
  records: CalculatorRecord[],
  field: "college" | "organization",
  limit = 5
): GroupRank[] {
  const counts = new Map<string, number>()

  for (const record of records) {
    if (record.type !== "Borrow") continue
    const key = record[field]
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

export function rankByCollege(records: CalculatorRecord[]): GroupRank[] {
  const counts = new Map<string, number>()
  for (const college of COLLEGE_ORDER) {
    counts.set(college, 0)
  }

  for (const record of records) {
    if (record.type !== "Borrow") continue
    if (!counts.has(record.college)) continue
    counts.set(record.college, (counts.get(record.college) ?? 0) + 1)
  }

  return COLLEGE_ORDER.map((college) => ({
    key: college,
    label: college,
    count: counts.get(college) ?? 0,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function rankByOrganization(
  records: CalculatorRecord[],
  limit = 5
): GroupRank[] {
  return rankByField(records, "organization", limit)
}

function seedTime(hour: number, minute: number, second = 0): string {
  const date = new Date()
  date.setHours(hour, minute, second, 0)
  return date.toISOString()
}

/** Preloaded session rows for presentation (newest first). */
export const SEED_CALCULATOR: CalculatorRecord[] = [
  {
    id: "seed-c20",
    memberId: "LCO-1014",
    calculatorId: "CALC-01",
    name: "Nina Ortega",
    college: "CMNS",
    organization: "Youth Fellowship",
    type: "Borrow",
    scannedAt: seedTime(11, 42, 18),
    status: "Out",
  },
  {
    id: "seed-c19",
    memberId: "LCO-1011",
    calculatorId: "CALC-02",
    name: "Kai Domingo",
    college: "CCIS",
    organization: "Children Ministry",
    type: "Borrow",
    scannedAt: seedTime(11, 28, 4),
    status: "Out",
  },
  {
    id: "seed-c18",
    memberId: "LCO-1005",
    calculatorId: "CALC-03",
    name: "Elena Garcia",
    college: "CEGS",
    organization: "Children Ministry",
    type: "Return",
    scannedAt: seedTime(11, 15, 51),
    status: "Returned",
  },
  {
    id: "seed-c17",
    memberId: "LCO-1012",
    calculatorId: "CALC-04",
    name: "Lara Villanueva",
    college: "COFES",
    organization: "Tech Crew",
    type: "Borrow",
    scannedAt: seedTime(11, 3, 27),
    status: "Out",
  },
  {
    id: "seed-c16",
    memberId: "LCO-1009",
    calculatorId: "CALC-05",
    name: "Isabel Navarro",
    college: "CMNS",
    organization: "Media Team",
    type: "Borrow",
    scannedAt: seedTime(10, 51, 9),
    status: "Out",
  },
  {
    id: "seed-c15",
    memberId: "LCO-1013",
    calculatorId: "CALC-06",
    name: "Marco Dela Cruz",
    college: "CED",
    organization: "LCO Core",
    type: "Borrow",
    scannedAt: seedTime(10, 38, 44),
    status: "Out",
  },
  {
    id: "seed-c14",
    memberId: "LCO-1002",
    calculatorId: "CALC-07",
    name: "Ben Santos",
    college: "COFES",
    organization: "Youth Fellowship",
    type: "Return",
    scannedAt: seedTime(10, 26, 12),
    status: "Returned",
  },
  {
    id: "seed-c13",
    memberId: "LCO-1004",
    calculatorId: "CALC-08",
    name: "Diego Cruz",
    college: "CMNS",
    organization: "Usher Corps",
    type: "Borrow",
    scannedAt: seedTime(10, 14, 33),
    status: "Out",
  },
  {
    id: "seed-c12",
    memberId: "LCO-1008",
    calculatorId: "CALC-09",
    name: "Hiro Tanaka",
    college: "CED",
    organization: "Youth Fellowship",
    type: "Borrow",
    scannedAt: seedTime(10, 2, 18),
    status: "Out",
  },
  {
    id: "seed-c11",
    memberId: "LCO-1005",
    calculatorId: "CALC-10",
    name: "Elena Garcia",
    college: "CEGS",
    organization: "Children Ministry",
    type: "Borrow",
    scannedAt: seedTime(9, 51, 7),
    status: "Out",
  },
  {
    id: "seed-c10",
    memberId: "LCO-1003",
    calculatorId: "CALC-11",
    name: "Carla Mendoza",
    college: "CED",
    organization: "Media Team",
    type: "Return",
    scannedAt: seedTime(9, 40, 55),
    status: "Returned",
  },
  {
    id: "seed-c9",
    memberId: "LCO-1001",
    calculatorId: "CALC-12",
    name: "Ana Reyes",
    college: "CCIS",
    organization: "LCO Core",
    type: "Borrow",
    scannedAt: seedTime(9, 28, 41),
    status: "Out",
  },
  {
    id: "seed-c8",
    memberId: "LCO-1006",
    calculatorId: "CALC-13",
    name: "Felix Ramos",
    college: "CCIS",
    organization: "Tech Crew",
    type: "Borrow",
    scannedAt: seedTime(9, 16, 22),
    status: "Out",
  },
  {
    id: "seed-c7",
    memberId: "LCO-1002",
    calculatorId: "CALC-14",
    name: "Ben Santos",
    college: "COFES",
    organization: "Youth Fellowship",
    type: "Borrow",
    scannedAt: seedTime(9, 5, 14),
    status: "Out",
  },
  {
    id: "seed-c6",
    memberId: "LCO-1003",
    calculatorId: "CALC-15",
    name: "Carla Mendoza",
    college: "CED",
    organization: "Media Team",
    type: "Borrow",
    scannedAt: seedTime(8, 54, 3),
    status: "Out",
  },
  {
    id: "seed-c5",
    memberId: "LCO-1010",
    calculatorId: "CALC-16",
    name: "Jonas Lim",
    college: "CEGS",
    organization: "Usher Corps",
    type: "Return",
    scannedAt: seedTime(8, 42, 47),
    status: "Returned",
  },
  {
    id: "seed-c4",
    memberId: "LCO-1007",
    calculatorId: "CALC-17",
    name: "Gina Lopez",
    college: "COFES",
    organization: "LCO Core",
    type: "Borrow",
    scannedAt: seedTime(8, 31, 19),
    status: "Out",
  },
  {
    id: "seed-c3",
    memberId: "LCO-1010",
    calculatorId: "CALC-18",
    name: "Jonas Lim",
    college: "CEGS",
    organization: "Usher Corps",
    type: "Borrow",
    scannedAt: seedTime(8, 22, 5),
    status: "Out",
  },
  {
    id: "seed-c2",
    memberId: "LCO-1009",
    calculatorId: "CALC-19",
    name: "Isabel Navarro",
    college: "CMNS",
    organization: "Media Team",
    type: "Return",
    scannedAt: seedTime(8, 11, 38),
    status: "Returned",
  },
  {
    id: "seed-c1",
    memberId: "LCO-1009",
    calculatorId: "CALC-20",
    name: "Isabel Navarro",
    college: "CMNS",
    organization: "Media Team",
    type: "Borrow",
    scannedAt: seedTime(8, 2, 11),
    status: "Out",
  },
]

export type BorrowScanResult =
  | { ok: true; record: CalculatorRecord }
  | {
      ok: false
      reason: "empty" | "unknown" | "already_out" | "nothing_to_return"
      message: string
    }

export function tryRecordBorrowScan(
  rawId: string,
  existing: CalculatorRecord[],
  type: BorrowType
): BorrowScanResult {
  const trimmed = rawId.trim()
  if (!trimmed) {
    return { ok: false, reason: "empty", message: "Enter or scan a member ID." }
  }

  const member = findMemberById(trimmed)
  if (!member) {
    return {
      ok: false,
      reason: "unknown",
      message: `Unknown ID “${trimmed}”.`,
    }
  }

  const outMembers = getMembersOut(existing)
  const isOut = outMembers.has(member.id)

  if (type === "Borrow" && isOut) {
    return {
      ok: false,
      reason: "already_out",
      message: `${member.name} already has a calculator out.`,
    }
  }

  if (type === "Return" && !isOut) {
    return {
      ok: false,
      reason: "nothing_to_return",
      message: `${member.name} has nothing to return.`,
    }
  }

  return { ok: true, record: recordFromMember(member, type) }
}
