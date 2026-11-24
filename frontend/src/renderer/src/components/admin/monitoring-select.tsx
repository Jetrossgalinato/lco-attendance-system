import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type MonitoringSelectProps = ComponentProps<"select">

export function MonitoringSelect({
  className,
  children,
  ...props
}: MonitoringSelectProps) {
  return (
    <select
      className={cn(
        "h-9 cursor-pointer rounded-xl border border-border bg-background/55 px-2.5 text-sm text-foreground shadow-[var(--shadow-inset)] outline-none transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
