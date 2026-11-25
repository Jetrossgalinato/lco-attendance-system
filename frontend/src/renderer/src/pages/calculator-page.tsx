import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AppHeaderActions } from "@/components/app-header-actions"
import { QrScanner } from "@/components/attendance/qr-scanner"
import { BorrowScanInput } from "@/components/calculator/borrow-scan-input"
import { CalculatorRanking } from "@/components/calculator/calculator-ranking"
import { CalculatorSummaryCards } from "@/components/calculator/calculator-summary"
import { CalculatorTable } from "@/components/calculator/calculator-table"
import { SCAN_FEEDBACK_MS, toDateInputValue } from "@/data/attendance"
import {
  SCAN_COOLDOWN_MS,
  type BorrowType,
  type CalculatorRecord,
  type CalculatorSummary,
  type GroupRank,
} from "@/data/calculator"
import {
  createBorrowScan,
  fetchBorrowRanking,
  fetchBorrowScans,
  fetchBorrowSummary,
} from "@/lib/api"
import { playScanSuccessSound } from "@/lib/scan-sound"

type CalculatorPageProps = {
  onChangeMode: () => void
  onLoginClick: () => void
}

const EMPTY_SUMMARY: CalculatorSummary = {
  outNow: 0,
  borrowedToday: 0,
  returnedToday: 0,
  returnRate: 0,
}

export function CalculatorPage({
  onChangeMode,
  onLoginClick,
}: CalculatorPageProps) {
  const today = toDateInputValue()
  const [records, setRecords] = useState<CalculatorRecord[]>([])
  const [summary, setSummary] = useState<CalculatorSummary>(EMPTY_SUMMARY)
  const [collegeRanks, setCollegeRanks] = useState<GroupRank[]>([])
  const [organizationRanks, setOrganizationRanks] = useState<GroupRank[]>([])
  const [scanType, setScanType] = useState<BorrowType>("Borrow")
  const [scanValue, setScanValue] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<"error" | "success" | null>(
    null
  )
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [scanning, setScanning] = useState(false)

  const scanTypeRef = useRef(scanType)
  const cooldownUntilRef = useRef(cooldownUntil)
  const scanningRef = useRef(false)
  const feedbackTimerRef = useRef<number | null>(null)

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

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const coolingDown = now < cooldownUntil

  const showFeedback = useCallback(
    (text: string, tone: "error" | "success") => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
      setMessage(text)
      setMessageTone(tone)
      feedbackTimerRef.current = window.setTimeout(() => {
        setMessage(null)
        setMessageTone(null)
        setScanValue("")
        feedbackTimerRef.current = null
      }, SCAN_FEEDBACK_MS)
    },
    []
  )

  const refreshDesk = useCallback(async () => {
    const range = { from: today, to: today }
    try {
      const [nextRecords, nextSummary, nextCollege, nextOrg] = await Promise.all(
        [
          fetchBorrowScans(range),
          fetchBorrowSummary(),
          fetchBorrowRanking("college", range),
          fetchBorrowRanking("organization", range, 5),
        ]
      )
      setRecords(nextRecords)
      setSummary(nextSummary)
      setCollegeRanks(nextCollege)
      setOrganizationRanks(nextOrg)
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Failed to load borrowing."
      showFeedback(detail, "error")
    }
  }, [showFeedback, today])

  useEffect(() => {
    void refreshDesk()
  }, [refreshDesk])

  const handleScan = useCallback(
    async (rawId: string) => {
      if (Date.now() < cooldownUntilRef.current || scanningRef.current) {
        return
      }

      scanningRef.current = true
      setScanning(true)
      try {
        const result = await createBorrowScan(rawId, scanTypeRef.current)
        if (!result.ok) {
          showFeedback(result.message, "error")
          return
        }

        void playScanSuccessSound()
        showFeedback(
          `Recorded ${result.record.name} · ${result.record.type}`,
          "success"
        )
        setCooldownUntil(Date.now() + SCAN_COOLDOWN_MS)
        setNow(Date.now())
        await refreshDesk()
      } finally {
        scanningRef.current = false
        setScanning(false)
      }
    },
    [refreshDesk, showFeedback]
  )

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
            paused={coolingDown || scanning}
            onReading={setScanValue}
            onScan={handleScan}
            className="h-[240px] border-b border-border/80 md:h-full md:border-r md:border-b-0"
          />
          <BorrowScanInput
            value={scanValue}
            scanType={scanType}
            message={message}
            messageTone={messageTone}
            coolingDown={coolingDown || scanning}
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
