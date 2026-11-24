import { app, BrowserWindow, nativeImage, session, shell } from "electron"
import { existsSync } from "node:fs"
import { join } from "node:path"

import appIconPath from "../../resources/icon.png?asset"

import { installLinuxAppIcon } from "./linux-icon"

const isDev = !app.isPackaged

function resolveAppIconPath(): string {
  const candidates = [
    appIconPath,
    join(process.cwd(), "resources/icon.png"),
    join(app.getAppPath(), "resources/icon.png"),
  ]
  return candidates.find((path) => existsSync(path)) ?? appIconPath
}

const resolvedIconPath = resolveAppIconPath()
const appIcon = nativeImage.createFromPath(resolvedIconPath)

// Must run before ready: auto-accept camera/mic prompts (Electron has no visible bar).
app.commandLine.appendSwitch("use-fake-ui-for-media-stream")
app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer")
// Help GNOME/Wayland match our .desktop entry instead of Electron’s gear.
if (process.platform === "linux") {
  app.setName("LCO Attendance")
  app.setDesktopName("lco-attendance.desktop")
  app.commandLine.appendSwitch("class", "lco-attendance")
}

function allowMediaPermission(permission: string): boolean {
  return (
    permission === "media" ||
    permission === "mediaKeySystem" ||
    permission === "display-capture" ||
    permission === "speaker-selection" ||
    permission === "clipboard-sanitized-write"
  )
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: "LCO Attendance",
    icon: appIcon.isEmpty() ? undefined : appIcon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (!appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon)
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(() => {
  if (!appIcon.isEmpty()) {
    installLinuxAppIcon(resolvedIconPath)
    if (process.platform === "darwin") {
      app.dock?.setIcon(appIcon)
    }
  }

  const ses = session.defaultSession

  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowMediaPermission(permission))
  })

  ses.setPermissionCheckHandler((_webContents, permission) =>
    allowMediaPermission(permission)
  )

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
