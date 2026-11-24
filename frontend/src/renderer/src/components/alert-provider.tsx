import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  AlertToast,
  type AlertTone,
} from "@/components/ui/alert-toast"

const AUTO_DISMISS_MS = 3800
const EXIT_MS = 420

type AlertPayload = {
  tone: AlertTone
  title: string
  message?: string
}

type AlertContextValue = {
  showAlert: (payload: AlertPayload) => void
}

const AlertContext = createContext<AlertContextValue | null>(null)

export function useAlert(): AlertContextValue {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider")
  }
  return context
}

type AlertProviderProps = {
  children: ReactNode
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [payload, setPayload] = useState<AlertPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const dismissTimerRef = useRef<number | null>(null)
  const exitTimerRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
  }, [])

  const hideAlert = useCallback(() => {
    setVisible(false)
    clearTimers()
    exitTimerRef.current = window.setTimeout(() => {
      setPayload(null)
      exitTimerRef.current = null
    }, EXIT_MS)
  }, [clearTimers])

  const showAlert = useCallback(
    (next: AlertPayload) => {
      clearTimers()
      setPayload(next)
      setVisible(false)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setVisible(true)
        })
      })
      dismissTimerRef.current = window.setTimeout(() => {
        hideAlert()
      }, AUTO_DISMISS_MS)
    },
    [clearTimers, hideAlert]
  )

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  const value = useMemo(() => ({ showAlert }), [showAlert])

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div className="alert-toast-host pointer-events-none fixed top-4 right-4 z-[100] flex justify-end px-0 sm:right-6">
        {payload ? (
          <AlertToast
            tone={payload.tone}
            title={payload.title}
            message={payload.message}
            visible={visible}
            onClose={hideAlert}
          />
        ) : null}
      </div>
    </AlertContext.Provider>
  )
}
