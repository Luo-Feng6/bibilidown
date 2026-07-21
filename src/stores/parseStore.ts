import { create } from 'zustand'
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

  /* ── ml 收藏夹分页状态 ── */
  /** 当前收藏夹 ml ID（非 ml 解析时为 null） */
  mlId: string | null
  /** 当前已加载到的页码 */
  mlPage: number
  /** 收藏夹视频总数 */
  mlTotalCount: number
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
  /** 设置 ml 分页元信息 */
  setMlPagination: (mlId: string | null, page: number, total: number) => void
  setLoadingMore: (loading: boolean) => void
}

/* ── Store ── */

export const useParseStore = create<ParseStore>((set) => ({
  videos: [],
  status: 'idle',
  error: null,
  lastUrl: '',

  /* ml pagination */
  mlId: null,
  mlPage: 0,
  mlTotalCount: 0,
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
      mlId: null,
      mlPage: 0,
      mlTotalCount: 0,
      isLoadingMore: false,
    }),

  setMlPagination: (mlId, page, total) =>
    set({ mlId, mlPage: page, mlTotalCount: total }),

  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
}))
