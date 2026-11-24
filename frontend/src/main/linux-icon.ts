import { app } from "electron"
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const APP_ID = "lco-attendance"
const DESKTOP_FILE = `${APP_ID}.desktop`

/**
 * On Linux (esp. GNOME/Wayland), the dock uses a .desktop entry + icon theme,
 * not BrowserWindow({ icon }). Install both so the LCO logo replaces Electron’s gear.
 */
export function installLinuxAppIcon(iconPath: string): void {
  if (process.platform !== "linux") return

  const home = homedir()
  const appsDir = join(home, ".local/share/applications")
  const iconThemeRoot = join(home, ".local/share/icons/hicolor")

  mkdirSync(appsDir, { recursive: true })

  for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
    const dir = join(iconThemeRoot, `${size}x${size}`, "apps")
    mkdirSync(dir, { recursive: true })
    try {
      copyFileSync(iconPath, join(dir, `${APP_ID}.png`))
    } catch {
      // Ignore copy failures; absolute Icon path below still works.
    }
  }

  // Absolute Icon path is the most reliable for dock matching.
  const electronBin = process.execPath
  const appRoot = app.getAppPath()
  const execLine = [
    quote(electronBin),
    "--no-sandbox",
    quote(appRoot),
  ].join(" ")

  const desktopBody = `Version=1.0
Type=Application
Name=LCO Attendance
Comment=LCO Attendance desktop app
Exec=${execLine}
Icon=${iconPath}
Terminal=false
Categories=Utility;
StartupNotify=true
StartupWMClass=Electron
`

  // App-specific entry (matched via setDesktopName).
  writeFileSync(
    join(appsDir, DESKTOP_FILE),
    `[Desktop Entry]\n${desktopBody}`,
    "utf8"
  )

  // Dev/runtime override: GNOME docks Electron windows by WM_CLASS=Electron.
  writeFileSync(
    join(appsDir, "electron.desktop"),
    `[Desktop Entry]\n${desktopBody}NoDisplay=true\n`,
    "utf8"
  )
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}
