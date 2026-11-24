export type Theme = "light" | "dark"

const STORAGE_KEY = "lco-theme"

export function getStoredTheme(): Theme | null {
  const value = localStorage.getItem(STORAGE_KEY)
  if (value === "light" || value === "dark") {
    return value
  }
  return null
}

export function getPreferredTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function resolveTheme(theme: Theme | null = getStoredTheme()): Theme {
  return theme ?? getPreferredTheme()
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

export function toggleTheme(current: Theme): Theme {
  const next: Theme = current === "dark" ? "light" : "dark"
  applyTheme(next)
  return next
}
