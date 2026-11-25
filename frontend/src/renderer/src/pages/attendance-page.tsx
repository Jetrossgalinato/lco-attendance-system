import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AppHeaderActions } from "@/components/app-header-actions"
import { AttendanceRanking } from "@/components/attendance/attendance-ranking"
import { AttendanceSummaryCards } from "@/components/attendance/attendance-summary"
import { AttendanceTable } from "@/components/attendance/attendance-table"
import { IdScanInput } from "@/components/attendance/id-scan-input"
import { QrScanner } from "@/components/attendance/qr-scanner"
import {
  SCAN_COOLDOWN_MS,
  SCAN_FEEDBACK_MS,
  toDateInputValue,
  weekToDateRange,
  type AttendanceRank,
  type AttendanceRecord,
  type AttendanceSummary,
  type AttendanceType,
} from "@/data/attendance"
import {
  createAttendanceScan,
  fetchAttendanceRanking,
  fetchAttendanceScans,
  fetchAttendanceSummary,
} from "@/lib/api"
import { playScanSuccessSound } from "@/lib/scan-sound"

type AttendancePageProps = {
  onChangeMode: () => void
  onLoginClick: () => void
}

const EMPTY_SUMMARY: AttendanceSummary = {
  present: 0,
  late: 0,
  total: 0,
  rate: 0,
}

export function AttendancePage({
  onChangeMode,
  onLoginClick,
}: AttendancePageProps) {
  const today = toDateInputValue()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY)
  const [ranks, setRanks] = useState<AttendanceRank[]>([])
  const [scanType, setScanType] = useState<AttendanceType>("Time In")
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

  const refreshDesk = useCallback(async (from: string, to: string) => {
    const range = { from, to }
    const rankingRange = weekToDateRange()
    try {
      const [nextRecords, nextSummary, nextRanks] = await Promise.all([
        fetchAttendanceScans(range),
        fetchAttendanceSummary(range),
        fetchAttendanceRanking(rankingRange, 5),
      ])
      setRecords(nextRecords)
      setSummary(nextSummary)
      setRanks(nextRanks)
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Failed to load attendance."
      showFeedback(detail, "error")
    }
  }, [showFeedback])

  useEffect(() => {
    void refreshDesk(fromDate, toDate)
  }, [fromDate, toDate, refreshDesk])

  const handleScan = useCallback(
    async (rawId: string) => {
      if (Date.now() < cooldownUntilRef.current || scanningRef.current) {
        return
      }

      scanningRef.current = true
      setScanning(true)
      try {
        const result = await createAttendanceScan(rawId, scanTypeRef.current)
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
        await refreshDesk(fromDate, toDate)
      } finally {
        scanningRef.current = false
        setScanning(false)
      }
    },
    [fromDate, refreshDesk, showFeedback, toDate]
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
              LCO Attendance
            </h1>
            <p className="font-serif max-w-2xl text-lg text-foreground/80 italic">
              QR camera stays on — choose Time In or Time Out, then scan or type
              an ID.
            </p>
          </div>
          <AppHeaderActions
            onChangeMode={onChangeMode}
            onLoginClick={onLoginClick}
          />
        </header>

        <AttendanceSummaryCards summary={summary} />

        <section className="surface-card surface-elevated grid h-auto overflow-hidden md:h-[300px] md:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <QrScanner
            paused={coolingDown || scanning}
            onReading={setScanValue}
            onScan={handleScan}
            className="h-[240px] border-b border-border/80 md:h-full md:border-r md:border-b-0"
          />
          <IdScanInput
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
          <AttendanceTable
            records={records}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          <AttendanceRanking ranks={ranks} />
        </div>
      </main>
    </div>
  )
}
