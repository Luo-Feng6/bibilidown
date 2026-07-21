/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    platform: string
  }
  initGeetest?: (options: Record<string, unknown>, callback: (captchaObj: unknown) => void) => void
}
