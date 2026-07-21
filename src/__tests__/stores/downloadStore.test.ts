import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import type { DownloadItemData, DownloadStatus } from '../../components/DownloadItem'
import type { StoreApi, UseBoundStore } from 'zustand'

/* ── Replicate the store creator for isolated test instances ── */

interface DownloadStore {
  items: DownloadItemData[]
  addItem: (item: DownloadItemData) => void
  addItems: (items: DownloadItemData[]) => void
  removeItem: (id: string) => void
  updateItem: (id: string, patch: Partial<DownloadItemData>) => void
  clearCompleted: () => void
  clearAll: () => void
  pauseItem: (id: string) => void
  resumeItem: (id: string) => void
  retryItem: (id: string) => void
  cancelItem: (id: string) => void
  activeCount: () => number
  completedCount: () => number
  failedCount: () => number
}

/* Import the real store creator function — but for tests we can also
   directly import useDownloadStore from the real module, as Zustand's
   create() works fine in vitest without React rendering. */

import { useDownloadStore } from '../../stores/downloadStore'

function makeItem(overrides: Partial<DownloadItemData> = {}): DownloadItemData {
  return {
    id: 'test-1',
    title: 'Test Video',
    quality: '1080P60',
    format: 'MP4',
    totalSize: '100MB',
    downloadedSize: '0MB',
    progress: 0,
    speed: '',
    eta: '',
    status: 'queued',
    ...overrides,
  }
}

/* After each test, reset the store to its initial state */
beforeEach(() => {
  useDownloadStore.setState({ items: [] })
})

