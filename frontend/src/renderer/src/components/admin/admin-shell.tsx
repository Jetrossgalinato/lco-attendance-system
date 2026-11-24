import { useCallback, useEffect, useState, type ReactNode } from "react"

import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { AuthSession } from "@/data/auth"
import type { AdminPage } from "@/types/admin"

const STORAGE_KEY = "lco-admin-sidebar-collapsed"

type AdminShellProps = {
  session: AuthSession
  activePage: AdminPage
  onNavigate: (page: AdminPage) => void
  onLogout: () => void
  children: ReactNode
}

export function AdminShell({
  session,
  activePage,
  onNavigate,
  onLogout,
  children,
}: AdminShellProps) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === "1") setOpen(false)
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    try {
      window.localStorage.setItem(STORAGE_KEY, nextOpen ? "0" : "1")
    } catch {
      // Ignore storage errors.
    }
  }, [])

  return (
    <div className="app-shell text-foreground">
      <SidebarProvider
        open={open}
        onOpenChange={handleOpenChange}
        className="relative z-[1] min-h-dvh"
      >
        <AdminSidebar
          session={session}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <SidebarInset className="min-h-dvh min-w-0 overflow-y-auto bg-transparent">
          <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-6 md:px-8 md:py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
