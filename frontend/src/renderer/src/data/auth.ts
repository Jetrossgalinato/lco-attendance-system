export type AuthSession = {
  id: string
  email: string
  role: string
}

export const DEMO_EMAIL = "admin@lco.local"
export const DEMO_PASSWORD = "admin123"

export function getDisplayName(email: string): string {
  const local = email.trim().split("@")[0] ?? "Admin"
  if (!local) return "Admin"
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase()
}

export function getInitials(email: string): string {
  const local = (email.trim().split("@")[0] ?? "A").replace(/[^a-zA-Z0-9]/g, "")
  if (!local) return "AD"
  if (local.length === 1) return local.toUpperCase()
  return (local[0] + local[1]).toUpperCase()
}
