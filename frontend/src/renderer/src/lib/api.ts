import type {
  AttendanceRank,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  AttendanceType,
} from "@/data/attendance"
import type { AuthSession } from "@/data/auth"

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

export type AttendanceDateRange = {
  from?: string
  to?: string
}

export type ScanCreateResult =
  | { ok: true; record: AttendanceRecord }
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
  persistAuth(session, data.access_token)
  return { ok: true, session, accessToken: data.access_token }
}

export async function fetchMe(): Promise<AuthSession | null> {
  const token = getAccessToken()
  if (!token) return null

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: authHeaders(),
    })
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
  } catch {
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
        ? "That Time In/Out is already recorded."
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
