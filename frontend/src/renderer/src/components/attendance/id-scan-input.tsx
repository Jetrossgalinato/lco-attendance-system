import { useEffect, useRef, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AttendanceType } from "@/data/attendance"
import { cn } from "@/lib/utils"

type IdScanInputProps = {
  value: string
  scanType: AttendanceType
  message: string | null
  messageTone: "error" | "success" | null
  coolingDown?: boolean
  onChange: (value: string) => void
  onScanTypeChange: (type: AttendanceType) => void
  onSubmitId: (rawId: string) => void
  className?: string
}

export function IdScanInput({
  value,
  scanType,
  message,
  messageTone,
  coolingDown = false,
  onChange,
  onScanTypeChange,
  onSubmitId,
  className,
}: IdScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!coolingDown) {
      inputRef.current?.focus()
    }
  }, [coolingDown])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmitId(value)
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-center gap-4 bg-transparent px-5 py-4",
        className
      )}
    >
      <div>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Scan mode
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["Time In", "Time Out"] as const).map((type) => {
            const active = scanType === type
            return (
              <Button
                key={type}
                type="button"
                variant={active ? "default" : "outline"}
                className={cn(
                  "cursor-pointer",
                  active &&
                    "surface-active-lime bg-lime text-[#181a17] hover:bg-lime hover:text-[#181a17] ring-2 ring-lime/50 ring-offset-2 ring-offset-background"
                )}
                aria-pressed={active}
                onClick={() => onScanTypeChange(type)}
              >
                {type}
              </Button>
            )
          })}
        </div>
      </div>

      <form className="space-y-2" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Or enter member ID
          </span>
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Hardware scanner or type LCO-1001, then Enter"
            autoComplete="off"
            spellCheck={false}
            disabled={coolingDown}
            className="font-mono tracking-wide"
            aria-live="polite"
          />
        </label>
      </form>

      <div className="min-h-5 space-y-1">
        {value.trim() ? (
          <p
            className="font-mono text-sm font-semibold tracking-wide text-foreground"
            role="status"
            aria-live="polite"
          >
            Reading{" "}
            <span className="text-deep-lime">{value.trim()}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Active mode: <span className="font-semibold">{scanType}</span>
          </p>
        )}
        {message ? (
          <p
            className={
              messageTone === "success"
                ? "text-sm font-medium text-deep-lime"
                : "text-sm font-medium text-destructive"
            }
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
