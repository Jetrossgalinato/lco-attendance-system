import { useEffect, useState } from "react"

import { AdminShell } from "@/components/admin/admin-shell"
import { AlertProvider, useAlert } from "@/components/alert-provider"
import type { AuthSession } from "@/data/auth"
import {
  clearAuth,
  fetchMe,
  getStoredSession,
  onUnauthorized,
} from "@/lib/api"
import { AdminActivityLogsPage } from "@/pages/admin-activity-logs-page"
import { AdminAttendanceMonitoringPage } from "@/pages/admin-attendance-monitoring-page"
import { AdminBorrowingMonitoringPage } from "@/pages/admin-borrowing-monitoring-page"
import { AdminDashboardPage } from "@/pages/admin-dashboard-page"
import { AdminMembersPage } from "@/pages/admin-members-page"
import { AttendancePage } from "@/pages/attendance-page"
import { CalculatorPage } from "@/pages/calculator-page"
import { LoginPage } from "@/pages/login-page"
import type { AdminPage } from "@/types/admin"

export type AppView = "attendance" | "calculator" | "login" | "admin"

function AppContent() {
  const { showAlert } = useAlert()
  const [view, setView] = useState<AppView>("attendance")
  const [session, setSession] = useState<AuthSession | null>(null)
  const [adminPage, setAdminPage] = useState<AdminPage>("dashboard")
  const [returnView, setReturnView] = useState<"attendance" | "calculator">(
    "attendance"
  )
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    return onUnauthorized(() => {
      setSession(null)
      setAdminPage("dashboard")
      setView("login")
      showAlert({
        tone: "error",
        title: "Session expired",
        message: "Please sign in again.",
      })
    })
  }, [showAlert])

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const stored = getStoredSession()
      if (!stored) {
        if (!cancelled) setAuthReady(true)
        return
      }

      const verified = await fetchMe()
      if (cancelled) return

      if (verified) {
        setSession(verified)
        setView("admin")
      } else {
        // Dead/expired token: apiAuthFetch already cleared auth + notified (toast).
        setSession(null)
        setView("login")
      }
      setAuthReady(true)
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  function handleChangeMode() {
    setView((current) =>
      current === "attendance" ? "calculator" : "attendance"
    )
  }

  function handleLoginClick() {
    setReturnView(view === "calculator" ? "calculator" : "attendance")
    setView("login")
  }

  function handleLoginSuccess(nextSession: AuthSession) {
    setSession(nextSession)
    setAdminPage("dashboard")
    setView("admin")
  }

  function handleLoginBack() {
    setView(returnView)
  }

  function handleLogout() {
    clearAuth()
    setSession(null)
    setAdminPage("dashboard")
    setView("attendance")
  }

  if (!authReady) {
    return null
  }

  let content = (
    <AttendancePage
      onChangeMode={handleChangeMode}
      onLoginClick={handleLoginClick}
    />
  )

  if (view === "calculator") {
    content = (
      <CalculatorPage
        onChangeMode={handleChangeMode}
        onLoginClick={handleLoginClick}
      />
    )
  } else if (view === "login") {
    content = (
      <LoginPage onSuccess={handleLoginSuccess} onBack={handleLoginBack} />
    )
  } else if (view === "admin") {
    if (!session) {
      content = (
        <LoginPage onSuccess={handleLoginSuccess} onBack={handleLoginBack} />
      )
    } else {
      let adminContent = <AdminDashboardPage />
      if (adminPage === "attendance") {
        adminContent = <AdminAttendanceMonitoringPage />
      } else if (adminPage === "borrowing") {
        adminContent = <AdminBorrowingMonitoringPage />
      } else if (adminPage === "activity") {
        adminContent = <AdminActivityLogsPage />
      } else if (adminPage === "members") {
        adminContent = <AdminMembersPage />
      }

      content = (
        <AdminShell
          session={session}
          activePage={adminPage}
          onNavigate={setAdminPage}
          onLogout={handleLogout}
        >
          {adminContent}
        </AdminShell>
      )
    }
  }

  return content
}

export default function App() {
  return (
    <AlertProvider>
      <AppContent />
    </AlertProvider>
  )
}