describe('downloadStore', () => {
  /* ── addItem ── */
  describe('addItem', () => {
    it('adds a single item to an empty list', () => {
      const store = useDownloadStore
      const item = makeItem()
      store.getState().addItem(item)
      expect(store.getState().items).toHaveLength(1)
      expect(store.getState().items[0].id).toBe('test-1')
    })

    it('appends item to existing items', () => {
      const store = useDownloadStore
      store.getState().addItem(makeItem({ id: 'a' }))
      store.getState().addItem(makeItem({ id: 'b' }))
      expect(store.getState().items).toHaveLength(2)
      expect(store.getState().items[0].id).toBe('a')
      expect(store.getState().items[1].id).toBe('b')
    })
  })

  /* ── addItems ── */
  describe('addItems', () => {
    it('adds multiple items at once', () => {
      const store = useDownloadStore
      store.getState().addItems([
        makeItem({ id: 'a' }),
        makeItem({ id: 'b' }),
        makeItem({ id: 'c' }),
      ])
      expect(store.getState().items).toHaveLength(3)
      expect(store.getState().items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
    })

    it('handles an empty array', () => {
      const store = useDownloadStore
      store.getState().addItem(makeItem({ id: 'existing' }))
      store.getState().addItems([])
      expect(store.getState().items).toHaveLength(1)
    })
  })

  /* ── removeItem ── */
  describe('removeItem', () => {
    it('removes an item by id', () => {
      const store = useDownloadStore
      store.getState().addItems([makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c' })])
      store.getState().removeItem('b')
      expect(store.getState().items).toHaveLength(2)
      expect(store.getState().items.map((i) => i.id)).toEqual(['a', 'c'])
    })

    it('is a no-op when id does not exist', () => {
      const store = useDownloadStore
      store.getState().addItem(makeItem({ id: 'a' }))
      store.getState().removeItem('nonexistent')
      expect(store.getState().items).toHaveLength(1)
      expect(store.getState().items[0].id).toBe('a')
    })
  })

  /* ── updateItem ── */
  describe('updateItem', () => {
    it('updates specified fields of an item', () => {
      const store = useDownloadStore
      store.getState().addItem(makeItem({ id: 'a', progress: 0, status: 'queued' }))
      store.getState().updateItem('a', { progress: 50, downloadedSize: '50MB' })
      const item = store.getState().items[0]
      expect(item.progress).toBe(50)
      expect(item.downloadedSize).toBe('50MB')
      expect(item.status).toBe('queued') // unchanged
    })

    it('is a no-op when id does not exist', () => {
      const store = useDownloadStore
      store.getState().addItem(makeItem({ id: 'a' }))
      store.getState().updateItem('nonexistent', { progress: 100 })
      expect(store.getState().items[0].progress).toBe(0)
    })
  })

  /* ── clearCompleted ── */
  describe('clearCompleted', () => {
    it('removes all completed items', () => {
      const store = useDownloadStore
      store.getState().addItems([
        makeItem({ id: 'a', status: 'completed' }),
        makeItem({ id: 'b', status: 'downloading' }),
        makeItem({ id: 'c', status: 'completed' }),
        makeItem({ id: 'd', status: 'failed' }),
      ])
      store.getState().clearCompleted()
      const ids = store.getState().items.map((i) => i.id)
      expect(ids).toEqual(['b', 'd'])
    })

    it('does nothing when there are no completed items', () => {
      const store = useDownloadStore
      store.getState().addItems([
        makeItem({ id: 'a', status: 'downloading' }),
        makeItem({ id: 'b', status: 'failed' }),
      ])
      store.getState().clearCompleted()
      expect(store.getState().items).toHaveLength(2)
    })
  })

  /* ── clearAll ── */
  describe('clearAll', () => {
    it('removes every item', () => {
      const store = useDownloadStore
      store.getState().addItems([makeItem({ id: 'a' }), makeItem({ id: 'b' })])
      store.getState().clearAll()
      expect(store.getState().items).toEqual([])
    })
  })

  /* ── State transitions (convenience actions) ── */
  describe('state transitions', () => {
    it('pauseItem transitions downloading → paused', () => {
      const store = useDownloadStore
      store.getState().addItem(makeItem({ id: 'a', status: 'downloading' }))
      store.getState().pauseItem('a')
      expect(store.getState().items[0].status).toBe('paused')
    })

    it('resumeItem transitions paused → downloading, resets speed', () => {
      const store = useDownloadStore
      store.getState().addItem(makeItem({ id: 'a', status: 'paused', speed: '12.3 MB/s' }))
      store.getState().resumeItem('a')
      const item = store.getState().items[0]
      expect(item.status).toBe('downloading')
      expect(item.speed).toBe('恢复中...')
    })

    it('retryItem transitions failed → queued, resets progress', () => {
      const store = useDownloadStore
      store.getState().addItem(
        makeItem({ id: 'a', status: 'failed', progress: 80, errorMessage: 'Network error' })
      )
      store.getState().retryItem('a')
      const item = store.getState().items[0]
      expect(item.status).toBe('queued')
      expect(item.progress).toBe(0)
      expect(item.downloadedSize).toBe('0MB')
      expect(item.errorMessage).toBeUndefined()
    })

    it('cancelItem removes the item', () => {
      const store = useDownloadStore
      store.getState().addItems([makeItem({ id: 'a' }), makeItem({ id: 'b' })])
      store.getState().cancelItem('a')
      expect(store.getState().items).toHaveLength(1)
      expect(store.getState().items[0].id).toBe('b')
    })
  })

  /* ── Derived helpers ── */
  describe('derived helpers', () => {
    it('activeCount counts downloading, paused, and queued', () => {
      const store = useDownloadStore
      store.getState().addItems([
        makeItem({ id: 'a', status: 'downloading' }),
        makeItem({ id: 'b', status: 'paused' }),
        makeItem({ id: 'c', status: 'queued' }),
        makeItem({ id: 'd', status: 'completed' }),
        makeItem({ id: 'e', status: 'failed' }),
      ])
      expect(store.getState().activeCount()).toBe(3)
    })

    it('completedCount counts only completed', () => {
      const store = useDownloadStore
      store.getState().addItems([
        makeItem({ id: 'a', status: 'completed' }),
        makeItem({ id: 'b', status: 'completed' }),
        makeItem({ id: 'c', status: 'downloading' }),
      ])
      expect(store.getState().completedCount()).toBe(2)
    })

    it('failedCount counts only failed', () => {
      const store = useDownloadStore
      store.getState().addItems([
        makeItem({ id: 'a', status: 'failed' }),
        makeItem({ id: 'b', status: 'downloading' }),
      ])
      expect(store.getState().failedCount()).toBe(1)
    })

    it('all derived helpers return 0 for an empty store', () => {
      const store = useDownloadStore
      expect(store.getState().activeCount()).toBe(0)
      expect(store.getState().completedCount()).toBe(0)
      expect(store.getState().failedCount()).toBe(0)
    })
  })
})
