/** Type declaration for the Electron preload API exposed via contextBridge. */

interface DownloadProgress {
  filePath: string
  downloadedSize: number
  totalSize: number
  speed: number
}

interface SaveToDiskOptions {
  url: string
  filePath: string
  headers?: Record<string, string>
  referer?: string
}

interface SaveToDiskResult {
  success: boolean
  filePath: string
  size: number
  error?: string
}

interface FfmpegMergeOptions {
  videoPath: string
  audioPath: string
  outputPath: string
}

interface FfmpegMergeResult {
  success: boolean
  outputPath: string
  error?: string
}

interface FfmpegCheckResult {
  available: boolean
  path: string
}

interface FfmpegDownloadProgress {
  phase: string
  percent: number
  message: string
}

interface FfmpegDownloadResult {
  success: boolean
  path?: string
  error?: string
}

interface TrayStats {
  active: number
  completed: number
  total: number
}

interface ElectronAPI {
  /* Window controls */
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>

  /* Dialogs */
  selectDirectory: () => Promise<string | null>
  showSaveDialog: (defaultName: string) => Promise<string | null>

  /* App info */
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  getTempDir: () => Promise<string>
  getDownloadPath: () => Promise<string>

  /* File operations */
  moveFile: (options: { from: string; to: string }) => Promise<{ success: boolean; error?: string }>

  /* Download to disk */
  saveToDisk: (options: SaveToDiskOptions) => Promise<SaveToDiskResult>

  /* FFmpeg */
  downloadFfmpeg: () => Promise<FfmpegDownloadResult>
  checkFfmpeg: () => Promise<FfmpegCheckResult>
  mergeWithFfmpeg: (options: FfmpegMergeOptions) => Promise<FfmpegMergeResult>

  /* Events */
  onDownloadProgress: (callback: (data: DownloadProgress) => void) => () => void
  onFfmpegDownloadProgress: (callback: (data: FfmpegDownloadProgress) => void) => () => void
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void

  /* Tray */
  updateTrayStats: (stats: TrayStats) => Promise<void>
  sendTrayNotification: (options: { title: string; body: string }) => Promise<void>

  /* App quit */
  quitApp: () => Promise<void>
}

interface Window {
  electronAPI?: ElectronAPI
}
