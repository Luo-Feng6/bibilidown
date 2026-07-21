import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DownloadItemData } from '../components/DownloadItem'

/* ── Types ── */

interface DownloadStore {
  items: DownloadItemData[]

  /* Actions */
  addItem: (item: DownloadItemData) => { duplicate: boolean; id: string; reused?: boolean }
  addItems: (items: DownloadItemData[]) => void
  removeItem: (id: string) => void
  updateItem: (id: string, patch: Partial<DownloadItemData>) => void
  clearCompleted: () => void
  clearFailed: () => void
  clearAll: () => void

  /* Convenience actions */
  pauseItem: (id: string) => void
  resumeItem: (id: string) => void
  retryItem: (id: string) => void
  cancelItem: (id: string) => void

  /* Derived helpers */
  activeCount: () => number
  completedCount: () => number
  failedCount: () => number
}

/* ── Store ── */

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, get) => ({
  items: [],

  addItem: (item) => {
    /* Duplicate detection: only block if identical bvid+cid+quality+mode (excluding failed) */
    if (item.bvid && item.cid != null) {
      const existing = get().items.find(
        (d) =>
          d.bvid === item.bvid &&
          d.cid === item.cid &&
          d.quality === item.quality &&
          d.downloadMode === item.downloadMode &&
          d.status !== 'failed'
      )
      if (existing) {
        // completed / paused → re-queue the existing item instead of blocking
        if (existing.status === 'completed' || existing.status === 'paused') {
          set((s) => ({
            items: s.items.map((d) =>
              d.id === existing.id
                ? { ...d, status: 'queued' as const, progress: 0, downloadedSize: '0MB', speed: '等待中', eta: '' }
                : d
            ),
          }))
          return { duplicate: false, id: existing.id, reused: true }
        }
        // queued / downloading → genuinely duplicate
        return { duplicate: true, id: item.id }
      }
    }
    set((s) => ({
      items: [...s.items, item],
    }))
    return { duplicate: false, id: item.id }
  },

  addItems: (items) =>
    set((s) => ({
      items: [...s.items, ...items],
    })),

  removeItem: (id) =>
    set((s) => ({
      items: s.items.filter((d) => d.id !== id),
    })),

  updateItem: (id, patch) =>
    set((s) => ({
      items: s.items.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  clearCompleted: () =>
    set((s) => ({
      items: s.items.filter((d) => d.status !== 'completed'),
    })),

  clearFailed: () =>
    set((s) => ({
      items: s.items.filter((d) => d.status !== 'failed'),
    })),

  clearAll: () => set({ items: [] }),

  /* ── Convenience actions ── */

  pauseItem: (id) =>
    set((s) => ({
      items: s.items.map((d) =>
        d.id === id ? { ...d, status: 'paused' as const } : d
      ),
    })),

  resumeItem: (id) =>
    set((s) => ({
      items: s.items.map((d) =>
        d.id === id ? { ...d, status: 'queued' as const, speed: '等待中' } : d
      ),
    })),

  retryItem: (id) =>
    set((s) => ({
      items: s.items.map((d) =>
        d.id === id
          ? { ...d, status: 'queued' as const, progress: 0, downloadedSize: '0MB',
              errorMessage: undefined }
          : d
      ),
    })),

  cancelItem: (id) =>
    set((s) => ({
      items: s.items.filter((d) => d.id !== id),
    })),

  /* ── Derived helpers ── */

  activeCount: () =>
    get().items.filter(
      (d) => d.status === 'downloading' || d.status === 'paused' || d.status === 'queued'
    ).length,

  completedCount: () =>
    get().items.filter((d) => d.status === 'completed').length,

  failedCount: () =>
    get().items.filter((d) => d.status === 'failed').length,
}),
    {
      name: 'bibilidown-downloads',
      /** Opt out of automatic hydration — we manually call rehydrate() in App.tsx
       *  to avoid the zustand v5 persist infinite re-render cycle. */
      skipHydration: true,
      /* Only persist non-ephemeral fields; reset runtime state on reload */
      partialize: (state) => ({
        items: state.items.map((item) => ({
          id: item.id,
          title: item.title,
          quality: item.quality,
          format: item.format,
          totalSize: item.totalSize,
          bvid: item.bvid,
          cid: item.cid,
          inputUrl: item.inputUrl,
          downloadMode: item.downloadMode,
          status: 'paused' as const,
          progress: 0,
          downloadedSize: '0MB',
          speed: '等待恢复',
          eta: '',
          errorMessage: undefined,
          speedHistory: [],
        })),
      }),
    }
  )
)
