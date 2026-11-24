export interface DesktopApi {
  platform: NodeJS.Platform
}

declare global {
  interface Window {
    api: DesktopApi
  }
}

export {}
