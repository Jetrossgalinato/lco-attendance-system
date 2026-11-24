import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AppHeaderActions } from "@/components/app-header-actions"
import { QrScanner } from "@/components/attendance/qr-scanner"
import { BorrowScanInput } from "@/components/calculator/borrow-scan-input"
import { CalculatorRanking } from "@/components/calculator/calculator-ranking"
import { CalculatorSummaryCards } from "@/components/calculator/calculator-summary"
import { CalculatorTable } from "@/components/calculator/calculator-table"
import {
  rankByCollege,
  rankByOrganization,
  SCAN_COOLDOWN_MS,
  SEED_CALCULATOR,
  summarizeCalculator,
  tryRecordBorrowScan,
  type BorrowType,
  type CalculatorRecord,
} from "@/data/calculator"

type CalculatorPageProps = {
  onChangeMode: () => void
  onLoginClick: () => void
}

export function CalculatorPage({
  onChangeMode,
  onLoginClick,
}: CalculatorPageProps) {
  const [records, setRecords] = useState<CalculatorRecord[]>(SEED_CALCULATOR)
  const [scanType, setScanType] = useState<BorrowType>("Borrow")
  const [scanValue, setScanValue] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<"error" | "success" | null>(
    null
  )
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const scanTypeRef = useRef(scanType)
  const cooldownUntilRef = useRef(cooldownUntil)

  useEffect(() => {
    scanTypeRef.current = scanType
  }, [scanType])

  useEffect(() => {
    cooldownUntilRef.current = cooldownUntil
  }, [cooldownUntil])

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [cooldownUntil])

  const coolingDown = now < cooldownUntil

  const summary = useMemo(() => summarizeCalculator(records), [records])
  const collegeRanks = useMemo(() => rankByCollege(records), [records])
  const organizationRanks = useMemo(
    () => rankByOrganization(records, 5),
    [records]
  )

  const handleScan = useCallback((rawId: string) => {
    if (Date.now() < cooldownUntilRef.current) {
      return
    }

    setRecords((current) => {
      const result = tryRecordBorrowScan(rawId, current, scanTypeRef.current)
      if (!result.ok) {
        setMessage(result.message)
        setMessageTone("error")
        return current
      }

      setMessage(`Recorded ${result.record.name} · ${result.record.type}`)
      setMessageTone("success")
      setScanValue("")
      setCooldownUntil(Date.now() + SCAN_COOLDOWN_MS)
      setNow(Date.now())
      return [result.record, ...current]
    })
  }, [])

  const sessionLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [])

  return (
    <div className="app-shell text-foreground">
      <main className="relative z-[1] mx-auto flex min-h-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-8">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2.5">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Session · {sessionLabel} · Live
            </p>
            <h1 className="text-4xl font-black tracking-[-0.05em] text-foreground md:text-5xl">
              LCO Calculator Borrowing
            </h1>
            <p className="font-serif max-w-2xl text-lg text-foreground/80 italic">
              QR camera stays on — choose Borrow or Return, then scan or type a
              borrower ID.
            </p>
          </div>
          <AppHeaderActions
            onChangeMode={onChangeMode}
            onLoginClick={onLoginClick}
          />
        </header>

        <CalculatorSummaryCards summary={summary} />

        <section className="surface-card surface-elevated grid h-auto overflow-hidden md:h-[300px] md:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <QrScanner
            paused={coolingDown}
            onScan={handleScan}
            className="h-[240px] border-b border-border/80 md:h-full md:border-r md:border-b-0"
          />
          <BorrowScanInput
            value={scanValue}
            scanType={scanType}
            message={message}
            messageTone={messageTone}
            coolingDown={coolingDown}
            onChange={setScanValue}
            onScanTypeChange={setScanType}
            onSubmitId={handleScan}
          />
        </section>

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <CalculatorTable records={records} />
          <CalculatorRanking
            collegeRanks={collegeRanks}
            organizationRanks={organizationRanks}
          />
        </div>
      </main>
    </div>
  )
}
