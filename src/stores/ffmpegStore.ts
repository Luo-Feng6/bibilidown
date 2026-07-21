import { create } from 'zustand'

/* ── Types ── */

export type FfmpegStatus = 'checking' | 'available' | 'missing' | 'error'

interface FfmpegStore {
  status: FfmpegStatus
  path: string | null
  checkedAt: number | null

  /** 检查 FFmpeg 是否可用 */
  checkFfmpeg: () => Promise<void>
  /** 手动设置状态（例如关闭 banner 后重置 etc.） */
  setStatus: (status: FfmpegStatus) => void
}

/* ── Store ── */

export const useFfmpegStore = create<FfmpegStore>((set) => ({
  status: 'checking',
  path: null,
  checkedAt: null,

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
}))
