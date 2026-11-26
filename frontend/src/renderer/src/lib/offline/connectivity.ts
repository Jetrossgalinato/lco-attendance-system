import { API_URL } from "@/lib/api"

let lastOnline = typeof navigator !== "undefined" ? navigator.onLine : true
let lastProbeAt = 0
const PROBE_TTL_MS = 5000
const listeners = new Set<(online: boolean) => void>()

export function getLastOnline(): boolean {
  return lastOnline
}

export function subscribeConnectivity(
  listener: (online: boolean) => void
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(online: boolean) {
  lastOnline = online
  for (const listener of listeners) listener(online)
}

export async function probeApiHealth(force = false): Promise<boolean> {
  const now = Date.now()
  if (!force && now - lastProbeAt < PROBE_TTL_MS) {
    return lastOnline
  }

  try {
    const response = await fetch(`${API_URL}/health`, {
      method: "GET",
      cache: "no-store",
    })
    const online = response.ok
    lastProbeAt = Date.now()
    emit(online)
    return online
  } catch {
    lastProbeAt = Date.now()
    emit(false)
    return false
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void probeApiHealth(true)
  })
  window.addEventListener("offline", () => emit(false))
}
