import { create } from 'zustand'
import type { DownloadItemData } from '../components/DownloadItem'

/* ── Types ── */

interface DownloadStore {
  items: DownloadItemData[]

  /* Actions */
  addItem: (item: DownloadItemData) => void
  addItems: (items: DownloadItemData[]) => void
  removeItem: (id: string) => void
  updateItem: (id: string, patch: Partial<DownloadItemData>) => void
  clearCompleted: () => void
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

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((s) => ({
      items: [...s.items, item],
    })),

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
        d.id === id ? { ...d, status: 'downloading' as const, speed: '恢复中...' } : d
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
}))
