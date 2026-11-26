import { API_URL } from "@/lib/api"

let lastOnline = typeof navigator !== "undefined" ? navigator.onLine : true
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

export async function probeApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: "GET",
      cache: "no-store",
    })
    const online = response.ok
    emit(online)
    return online
  } catch {
    emit(false)
    return false
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void probeApiHealth()
  })
  window.addEventListener("offline", () => emit(false))
}
