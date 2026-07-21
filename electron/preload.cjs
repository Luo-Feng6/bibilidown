const { contextBridge, ipcRenderer } = require('electron')

/**
 * Preload script — exposes a safe, typed API to the renderer process
 * via contextBridge. The renderer accesses it via `window.electronAPI`.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /* ── Window controls ── */
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  /* ── Dialogs ── */
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  showSaveDialog: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  /* ── App info ── */
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getTempDir: () => ipcRenderer.invoke('app:getTempDir'),
  getDownloadPath: () => ipcRenderer.invoke('app:getDownloadPath'),

  /* ── Download to disk ── */
  /**
   * Download a file from a URL and save it to a local path.
   * Main process handles the HTTP download + fs write.
   *
   * @param {{ url: string, filePath: string, headers?: Record<string,string>, referer?: string }}
   * @returns {Promise<{ success: boolean, filePath: string, size: number, error?: string }>}
   */
  saveToDisk: (options) => ipcRenderer.invoke('download:saveToDisk', options),

  /* ── FFmpeg ── */
  /**
   * Download and auto-install FFmpeg for the current platform.
   * @returns {Promise<{ success: boolean, path?: string, error?: string }>}
   */
  downloadFfmpeg: () => ipcRenderer.invoke('ffmpeg:download'),

  /**
   * Listen for FFmpeg download progress updates from the main process.
   * @param {(data: { phase: string, percent: number, message: string }) => void} callback
   * @returns {() => void} Cleanup function
   */
  onFfmpegDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('ffmpeg:download-progress', handler)
    return () => ipcRenderer.removeListener('ffmpeg:download-progress', handler)
  },

  /**
   * Check if FFmpeg is available on the system.
   * @returns {Promise<{ available: boolean, path: string }>}
   */
  checkFfmpeg: () => ipcRenderer.invoke('ffmpeg:check'),

  /**
   * Merge video + audio streams using FFmpeg.
   *
   * @param {{ videoPath: string, audioPath: string, outputPath: string }}
   * @returns {Promise<{ success: boolean, outputPath: string, error?: string }>}
   */
  mergeWithFfmpeg: (options) => ipcRenderer.invoke('ffmpeg:merge', options),

  /* ── File operations ── */
  /**
   * Move/rename a file.
   * @param {{ from: string, to: string }}
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  moveFile: (options) => ipcRenderer.invoke('file:move', options),

  /* ── Download progress events (main → renderer) ── */
  /**
   * Listen for download progress updates from the main process.
   * @param {(data: { filePath: string, downloadedSize: number, totalSize: number, speed: number }) => void} callback
   * @returns {() => void} Cleanup function
   */
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('download:progress', handler)
    return () => ipcRenderer.removeListener('download:progress', handler)
  },

  /* ── Window state events ── */
  onMaximizeChange: (callback) => {
    const handler = (_event, isMaximized) => callback(isMaximized)
    ipcRenderer.on('window:maximize-change', handler)
    // Return cleanup function
    return () => ipcRenderer.removeListener('window:maximize-change', handler)
  },

  /* ── Tray ── */
  /**
   * Update tray menu with download statistics.
   * @param {{ active: number, completed: number, total: number }} stats
   */
  updateTrayStats: (stats) => ipcRenderer.invoke('tray:updateStats', stats),

  /**
   * Show a system notification (falls back to tray balloon).
   * @param {{ title: string, body: string }} options
   */
  sendTrayNotification: (options) => ipcRenderer.invoke('tray:notification', options),

  /* ── App quit ── */
  /**
   * Actually quit the application (instead of minimizing to tray).
   */
  quitApp: () => ipcRenderer.invoke('app:quit'),
})
