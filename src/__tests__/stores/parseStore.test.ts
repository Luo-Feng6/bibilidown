import { describe, it, expect, beforeEach } from 'vitest'
import { useParseStore, type ParsedVideo } from '../../stores/parseStore'
import type { QualityOption } from '../../components/QualityChip'

/* ── Helpers ── */

function makeVideo(overrides: Partial<ParsedVideo> = {}): ParsedVideo {
  return {
    id: 'BV123',
    coverUrl: 'https://example.com/cover.jpg',
    title: 'Test Video',
    upName: 'Test Author',
    views: '1.2万',
    duration: '10:15',
    date: '2024-01-01',
    qualities: [
      { label: '1080P', size: '约 50MB', available: true },
      { label: '720P', size: '约 30MB', available: true },
    ],
    bvid: 'BV123',
    cid: 100,
    ...overrides,
  }
}

/* Reset store before every test */
beforeEach(() => {
  useParseStore.setState({
    videos: [],
    status: 'idle',
    error: null,
    lastUrl: '',
    mlId: null,
    mlPage: 0,
    mlTotalCount: 0,
    isLoadingMore: false,
  })
})

describe('parseStore', () => {
  /* ── setUrl ── */
  describe('setUrl', () => {
    it('stores the last URL', () => {
      useParseStore.getState().setUrl('https://www.bilibili.com/video/BV123')
      expect(useParseStore.getState().lastUrl).toBe('https://www.bilibili.com/video/BV123')
    })
  })

  /* ── setParsing ── */
  describe('setParsing', () => {
    it('transitions status to parsing and clears error', () => {
      useParseStore.setState({ status: 'error', error: 'previous error' })
      useParseStore.getState().setParsing()
      const state = useParseStore.getState()
      expect(state.status).toBe('parsing')
      expect(state.error).toBeNull()
    })
  })

  /* ── setVideos ── */
  describe('setVideos', () => {
    it('replaces videos and sets status to success', () => {
      useParseStore.setState({ status: 'parsing', error: 'stale' })
      const videos = [makeVideo(), makeVideo({ id: 'BV456' })]
      useParseStore.getState().setVideos(videos)

      const state = useParseStore.getState()
      expect(state.videos).toHaveLength(2)
      expect(state.videos).toEqual(videos)
      expect(state.status).toBe('success')
      expect(state.error).toBeNull()
    })

    it('replaces existing videos', () => {
      useParseStore.getState().setVideos([makeVideo({ id: 'old' })])
      useParseStore.getState().setVideos([makeVideo({ id: 'new' })])
      expect(useParseStore.getState().videos).toHaveLength(1)
      expect(useParseStore.getState().videos[0].id).toBe('new')
    })
  })

  /* ── appendVideos ── */
  describe('appendVideos', () => {
    it('appends to existing video list', () => {
      useParseStore.getState().setVideos([makeVideo({ id: 'a' })])
      useParseStore.getState().appendVideos([makeVideo({ id: 'b' }), makeVideo({ id: 'c' })])

      const state = useParseStore.getState()
      expect(state.videos).toHaveLength(3)
      expect(state.videos.map((v) => v.id)).toEqual(['a', 'b', 'c'])
      expect(state.status).toBe('success')
    })
  })

  /* ── setError ── */
  describe('setError', () => {
    it('sets status to error with a message', () => {
      useParseStore.getState().setError('解析失败：无效的 BV 号')
      const state = useParseStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).toBe('解析失败：无效的 BV 号')
    })
  })

  /* ── removeVideo ── */
  describe('removeVideo', () => {
    it('removes a video by id', () => {
      useParseStore.getState().setVideos([
        makeVideo({ id: 'a' }),
        makeVideo({ id: 'b' }),
        makeVideo({ id: 'c' }),
      ])
      useParseStore.getState().removeVideo('b')
      expect(useParseStore.getState().videos.map((v) => v.id)).toEqual(['a', 'c'])
    })

    it('is a no-op when id does not exist', () => {
      useParseStore.getState().setVideos([makeVideo({ id: 'a' })])
      useParseStore.getState().removeVideo('nonexistent')
      expect(useParseStore.getState().videos).toHaveLength(1)
    })
  })

  /* ── reset ── */
  describe('reset', () => {
    it('resets all state to initial values', () => {
      useParseStore.setState({
        videos: [makeVideo()],
        status: 'success',
        error: null,
        lastUrl: 'https://example.com',
        mlId: 'ml123',
        mlPage: 3,
        mlTotalCount: 50,
        isLoadingMore: true,
      })

      useParseStore.getState().reset()

      const state = useParseStore.getState()
      expect(state.videos).toEqual([])
      expect(state.status).toBe('idle')
      expect(state.error).toBeNull()
      expect(state.lastUrl).toBe('')
      expect(state.mlId).toBeNull()
      expect(state.mlPage).toBe(0)
      expect(state.mlTotalCount).toBe(0)
      expect(state.isLoadingMore).toBe(false)
    })
  })

  /* ── setMlPagination ── */
  describe('setMlPagination', () => {
    it('sets ml pagination metadata', () => {
      useParseStore.getState().setMlPagination('ml999', 2, 100)
      const state = useParseStore.getState()
      expect(state.mlId).toBe('ml999')
      expect(state.mlPage).toBe(2)
      expect(state.mlTotalCount).toBe(100)
    })

    it('clears ml pagination when mlId is null', () => {
      useParseStore.getState().setMlPagination('ml999', 5, 200)
      useParseStore.getState().setMlPagination(null, 0, 0)
      const state = useParseStore.getState()
      expect(state.mlId).toBeNull()
      expect(state.mlPage).toBe(0)
      expect(state.mlTotalCount).toBe(0)
    })
  })

  /* ── setLoadingMore ── */
  describe('setLoadingMore', () => {
    it('toggles isLoadingMore', () => {
      expect(useParseStore.getState().isLoadingMore).toBe(false)
      useParseStore.getState().setLoadingMore(true)
      expect(useParseStore.getState().isLoadingMore).toBe(true)
      useParseStore.getState().setLoadingMore(false)
      expect(useParseStore.getState().isLoadingMore).toBe(false)
    })
  })
})
