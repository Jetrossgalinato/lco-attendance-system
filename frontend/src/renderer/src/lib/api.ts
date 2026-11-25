import type {
  CurrentlyOutRow,
  EmployeeAttendanceStats,
} from "@/data/admin-monitoring"
import type {
  AttendanceRank,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  AttendanceType,
} from "@/data/attendance"
import type { AuthSession } from "@/data/auth"
import type {
  BorrowStatus,
  BorrowType,
  CalculatorRecord,
  CalculatorSummary,
  GroupRank,
} from "@/data/calculator"
import type { Member } from "@/data/members"

export type ManagedMember = Member & {
  isActive: boolean
  createdAt: string
}

export type MemberWritePayload = {
  id?: string
  name: string
  department: string
  college: string
  organization: string
}

export type MemberUpdatePayload = {
  name?: string
  department?: string
  college?: string
  organization?: string
  is_active?: boolean
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
const TOKEN_KEY = "lco-access-token"
const SESSION_KEY = "lco-auth-session"

type AttendanceRecordApi = {
  id: string
  member_id: string
  name: string
  department: string
  type: AttendanceType
  scanned_at: string
  status: AttendanceStatus
}

type AttendanceRankApi = {
  member_id: string
  name: string
  department: string
  count: number
}

type EmployeeAttendanceApi = {
  id: string
  name: string
  department: string
  college: string
  organization: string
  present_week: number
  late_week: number
  scan_count_week: number
  last_scan_at: string | null
}

export type AttendanceDateRange = {
  from?: string
  to?: string
}

export type ScanCreateResult =
  | { ok: true; record: AttendanceRecord }
  | { ok: false; message: string }

export type BorrowScanCreateResult =
  | { ok: true; record: CalculatorRecord }
  | { ok: false; message: string }

export type HealthResponse = {
  status: string
  database: string
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: {
    id: string
    email: string
    role: string
  }
}

export type LoginResult =
  | { ok: true; session: AuthSession; accessToken: string }
  | { ok: false; message: string }

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  return response.json() as Promise<HealthResponse>
}

export function getApiUrl(): string {
  return API_URL
}

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.email || !parsed?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function persistAuth(session: AuthSession, accessToken: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, accessToken)
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage errors.
  }
}

export function clearAuth(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export class SessionExpiredError extends Error {
  constructor(message = "Session expired") {
    super(message)
    this.name = "SessionExpiredError"
  }
}

type UnauthorizedListener = () => void

const unauthorizedListeners = new Set<UnauthorizedListener>()
let unauthorizedNotified = false

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

function notifyUnauthorized(): void {
  if (unauthorizedNotified) return
  unauthorizedNotified = true
  clearAuth()
  for (const listener of unauthorizedListeners) {
    try {
      listener()
    } catch {
      // Listener errors must not break API flow.
    }
  }
}

/** Call after a successful login so the next 401 can notify again. */
export function resetUnauthorizedGuard(): void {
  unauthorizedNotified = false
}

export function authHeaders(
  headers: HeadersInit = {}
): Record<string, string> {
  const token = getAccessToken()
  const merged = new Headers(headers)
  if (token) {
    merged.set("Authorization", `Bearer ${token}`)
  }
  const result: Record<string, string> = {}
  merged.forEach((value, key) => {
    result[key] = value
  })
  return result
}

async function apiAuthFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: authHeaders(init.headers),
  })

  if (response.status === 401) {
    notifyUnauthorized()
    throw new SessionExpiredError("Session expired — please sign in again.")
  }

  return response
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const trimmedEmail = email.trim()
  const trimmedPassword = password.trim()

  if (!trimmedEmail || !trimmedPassword) {
    return {
      ok: false,
      message: "Enter both email and password to continue.",
    }
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmedEmail,
        password: trimmedPassword,
      }),
    })
  } catch {
    return {
      ok: false,
      message: "Cannot reach the server. Is the API running?",
    }
  }

  if (!response.ok) {
    let message = "Invalid email or password."
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === "string") {
        message = body.detail
      }
    } catch {
      // Keep default message.
    }
    if (response.status >= 500) {
      message = "Server error. Try again in a moment."
    }
    return { ok: false, message }
  }

  const data = (await response.json()) as LoginResponse
  const session: AuthSession = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
  }
  resetUnauthorizedGuard()
  persistAuth(session, data.access_token)
  return { ok: true, session, accessToken: data.access_token }
}

export async function fetchMe(): Promise<AuthSession | null> {
  const token = getAccessToken()
  if (!token) return null

  try {
    const response = await apiAuthFetch(`${API_URL}/auth/me`)
    if (!response.ok) {
      clearAuth()
      return null
    }
    const user = (await response.json()) as {
      id: string
      email: string
      role: string
    }
    const session: AuthSession = {
      id: user.id,
      email: user.email,
      role: user.role,
    }
    persistAuth(session, token)
    return session
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      return null
    }
    return getStoredSession()
  }
}

