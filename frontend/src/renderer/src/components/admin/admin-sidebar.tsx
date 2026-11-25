import {
  Calculator,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
} from "lucide-react"

import { useAlert } from "@/components/alert-provider"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  getDisplayName,
  getInitials,
  type AuthSession,
} from "@/data/auth"
import { cn } from "@/lib/utils"
import type { AdminPage } from "@/types/admin"

type AdminSidebarProps = {
  session: AuthSession
  activePage: AdminPage
  onNavigate: (page: AdminPage) => void
  onLogout: () => void
}

type NavItem = {
  id: AdminPage
  label: string
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "attendance",
    label: "Attendance Monitoring",
    icon: ClipboardCheck,
  },
  {
    id: "borrowing",
    label: "Borrowing Monitoring",
    icon: Calculator,
  },
  {
    id: "activity",
    label: "Activity Logs",
    icon: ScrollText,
  },
  {
    id: "members",
    label: "Manage Members",
    icon: Users,
  },
]

export function AdminSidebar({
  session,
  activePage,
  onNavigate,
  onLogout,
}: AdminSidebarProps) {
  const { showAlert } = useAlert()
  const displayName = getDisplayName(session.email)
  const initials = getInitials(session.email)

  function handleLogout() {
    showAlert({
      tone: "success",
      title: "Signed out",
      message: "You have been logged out of LCO Admin.",
    })
    onLogout()
  }

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-sidebar-border shadow-[var(--shadow-2)] group-data-[state=expanded]:shadow-[var(--shadow-3)] [&>[data-slot=sidebar-inner]]:rounded-none [&>[data-slot=sidebar-inner]]:rounded-r-2xl"
    >
      <SidebarHeader className="gap-0 border-b border-sidebar-border p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <p className="truncate text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
            LCO Admin
          </p>
          <SidebarTrigger className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-border bg-card/85 shadow-[var(--shadow-1)] hover:bg-muted" />
        </div>

        <div className="flex items-center gap-3 px-3 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <div
            className="surface-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime/40 text-sm font-black text-[#181a17]"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="truncate font-semibold tracking-tight">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {session.email}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2.5 py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = activePage === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      type="button"
                      isActive={active}
                      tooltip={item.label}
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "h-auto cursor-pointer rounded-xl py-2.5 font-semibold tracking-tight",
                        active &&
                          "relative bg-lime/20 font-bold text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-lime data-[active=true]:bg-lime/20 data-[active=true]:font-bold data-[active=true]:text-foreground"
                      )}
                    >
                      <Icon strokeWidth={active ? 2.5 : 2.25} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border p-2.5">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <span className="px-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
            Theme
          </span>
          <ModeToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip="Logout"
              onClick={handleLogout}
              className="h-9 cursor-pointer rounded-xl border border-border bg-card/85 font-semibold shadow-[var(--shadow-1)] hover:bg-muted"
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
