import { useState, type FormEvent } from "react"
import { ChevronLeft } from "lucide-react"

import { useAlert } from "@/components/alert-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  type AuthSession,
} from "@/data/auth"
import { login } from "@/lib/api"

type LoginPageProps = {
  onSuccess: (session: AuthSession) => void
  onBack: () => void
}

export function LoginPage({ onSuccess, onBack }: LoginPageProps) {
  const { showAlert } = useAlert()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    try {
      const result = await login(email, password)

      if (!result.ok) {
        showAlert({
          tone: "error",
          title: "Login failed",
          message: result.message,
        })
        return
      }

      showAlert({
        tone: "success",
        title: "Welcome back",
        message: `Signed in as ${result.session.email}`,
      })
      onSuccess(result.session)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell text-foreground">
      <div className="relative z-[1] flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6 md:px-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onBack}
          >
            <ChevronLeft />
            Back
          </Button>
          <ModeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-16 md:px-8">
          <section className="surface-card surface-elevated w-full max-w-md px-7 py-8 sm:px-8 sm:py-9">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Admin access
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
              Sign in
            </h1>
            <p className="font-serif mt-2 text-base leading-relaxed text-foreground/80 italic">
              Enter your credentials to open the admin dashboard.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Email
                </span>
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={DEMO_EMAIL}
                  disabled={submitting}
                />
              </label>

              <label className="block space-y-2">
                <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Password
                </span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  disabled={submitting}
                />
              </label>

              <Button
                type="submit"
                className="mt-2 h-11 w-full cursor-pointer"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Demo hint:{" "}
              <span className="font-mono text-foreground">
                {DEMO_EMAIL} / {DEMO_PASSWORD}
              </span>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}
