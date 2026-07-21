import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QualityOption } from '../components/QualityChip'

/* ── Types ── */

export interface ParsedVideo {
  id: string
  coverUrl: string
  title: string
  upName: string
  views: string
  duration: string
  date: string
  qualities: QualityOption[]
  /** For episode/playlist support: batch index */
  episodeIndex?: number
  episodeTitle?: string
  /** B站 BV 号（下载时需要） */
  bvid?: string
  /** 分P cid（下载时需要） */
  cid?: number
}

type ParseStatus = 'idle' | 'parsing' | 'success' | 'error'

interface ParseStore {
  /** Parsed video list (multiple for playlists / collections). */
  videos: ParsedVideo[]
  /** Current parse status. */
  status: ParseStatus
  /** Error message when status === 'error'. */
  error: string | null
  /** Raw input URL (kept for re-parse). */
  lastUrl: string

  /* ── 分页状态（通用：ml 收藏夹等需要分页加载的场景）── */
  /** 当前分页资源的 ID（非分页场景时为 null，如 ml 收藏夹 ID） */
  paginationId: string | null
  /** 当前已加载到的页码 */
  paginationPage: number
  /** 分页资源的总条目数 */
  paginationTotalCount: number
  /** 是否正在加载更多 */
  isLoadingMore: boolean

  /* Actions */
  setUrl: (url: string) => void
  setParsing: () => void
  setVideos: (videos: ParsedVideo[]) => void
  appendVideos: (videos: ParsedVideo[]) => void
  setError: (error: string) => void
  removeVideo: (id: string) => void
  reset: () => void
  /** 设置分页元信息 */
  setPagination: (paginationId: string | null, page: number, total: number) => void
  setLoadingMore: (loading: boolean) => void
}

/* ── Store ── */

export const useParseStore = create<ParseStore>()(
  persist(
    (set) => ({
  videos: [],
  status: 'idle',
  error: null,
  lastUrl: '',

  /* pagination */
  paginationId: null,
  paginationPage: 0,
  paginationTotalCount: 0,
  isLoadingMore: false,

  setUrl: (url) => set({ lastUrl: url }),

  setParsing: () => set({ status: 'parsing', error: null }),

  setVideos: (videos) => set({ videos, status: 'success', error: null }),

  appendVideos: (videos) =>
    set((s) => ({ videos: [...s.videos, ...videos], status: 'success', error: null })),

  setError: (error) => set({ status: 'error', error }),

  removeVideo: (id) =>
    set((s) => ({
      videos: s.videos.filter((v) => v.id !== id),
    })),

  reset: () =>
    set({
      videos: [],
      status: 'idle',
      error: null,
      lastUrl: '',
      paginationId: null,
      paginationPage: 0,
      paginationTotalCount: 0,
      isLoadingMore: false,
    }),

  setPagination: (paginationId, page, total) =>
    set({ paginationId, paginationPage: page, paginationTotalCount: total }),

  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
  }),
    {
      name: 'bibilidown-parse',
      /** Opt out of automatic hydration — we manually call rehydrate() in App.tsx
       *  to avoid the zustand v5 persist infinite re-render cycle. */
      skipHydration: true,
      /* Only persist data fields; reset runtime state on reload */
      partialize: (state) => ({
        lastUrl: state.lastUrl,
        videos: state.videos,
        paginationTotalCount: state.paginationTotalCount,
      }),
    }
  )
)
