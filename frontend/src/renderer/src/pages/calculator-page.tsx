import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AppHeaderActions } from "@/components/app-header-actions"
import { QrScanner } from "@/components/attendance/qr-scanner"
import {
  BorrowScanInput,
  type BorrowScanStep,
} from "@/components/calculator/borrow-scan-input"
import { CalculatorRanking } from "@/components/calculator/calculator-ranking"
import { CalculatorSummaryCards } from "@/components/calculator/calculator-summary"
import { CalculatorTable } from "@/components/calculator/calculator-table"
import { DeskSyncChip } from "@/components/desk-sync-chip"
import { SCAN_FEEDBACK_MS, toDateInputValue, weekToDateRange } from "@/data/attendance"
import {
  SCAN_COOLDOWN_MS,
  type BorrowType,
  type CalculatorRecord,
  type CalculatorSummary,
  type GroupRank,
} from "@/data/calculator"
import {
  fetchBorrowRanking,
  fetchBorrowScans,
  fetchBorrowSummary,
} from "@/lib/api"
import {
  drainOutbox,
  ensureDeskSnapshot,
  getDeskSyncStatus,
  loadMergedBorrows,
  mergeBorrowRecords,
  rankBorrowsByCollegeLocal,
  rankBorrowsByOrgLocal,
  recordBorrowScan,
  subscribeConnectivity,
  subscribeSyncStatus,
  summarizeBorrowsLocal,
  withTimeout,
  type DeskSyncStatus,
} from "@/lib/offline"
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

const EMPTY_SYNC: DeskSyncStatus = {
  online: true,
  pendingCount: 0,
  syncing: false,
  lastError: null,
  hasSnapshot: false,
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
  const [scanStep, setScanStep] = useState<BorrowScanStep>("member")
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null)
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
  const scanStepRef = useRef(scanStep)
  const pendingMemberIdRef = useRef(pendingMemberId)
  const cooldownUntilRef = useRef(cooldownUntil)
  const scanningRef = useRef(false)
  const feedbackTimerRef = useRef<number | null>(null)
  const recordsRef = useRef(records)

  useEffect(() => {
    scanTypeRef.current = scanType
  }, [scanType])

  useEffect(() => {
    scanStepRef.current = scanStep
  }, [scanStep])

  useEffect(() => {
    pendingMemberIdRef.current = pendingMemberId
  }, [pendingMemberId])

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

  const resetPendingMember = useCallback(() => {
    setPendingMemberId(null)
    setScanStep("member")
    setScanValue("")
  }, [])

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

  const applyOfflineDeskState = useCallback(
    async (nextRecords: CalculatorRecord[]) => {
      setRecords(nextRecords)
      setSummary(await summarizeBorrowsLocal(nextRecords))
      setCollegeRanks(rankBorrowsByCollegeLocal(nextRecords))
      setOrganizationRanks(rankBorrowsByOrgLocal(nextRecords, 5))
      await refreshSyncStatus()
    },
    [refreshSyncStatus]
  )

  const refreshDesk = useCallback(async () => {
    const liveRange = { from: today, to: today }
    const rankingRange = weekToDateRange()
    try {
      const [nextRecords, nextSummary, nextCollege, nextOrg] = await withTimeout(
        Promise.all([
          fetchBorrowScans(liveRange),
          fetchBorrowSummary(),
          fetchBorrowRanking("college", rankingRange),
          fetchBorrowRanking("organization", rankingRange, 5),
        ])
      )
      const merged = await loadMergedBorrows(nextRecords)
      setRecords(merged)
      setSummary(nextSummary)
      setCollegeRanks(nextCollege)
      setOrganizationRanks(nextOrg)
    } catch {
      const merged = await loadMergedBorrows(recordsRef.current)
      await applyOfflineDeskState(merged)
      return
    }
    await refreshSyncStatus()
  }, [applyOfflineDeskState, refreshSyncStatus, today])

  useEffect(() => {
    void ensureDeskSnapshot().then(async () => {
      await drainOutbox()
      await refreshDesk()
    })
    const unsubOnline = subscribeConnectivity(() => {
      void drainOutbox().then(() => refreshDesk())
    })
    const unsubSync = subscribeSyncStatus(() => {
      void refreshSyncStatus()
    })
    const interval = window.setInterval(() => {
      void drainOutbox().then(() => refreshDesk())
    }, 30_000)
    return () => {
      unsubOnline()
      unsubSync()
      window.clearInterval(interval)
    }
  }, [refreshDesk, refreshSyncStatus])

  const handleScanTypeChange = useCallback(
    (type: BorrowType) => {
      setScanType(type)
      resetPendingMember()
      setMessage(null)
      setMessageTone(null)
    },
    [resetPendingMember]
  )

  const handleScan = useCallback(
    async (rawId: string) => {
      if (Date.now() < cooldownUntilRef.current || scanningRef.current) {
        return
      }

      const trimmed = rawId.trim()
      if (!trimmed) {
        showFeedback(
          scanStepRef.current === "calculator"
            ? "Enter or scan a calculator ID."
            : "Enter or scan a member ID.",
          "error"
        )
        return
      }

      if (scanStepRef.current === "member") {
        setPendingMemberId(trimmed.toUpperCase())
        setScanStep("calculator")
        setScanValue("")
        setMessage(null)
        setMessageTone(null)
        return
      }

      const memberId = pendingMemberIdRef.current
      if (!memberId) {
        resetPendingMember()
        showFeedback("Scan the member ID first.", "error")
        return
      }

      scanningRef.current = true
      setScanning(true)
      try {
        const result = await recordBorrowScan(
          memberId,
          scanTypeRef.current,
          trimmed
        )
        if (!result.ok) {
          showFeedback(result.message, "error")
          resetPendingMember()
          return
        }

        void playScanSuccessSound()
        showFeedback(
          result.offline
            ? `Saved offline · ${result.record.name} · ${result.record.type} · ${result.record.calculatorId}`
            : `Recorded ${result.record.name} · ${result.record.type} · ${result.record.calculatorId}`,
          "success"
        )
        resetPendingMember()
        setCooldownUntil(Date.now() + SCAN_COOLDOWN_MS)
        setNow(Date.now())

        if (result.offline) {
          const merged = mergeBorrowRecords(recordsRef.current, [result.record])
          await applyOfflineDeskState(merged)
        }

        void refreshDesk()
      } finally {
        scanningRef.current = false
        setScanning(false)
      }
    },
    [applyOfflineDeskState, refreshDesk, resetPendingMember, showFeedback]
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
              QR camera stays on — choose Borrow or Return, scan the member ID,
              then the calculator ID.
            </p>
            <DeskSyncChip status={syncStatus} />
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
            scanStep={scanStep}
            pendingMemberId={pendingMemberId}
            message={message}
            messageTone={messageTone}
            coolingDown={coolingDown || scanning}
            onChange={setScanValue}
            onScanTypeChange={handleScanTypeChange}
            onSubmitId={handleScan}
            onClearPendingMember={resetPendingMember}
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