function mapAttendanceRecord(row: AttendanceRecordApi): AttendanceRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    department: row.department,
    type: row.type,
    scannedAt: row.scanned_at,
    status: row.status,
  }
}

function mapAttendanceRank(row: AttendanceRankApi): AttendanceRank {
  return {
    memberId: row.member_id,
    name: row.name,
    department: row.department,
    count: row.count,
  }
}

function attendanceRangeQuery(range: AttendanceDateRange = {}): string {
  const params = new URLSearchParams()
  if (range.from) params.set("from", range.from)
  if (range.to) params.set("to", range.to)
  const query = params.toString()
  return query ? `?${query}` : ""
}

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === "string") return body.detail
  } catch {
    // Keep fallback.
  }
  return fallback
}

export async function fetchAttendanceScans(
  range: AttendanceDateRange = {}
): Promise<AttendanceRecord[]> {
  const response = await fetch(
    `${API_URL}/attendance/scans${attendanceRangeQuery(range)}`
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, `Failed to load scans (${response.status})`)
    )
  }
  const rows = (await response.json()) as AttendanceRecordApi[]
  return rows.map(mapAttendanceRecord)
}

export async function fetchAttendanceSummary(
  range: AttendanceDateRange = {}
): Promise<AttendanceSummary> {
  const response = await fetch(
    `${API_URL}/attendance/summary${attendanceRangeQuery(range)}`
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load summary (${response.status})`
      )
    )
  }
  return response.json() as Promise<AttendanceSummary>
}

export async function fetchAttendanceRanking(
  range: AttendanceDateRange = {},
  limit = 5
): Promise<AttendanceRank[]> {
  const params = new URLSearchParams()
  if (range.from) params.set("from", range.from)
  if (range.to) params.set("to", range.to)
  params.set("limit", String(limit))
  const response = await fetch(
    `${API_URL}/attendance/ranking?${params.toString()}`
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load ranking (${response.status})`
      )
    )
  }
  const rows = (await response.json()) as AttendanceRankApi[]
  return rows.map(mapAttendanceRank)
}

export async function createAttendanceScan(
  memberId: string,
  type: AttendanceType
): Promise<ScanCreateResult> {
  const trimmed = memberId.trim()
  if (!trimmed) {
    return { ok: false, message: "Enter or scan a member ID." }
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}/attendance/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: trimmed, type }),
    })
  } catch {
    return {
      ok: false,
      message: "Cannot reach the server. Is the API running?",
    }
  }

  if (!response.ok) {
    const fallback =
      response.status === 409
        ? "That Time In/Out is already recorded today."
        : response.status === 404
          ? `Unknown ID “${trimmed}”.`
          : "Could not record scan."
    return {
      ok: false,
      message: await readErrorMessage(response, fallback),
    }
  }

  const row = (await response.json()) as AttendanceRecordApi
  return { ok: true, record: mapAttendanceRecord(row) }
}

function mapEmployeeAttendance(
  row: EmployeeAttendanceApi
): EmployeeAttendanceStats {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    college: row.college,
    organization: row.organization,
    presentWeek: row.present_week,
    lateWeek: row.late_week,
    scanCountWeek: row.scan_count_week,
    lastScanAt: row.last_scan_at,
  }
}

export async function fetchAttendanceEmployees(
  range: AttendanceDateRange = {}
): Promise<EmployeeAttendanceStats[]> {
  const response = await apiAuthFetch(
    `${API_URL}/attendance/employees${attendanceRangeQuery(range)}`
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load employees (${response.status})`
      )
    )
  }
  const rows = (await response.json()) as EmployeeAttendanceApi[]
  return rows.map(mapEmployeeAttendance)
}

type MemberApi = {
  id: string
  name: string
  department: string
  college: string
  organization: string
  is_active: boolean
  created_at: string
}

function mapManagedMember(row: MemberApi): ManagedMember {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    college: row.college,
    organization: row.organization,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

export async function fetchMembers(
  active: "all" | "true" | "false" = "all"
): Promise<ManagedMember[]> {
  const params = new URLSearchParams({ active })
  const response = await apiAuthFetch(
    `${API_URL}/members?${params.toString()}`
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load members (${response.status})`
      )
    )
  }
  const rows = (await response.json()) as MemberApi[]
  return rows.map(mapManagedMember)
}

