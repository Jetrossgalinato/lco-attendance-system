import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  applyTheme,
  resolveTheme,
  toggleTheme,
  type Theme,
} from "@/lib/theme"

export function ModeToggle() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const initial = resolveTheme()
    applyTheme(initial)
    setTheme(initial)
  }, [])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="cursor-pointer border-transparent bg-transparent shadow-none hover:bg-muted/80"
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      onClick={() => setTheme((current) => toggleTheme(current))}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
      <span className="sr-only">
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </span>
    </Button>
  )
}
