/**
 * 运行环境检测工具。
 * 统一入口，避免在多个文件重复定义 `isElectron()`。
 */

/** 是否运行在 Electron 桌面环境 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI
}

/** 获取 Electron 版本号（浏览器环境返回 null） */
export function getElectronVersion(): string | null {
  if (typeof navigator === 'undefined') return null
  return navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] ?? null
}

/** 获取 Chromium 版本号 */
export function getChromeVersion(): string | null {
  if (typeof navigator === 'undefined') return null
  return navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? null
}
