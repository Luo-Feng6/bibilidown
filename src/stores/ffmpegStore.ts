import { create } from 'zustand'

/* ── Types ── */

export type FfmpegStatus = 'checking' | 'available' | 'missing' | 'error'
export type DownloadPhase = 'idle' | 'downloading' | 'extracting' | 'installing' | 'complete' | 'error'

interface FfmpegStore {
  status: FfmpegStatus
  path: string | null
  checkedAt: number | null

  /** FFmpeg 下载状态 */
  downloadPhase: DownloadPhase
  downloadProgress: number      // 0-100
  downloadMessage: string
  downloadError: string | null

  /** 检查 FFmpeg 是否可用 */
  checkFfmpeg: () => Promise<void>
  /** 手动设置状态 */
  setStatus: (status: FfmpegStatus) => void
  /** 自动下载安装 FFmpeg */
  downloadFfmpeg: () => Promise<void>
  /** 重置下载状态 */
  resetDownload: () => void
}

/* ── Store ── */

export const useFfmpegStore = create<FfmpegStore>((set, get) => ({
  status: 'checking',
  path: null,
  checkedAt: null,

  downloadPhase: 'idle',
  downloadProgress: 0,
  downloadMessage: '',
  downloadError: null,

  checkFfmpeg: async () => {
    // 浏览器模式：不需要 FFmpeg，直接标记为 available
    if (!window.electronAPI) {
      set({ status: 'available', path: null, checkedAt: Date.now() })
      return
    }

    set({ status: 'checking' })

    try {
      const result = await window.electronAPI.checkFfmpeg()
      set({
        status: result.available ? 'available' : 'missing',
        path: result.path || null,
        checkedAt: Date.now(),
      })
    } catch {
      set({ status: 'error', path: null, checkedAt: Date.now() })
    }
  },

  setStatus: (status) => set({ status }),

  downloadFfmpeg: async () => {
    if (!window.electronAPI) return

    set({
      downloadPhase: 'downloading',
      downloadProgress: 0,
      downloadMessage: '正在下载 FFmpeg...',
      downloadError: null,
    })

    // Listen for progress events from main process
    const cleanup = window.electronAPI.onFfmpegDownloadProgress((data) => {
      set({
        downloadPhase: data.phase as DownloadPhase,
        downloadProgress: data.percent,
        downloadMessage: data.message,
      })
    })

    try {
      const result = await window.electronAPI.downloadFfmpeg()
      cleanup()

      if (result.success) {
        set({
          downloadPhase: 'complete',
          downloadProgress: 100,
          downloadMessage: 'FFmpeg 安装完成',
        })
        // Re-check FFmpeg to update the availability status
        await get().checkFfmpeg()
        // After check, reset download state if FFmpeg is now available
        const currentStatus = get().status
        if (currentStatus === 'available') {
          set({
            downloadPhase: 'idle',
            downloadProgress: 0,
            downloadMessage: '',
            downloadError: null,
          })
        }
      } else {
        set({
          downloadPhase: 'error',
          downloadError: result.error || '下载失败',
        })
      }
    } catch (err) {
      cleanup()
      set({
        downloadPhase: 'error',
        downloadError: (err as Error).message || '下载失败',
      })
    }
  },

  resetDownload: () =>
    set({
      downloadPhase: 'idle',
      downloadProgress: 0,
      downloadMessage: '',
      downloadError: null,
    }),
}))
