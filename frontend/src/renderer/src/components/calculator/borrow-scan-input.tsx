import { useEffect, useRef, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BorrowType } from "@/data/calculator"
import { cn } from "@/lib/utils"

export type BorrowScanStep = "member" | "calculator"

type BorrowScanInputProps = {
  value: string
  scanType: BorrowType
  scanStep: BorrowScanStep
  pendingMemberId: string | null
  message: string | null
  messageTone: "error" | "success" | null
  coolingDown?: boolean
  onChange: (value: string) => void
  onScanTypeChange: (type: BorrowType) => void
  onSubmitId: (rawId: string) => void
  onClearPendingMember: () => void
  className?: string
}

export function BorrowScanInput({
  value,
  scanType,
  scanStep,
  pendingMemberId,
  message,
  messageTone,
  coolingDown = false,
  onChange,
  onScanTypeChange,
  onSubmitId,
  onClearPendingMember,
  className,
}: BorrowScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!coolingDown) {
      inputRef.current?.focus()
    }
  }, [coolingDown, scanStep])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmitId(value)
  }

  const awaitingCalculator = scanStep === "calculator"

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
          {(["Borrow", "Return"] as const).map((type) => {
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
            {awaitingCalculator
              ? "Or enter calculator ID"
              : "Or enter member ID"}
          </span>
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              awaitingCalculator
                ? "Hardware scanner or type CALC-01, then Enter"
                : "Hardware scanner or type LCO-1001, then Enter"
            }
            autoComplete="off"
            spellCheck={false}
            disabled={coolingDown}
            className="font-mono tracking-wide"
          />
        </label>
      </form>

      <div className="min-h-5 space-y-1.5">
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
        ) : awaitingCalculator && pendingMemberId ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Member{" "}
              <span className="font-mono font-semibold text-foreground">
                {pendingMemberId}
              </span>
              {" · "}
              scan calculator ID to finish {scanType.toLowerCase()}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer px-2 text-xs"
              onClick={onClearPendingMember}
            >
              Change member
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Active mode: <span className="font-semibold">{scanType}</span>
            {" · "}
            scan member ID first
          </p>
        )}
      </div>
    </div>
  )
}
