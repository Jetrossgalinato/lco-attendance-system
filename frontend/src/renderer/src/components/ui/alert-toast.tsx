import { CheckCircle2, CircleAlert, X } from "lucide-react"

import { cn } from "@/lib/utils"

export type AlertTone = "success" | "error"

export type AlertToastProps = {
  tone: AlertTone
  title: string
  message?: string
  visible: boolean
  onClose: () => void
}

export function AlertToast({
  tone,
  title,
  message,
  visible,
  onClose,
}: AlertToastProps) {
  const Icon = tone === "success" ? CheckCircle2 : CircleAlert

  return (
    <div
      className={cn(
        "alert-toast pointer-events-auto flex w-[min(420px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow-3)]",
        tone === "success"
          ? "border-lime/50 bg-card text-foreground"
          : "border-destructive/30 bg-card text-foreground",
        visible ? "alert-toast-enter" : "alert-toast-exit"
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "success" ? "text-deep-lime" : "text-destructive"
        )}
        strokeWidth={2.25}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        {message ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
        ) : null}
      </div>
      <button
        type="button"
        className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dismiss alert"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
