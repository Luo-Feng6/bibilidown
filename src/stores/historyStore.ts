import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ── Types ── */

export interface HistoryEntry {
  /** Unique id (same as download id) */
  id: string
  /** Video title */
  title: string
  /** BV 号（重新下载时需要） */
  bvid?: string
  /** Downloaded quality label, e.g. "1080P60" */
  quality: string
  /** Format: "mp4" / "flac" */
  format: string
  /** Final file size */
  size: string
  /** Download completion timestamp */
  downloadedAt: number
  /** Result status */
  status: 'completed' | 'failed'
  /** Error message if failed */
  errorMessage?: string
}

interface HistoryStore {
  entries: HistoryEntry[]

  /* Actions */
  addEntry: (entry: HistoryEntry) => void
  removeEntry: (id: string) => void
  clearHistory: () => void
  exportAll: () => HistoryEntry[]
  importEntries: (entries: HistoryEntry[]) => void
}

/* ── Store ── */

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((s) => {
          // 去重：同 id 的条目覆盖
          const filtered = s.entries.filter((e) => e.id !== entry.id)
          // 最多保留 500 条
          const merged = [entry, ...filtered].slice(0, 500)
          return { entries: merged }
        }),

      removeEntry: (id) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
        })),

      clearHistory: () => set({ entries: [] }),

      exportAll: () => get().entries,

      importEntries: (imported) =>
        set((s) => {
          const existingIds = new Set(s.entries.map((e) => e.id))
          const newEntries = imported.filter((e) => !existingIds.has(e.id))
          if (newEntries.length === 0) return s
          const merged = [...newEntries, ...s.entries].slice(0, 500)
          return { entries: merged }
        }),
    }),
    {
      name: 'bilibilidown-history',
    }
  )
)