export async function fetchNextMemberId(): Promise<string> {
  const response = await apiAuthFetch(`${API_URL}/members/next-id`)
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load next member ID (${response.status})`
      )
    )
  }
  const body = (await response.json()) as { id: string }
  return body.id
}

export async function createMember(
  payload: MemberWritePayload
): Promise<ManagedMember> {
  const response = await apiAuthFetch(`${API_URL}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: payload.id?.trim() || undefined,
      name: payload.name,
      department: payload.department,
      college: payload.college,
      organization: payload.organization,
    }),
  })
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to create member (${response.status})`
      )
    )
  }
  return mapManagedMember((await response.json()) as MemberApi)
}

export async function updateMember(
  memberId: string,
  payload: MemberUpdatePayload
): Promise<ManagedMember> {
  const response = await apiAuthFetch(
    `${API_URL}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to update member (${response.status})`
      )
    )
  }
  return mapManagedMember((await response.json()) as MemberApi)
}

type BorrowRecordApi = {
  id: string
  member_id: string
  name: string
  college: string
  organization: string
  type: BorrowType
  scanned_at: string
  status: BorrowStatus
}

type BorrowSummaryApi = {
  out_now: number
  borrowed_today: number
  returned_today: number
  return_rate: number
}

type BorrowRankApi = {
  key: string
  label: string
  count: number
}

type CurrentlyOutApi = {
  member_id: string
  name: string
  college: string
  organization: string
  borrowed_at: string
}

function mapBorrowRecord(row: BorrowRecordApi): CalculatorRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    college: row.college,
    organization: row.organization,
    type: row.type,
    scannedAt: row.scanned_at,
    status: row.status,
  }
}

function mapBorrowSummary(row: BorrowSummaryApi): CalculatorSummary {
  return {
    outNow: row.out_now,
    borrowedToday: row.borrowed_today,
    returnedToday: row.returned_today,
    returnRate: row.return_rate,
  }
}

function mapBorrowRank(row: BorrowRankApi): GroupRank {
  return {
    key: row.key,
    label: row.label,
    count: row.count,
  }
}

function mapCurrentlyOut(row: CurrentlyOutApi): CurrentlyOutRow {
  return {
    memberId: row.member_id,
    name: row.name,
    college: row.college,
    organization: row.organization,
    borrowedAt: row.borrowed_at,
  }
}

export async function fetchBorrowScans(
  range: AttendanceDateRange = {}
): Promise<CalculatorRecord[]> {
  const response = await fetch(
    `${API_URL}/borrows/scans${attendanceRangeQuery(range)}`
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load borrow scans (${response.status})`
      )
    )
  }
  const rows = (await response.json()) as BorrowRecordApi[]
  return rows.map(mapBorrowRecord)
}

export async function fetchBorrowSummary(): Promise<CalculatorSummary> {
  const response = await fetch(`${API_URL}/borrows/summary`)
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load borrow summary (${response.status})`
      )
    )
  }
  return mapBorrowSummary((await response.json()) as BorrowSummaryApi)
}

export async function fetchBorrowRanking(
  groupBy: "college" | "organization",
  range: AttendanceDateRange = {},
  limit = 5
): Promise<GroupRank[]> {
  const params = new URLSearchParams()
  params.set("group_by", groupBy)
  if (range.from) params.set("from", range.from)
  if (range.to) params.set("to", range.to)
  params.set("limit", String(limit))
  const response = await fetch(
    `${API_URL}/borrows/ranking?${params.toString()}`
  )
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load borrow ranking (${response.status})`
      )
    )
  }
  const rows = (await response.json()) as BorrowRankApi[]
  return rows.map(mapBorrowRank)
}

export async function createBorrowScan(
  memberId: string,
  type: BorrowType
): Promise<BorrowScanCreateResult> {
  const trimmed = memberId.trim()
  if (!trimmed) {
    return { ok: false, message: "Enter or scan a member ID." }
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}/borrows/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: trimmed, type }),
    })
  } catch {
    return {
      ok: false,
      message: "Cannot reach the server. Is the API running?",
    }
  }

  if (!response.ok) {
    const fallback =
      response.status === 409
        ? "That borrow/return is not allowed right now."
        : response.status === 404
          ? `Unknown ID “${trimmed}”.`
          : "Could not record scan."
    return {
      ok: false,
      message: await readErrorMessage(response, fallback),
    }
  }

  const row = (await response.json()) as BorrowRecordApi
  return { ok: true, record: mapBorrowRecord(row) }
}

export async function fetchBorrowCurrentlyOut(): Promise<CurrentlyOutRow[]> {
  const response = await apiAuthFetch(`${API_URL}/borrows/currently-out`)
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Failed to load currently out (${response.status})`
      )
    )
  }
  const rows = (await response.json()) as CurrentlyOutApi[]
  return rows.map(mapCurrentlyOut)
}
