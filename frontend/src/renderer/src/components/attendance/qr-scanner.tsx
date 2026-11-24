import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode"

import { Button } from "@/components/ui/button"
import { SCAN_FEEDBACK_MS } from "@/data/attendance"
import { cn } from "@/lib/utils"

type QrScannerProps = {
  enabled?: boolean
  paused?: boolean
  /** Fires on every successful decode so the desk can show live reading. */
  onReading?: (decodedText: string) => void
  onScan: (decodedText: string) => void
  className?: string
}

/** Serialize camera open/close so StrictMode remounts don't fight for the device. */
let cameraGate: Promise<void> = Promise.resolve()

function enqueueCameraTask<T>(task: () => Promise<T>): Promise<T> {
  const run = cameraGate.then(task, task)
  cameraGate = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForElementSize(
  element: HTMLElement,
  timeoutMs = 4000
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (element.clientWidth > 8 && element.clientHeight > 8) {
      return
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(
    `Camera panel is too small (${element.clientWidth}×${element.clientHeight}).`
  )
}

function stopAllVideosIn(element: HTMLElement): void {
  const videos = element.querySelectorAll("video")
  videos.forEach((video) => {
    const stream = video.srcObject
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    video.srcObject = null
    video.removeAttribute("src")
    video.load()
  })
}

async function pickCameraId(): Promise<string | MediaTrackConstraints> {
  try {
    const cameras = await Html5Qrcode.getCameras()
    if (cameras.length > 0) {
      const back = cameras.find((camera) =>
        /back|rear|environment/i.test(camera.label)
      )
      return (back ?? cameras[0]).id
    }
  } catch {
    // Fall through.
  }
  return { facingMode: "user" }
}

export function QrScanner({
  enabled = true,
  paused = false,
  onReading,
  onScan,
  className,
}: QrScannerProps) {
  const scannerId = useId().replace(/:/g, "")
  const elementId = `qr-reader-${scannerId}`
  const hostRef = useRef<HTMLDivElement | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const pausedRef = useRef(paused)
  const onReadingRef = useRef(onReading)
  const onScanRef = useRef(onScan)
  const lastEmittedRef = useRef<{ value: string; at: number } | null>(null)
  const clearReadingTimerRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const [liveReading, setLiveReading] = useState<string | null>(null)
  const [seeking, setSeeking] = useState(false)

  const clearReadingFlash = useCallback(() => {
    if (clearReadingTimerRef.current !== null) {
      window.clearTimeout(clearReadingTimerRef.current)
      clearReadingTimerRef.current = null
    }
    setLiveReading(null)
    onReadingRef.current?.("")
  }, [])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    onReadingRef.current = onReading
  }, [onReading])

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const releaseCamera = useCallback(async () => {
    const active = scannerRef.current
    scannerRef.current = null
    const host = hostRef.current

    if (active) {
      try {
        if (active.isScanning) {
          await active.stop()
        }
      } catch {
        // Already stopped.
      }
      try {
        active.clear()
      } catch {
        // Ignore clear errors.
      }
    }

    if (host) {
      stopAllVideosIn(host)
    }

    await sleep(400)
  }, [])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setError(null)
    setStarting(true)
    setSeeking(false)
    setLiveReading(null)
    lastEmittedRef.current = null

    void enqueueCameraTask(async () => {
      try {
        await releaseCamera()
        if (cancelled) return

        const host = hostRef.current
        if (!host) {
          setStarting(false)
          setError("Camera container is missing.")
          return
        }

        await waitForElementSize(host)
        if (cancelled) return

        const cameraConfig = await pickCameraId()
        if (cancelled) return

        // Prefer native BarcodeDetector in Chromium/Electron when available.
        const scanner = new Html5Qrcode(elementId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
        })
        scannerRef.current = scanner

        // Full-frame scan (no qrbox). Cover-crop CSS was breaking decode before.
        const config = {
          fps: 15,
          disableFlip: false,
        }

        const flashReading = (text: string) => {
          if (clearReadingTimerRef.current !== null) {
            window.clearTimeout(clearReadingTimerRef.current)
          }
          setLiveReading(text)
          setSeeking(false)
          onReadingRef.current?.(text)
          clearReadingTimerRef.current = window.setTimeout(() => {
            clearReadingFlash()
            setSeeking(true)
            clearReadingTimerRef.current = null
          }, SCAN_FEEDBACK_MS)
        }

        const onSuccess = (decodedText: string) => {
          const text = decodedText.trim()
          if (!text) return

          // During cooldown, ignore further frames so "Reading…" can clear.
          if (pausedRef.current) return

          const now = Date.now()
          const last = lastEmittedRef.current
          if (last && last.value === text && now - last.at < 1200) {
            return
          }
          lastEmittedRef.current = { value: text, at: now }
          flashReading(text)
          onScanRef.current(text)
        }

        try {
          await scanner.start(cameraConfig, config, onSuccess, () => undefined)
        } catch {
          await scanner.start(
            { facingMode: "user" },
            config,
            onSuccess,
            () => undefined
          )
        }

        if (!cancelled) {
          setStarting(false)
          setSeeking(true)
        }
      } catch (err) {
        if (cancelled) return
        setStarting(false)
        setSeeking(false)
        const name = err instanceof DOMException ? err.name : ""
        const message =
          err instanceof Error ? err.message : "Unable to access the camera."

        let hint = "Click Retry camera, or use the ID field."
        if (
          name === "NotAllowedError" ||
          /notallowed|permission/i.test(message)
        ) {
          hint =
            "Camera permission was denied. Fully quit Electron and reopen the app window."
        } else if (name === "NotFoundError" || /notfound/i.test(message)) {
          hint = "No webcam detected. Plug one in, then retry."
        } else if (
          name === "NotReadableError" ||
          /notreadable|could not start video|busy|in use/i.test(message)
        ) {
          hint =
            "Camera is locked by another window/tab. Close other camera apps and any browser tab on localhost:5173, wait a second, then retry."
        }

        setError(`${message} ${hint}`)
        await releaseCamera()
      }
    })

    return () => {
      cancelled = true
      clearReadingFlash()
      void enqueueCameraTask(async () => {
        await releaseCamera()
      })
    }
  }, [clearReadingFlash, elementId, enabled, releaseCamera, restartKey])

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-transparent", className)}>
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          QR camera
        </p>
        {paused && !error ? (
          <p className="text-xs font-medium text-deep-lime" role="status">
            Cooldown…
          </p>
        ) : liveReading ? (
          <p
            className="max-w-[60%] truncate font-mono text-xs font-semibold tracking-wide text-foreground"
            title={liveReading}
            role="status"
            aria-live="polite"
          >
            Reading {liveReading}
          </p>
        ) : seeking && !starting ? (
          <p className="text-xs text-muted-foreground" role="status">
            Seeking QR…
          </p>
        ) : null}
      </div>

      <div className="surface-inset relative mx-4 mb-4 min-h-0 flex-1 overflow-hidden rounded-2xl">
        <div
          ref={hostRef}
          id={elementId}
          className="qr-scanner-viewport h-full w-full"
        />
        {liveReading && !error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase">
              Live read
            </p>
            <p className="truncate font-mono text-sm font-semibold tracking-wide text-white">
              {liveReading}
            </p>
          </div>
        )}
        {starting && !error && (
          <p className="absolute inset-x-0 bottom-2 z-10 px-3 text-center text-xs text-muted-foreground">
            Starting camera…
          </p>
        )}
        {error && (
          <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 rounded-b-2xl bg-card/95 px-3 py-2 backdrop-blur-md">
            <p className="text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setRestartKey((value) => value + 1)}
            >
              Retry camera
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
