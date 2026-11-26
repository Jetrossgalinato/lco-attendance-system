import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AppHeaderActions } from "@/components/app-header-actions"
import { AttendanceRanking } from "@/components/attendance/attendance-ranking"
import { AttendanceSummaryCards } from "@/components/attendance/attendance-summary"
import { AttendanceTable } from "@/components/attendance/attendance-table"
import { IdScanInput } from "@/components/attendance/id-scan-input"
import { QrScanner } from "@/components/attendance/qr-scanner"
import { DeskSyncChip } from "@/components/desk-sync-chip"
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
  fetchAttendanceRanking,
  fetchAttendanceScans,
  fetchAttendanceSummary,
} from "@/lib/api"
import {
  drainOutbox,
  ensureDeskSnapshot,
  getDeskSyncStatus,
  loadMergedAttendance,
  mergeAttendanceRecords,
  rankAttendanceLocal,
  recordAttendanceScan,
  subscribeConnectivity,
  subscribeSyncStatus,
  summarizeAttendanceLocal,
  withTimeout,
  type DeskSyncStatus,
} from "@/lib/offline"
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

const EMPTY_SYNC: DeskSyncStatus = {
  online: true,
  pendingCount: 0,
  syncing: false,
  lastError: null,
  hasSnapshot: false,
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
  const [syncStatus, setSyncStatus] = useState<DeskSyncStatus>(EMPTY_SYNC)

  const scanTypeRef = useRef(scanType)
  const cooldownUntilRef = useRef(cooldownUntil)
  const scanningRef = useRef(false)
  const feedbackTimerRef = useRef<number | null>(null)
  const recordsRef = useRef(records)

  useEffect(() => {
    scanTypeRef.current = scanType
  }, [scanType])

  useEffect(() => {
    cooldownUntilRef.current = cooldownUntil
  }, [cooldownUntil])

  useEffect(() => {
    recordsRef.current = records
  }, [records])

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

  const refreshSyncStatus = useCallback(async () => {
    setSyncStatus(await getDeskSyncStatus())
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

  const applyOfflineDeskState = useCallback(async (nextRecords: AttendanceRecord[]) => {
    setRecords(nextRecords)
    setSummary(summarizeAttendanceLocal(nextRecords))
    setRanks(rankAttendanceLocal(nextRecords, 5))
    await refreshSyncStatus()
  }, [refreshSyncStatus])

  const refreshDesk = useCallback(
    async (from: string, to: string) => {
      const range = { from, to }
      const rankingRange = weekToDateRange()
      try {
        const [nextRecords, nextSummary, nextRanks] = await withTimeout(
          Promise.all([
            fetchAttendanceScans(range),
            fetchAttendanceSummary(range),
            fetchAttendanceRanking(rankingRange, 5),
          ])
        )
        const merged = await loadMergedAttendance(nextRecords)
        setRecords(merged)
        setSummary(nextSummary)
        setRanks(nextRanks)
      } catch {
        const merged = await loadMergedAttendance(recordsRef.current)
        await applyOfflineDeskState(merged)
        return
      }
      await refreshSyncStatus()
    },
    [applyOfflineDeskState, refreshSyncStatus]
  )

  useEffect(() => {
    void ensureDeskSnapshot().then(async () => {
      await drainOutbox()
      await refreshDesk(fromDate, toDate)
    })
    const unsubOnline = subscribeConnectivity(() => {
      void drainOutbox().then(() => refreshDesk(fromDate, toDate))
    })
    const unsubSync = subscribeSyncStatus(() => {
      void refreshSyncStatus()
    })
    const interval = window.setInterval(() => {
      void drainOutbox().then(() => refreshDesk(fromDate, toDate))
    }, 30_000)
    return () => {
      unsubOnline()
      unsubSync()
      window.clearInterval(interval)
    }
  }, [fromDate, toDate, refreshDesk, refreshSyncStatus])

  const handleScan = useCallback(
    async (rawId: string) => {
      if (Date.now() < cooldownUntilRef.current || scanningRef.current) {
        return
      }

      scanningRef.current = true
      setScanning(true)
      try {
        const result = await recordAttendanceScan(rawId, scanTypeRef.current)
        if (!result.ok) {
          showFeedback(result.message, "error")
          return
        }

        void playScanSuccessSound()
        showFeedback(
          result.offline
            ? `Saved offline · ${result.record.name} · ${result.record.type}`
            : `Recorded ${result.record.name} · ${result.record.type}`,
          "success"
        )
        setCooldownUntil(Date.now() + SCAN_COOLDOWN_MS)
        setNow(Date.now())

        if (result.offline) {
          const merged = mergeAttendanceRecords(recordsRef.current, [
            result.record,
          ])
          await applyOfflineDeskState(merged)
        }

        void refreshDesk(fromDate, toDate)
      } finally {
        scanningRef.current = false
        setScanning(false)
      }
    },
    [
      applyOfflineDeskState,
      fromDate,
      refreshDesk,
      showFeedback,
      toDate,
    ]
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
            <DeskSyncChip status={syncStatus} />
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
