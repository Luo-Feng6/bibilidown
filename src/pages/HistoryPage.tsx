import { useState, useMemo, useRef } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  ClockCounterClockwise,
  MagnifyingGlass,
  Trash,
  ArrowCounterClockwise,
  CheckCircle,
  XCircle,
  Faders,
  DownloadSimple,
  UploadSimple,
} from '@phosphor-icons/react'
import { useHistoryStore, type HistoryEntry } from '../stores/historyStore'
import { useToastStore } from '../stores/toastStore'

interface HistoryPageProps {
  /** 重新下载回调：传递 BV 号让 App 重新解析 */
  onReDownload?: (bvid: string) => void
}

/**
 * HistoryPage — download history with search, filter, and re-download.
 *
 * Auto-populated by download-manager when downloads complete or fail.
 * Persisted to localStorage via Zustand persist middleware.
 */
export default function HistoryPage({ onReDownload }: HistoryPageProps) {
  const { entries, clearHistory, removeEntry } = useHistoryStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all')

  /* ── Filtered & sorted entries ── */
  const filtered = useMemo(() => {
    let list = [...entries]

    // Status filter
    if (filter === 'completed') list = list.filter((e) => e.status === 'completed')
    if (filter === 'failed') list = list.filter((e) => e.status === 'failed')

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.bvid ?? '').toLowerCase().includes(q)
      )
    }

    // Newest first
    list.sort((a, b) => b.downloadedAt - a.downloadedAt)

    return list
  }, [entries, search, filter])

  /* ── File input ref for import ── */
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Export / Import handlers ── */
  const handleExport = () => {
    const allEntries = useHistoryStore.getState().exportAll()
    const blob = new Blob([JSON.stringify(allEntries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `bilibilidown-history-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!Array.isArray(data)) {
          alert('无效的导入文件：内容不是数组')
          return
        }
        for (const item of data) {
          if (!item.id || !item.title || !item.status || !item.downloadedAt) {
            alert('无效的导入文件：数据格式不正确')
            return
          }
        }
        const before = useHistoryStore.getState().entries.length
        useHistoryStore.getState().importEntries(data)
        const after = useHistoryStore.getState().entries.length
        const imported = after - before
        if (imported > 0) {
          useToastStore.getState().success(`成功导入 ${imported} 条记录`)
        } else {
          useToastStore.getState().info('没有新的记录可导入')
        }
      } catch {
        alert('无法解析 JSON 文件，请检查文件格式')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  /* ── Formatting helpers ── */
  const formatDate = (ts: number): string => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="flex-1 overflow-y-auto px-8t py-6t">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6t">
        <div className="flex items-center gap-3t">
          <ClockCounterClockwise
            size={24}
            weight="regular"
            style={{ color: 'var(--color-accent)' }}
          />
          <h1
            className="font-display"
            style={{
              fontSize: 'var(--text-heading)',
              lineHeight: 'var(--text-heading-lh)',
              color: 'var(--text-primary)',
            }}
          >
            历史记录
          </h1>
          {entries.length > 0 && (
            <span
              style={{
                fontSize: 'var(--text-body-sm)',
                color: 'var(--text-tertiary)',
                fontWeight: 400,
              }}
            >
              {entries.length} 条
            </span>
          )}
        </div>

        <div className="flex items-center gap-2t">
          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2t px-3t py-1t rounded-lg transition-colors duration-fast"
            style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <DownloadSimple size={14} weight="regular" />
            导出
          </button>

          {/* Import button */}
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2t px-3t py-1t rounded-lg transition-colors duration-fast"
            style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <UploadSimple size={14} weight="regular" />
            导入
          </button>

          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Clear history button */}
          {entries.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('确定要清空全部历史记录吗？此操作不可撤销。')) {
                  clearHistory()
                }
              }}
              className="flex items-center gap-2t px-3t py-1t rounded-lg transition-colors duration-fast"
              style={{
                fontSize: 'var(--text-body-sm)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-error, #EF4444)'
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--border-subtle)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Trash size={14} weight="regular" />
              清空历史
            </button>
          )}
        </div>
      </div>

      {/* Search & filter bar */}
      {entries.length > 0 && (
        <div className="flex items-center gap-3t mb-4t">
          {/* Search input */}
          <div
            className="flex-1 flex items-center"
            style={{
              height: 'var(--input-height)',
              borderRadius: 'var(--input-radius)',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
            }}
          >
            <span
              className="flex-shrink-0 select-none"
              style={{
                width: '40px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
              }}
            >
              <MagnifyingGlass size={16} weight="regular" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题或 BV 号..."
              className="flex-1 bg-transparent border-none outline-none"
              style={{
                fontSize: 'var(--text-body)',
                color: 'var(--input-text)',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  padding: '0 12px',
                  fontSize: 'var(--text-caption)',
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                清除
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1t">
            <Faders size={14} weight="regular" style={{ color: 'var(--text-tertiary)', marginRight: '4px' }} />
            {(['all', 'completed', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 'var(--text-caption)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  backgroundColor: filter === f ? 'var(--color-accent)' : 'transparent',
                  color: filter === f ? '#fff' : 'var(--text-secondary)',
                  borderColor: filter === f ? 'var(--color-accent)' : 'var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: filter === f ? 500 : 400,
                }}
              >
                {f === 'all' ? '全部' : f === 'completed' ? '已完成' : '失败'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History list */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2t">
          {filtered.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              formatDate={formatDate}
              onReDownload={onReDownload}
              onRemove={removeEntry}
            />
          ))}
        </div>
      ) : entries.length > 0 ? (
        /* No results matching filter/search */
        <EmptyState icon={MagnifyingGlass} message="没有匹配的记录" subtitle="尝试调整搜索或筛选条件" />
      ) : (
        /* Completely empty */
        <EmptyState
          icon={ClockCounterClockwise}
          message="暂无历史记录"
          subtitle="下载过的视频会自动出现在这里，方便重复下载"
        />
      )}
    </div>
  )
}

/* ── History row ── */

interface HistoryRowProps {
  entry: HistoryEntry
  formatDate: (ts: number) => string
  onReDownload?: (bvid: string) => void
  onRemove: (id: string) => void
}

function HistoryRow({ entry, formatDate, onReDownload, onRemove }: HistoryRowProps) {
  const isCompleted = entry.status === 'completed'

  return (
    <div
      className="flex items-center px-4t py-3t rounded-xl transition-colors duration-fast"
      style={{
        backgroundColor: 'var(--surface-default)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Status icon */}
      <span style={{ flexShrink: 0, marginRight: 'var(--space-3)' }}>
        {isCompleted ? (
          <CheckCircle size={20} weight="fill" style={{ color: 'var(--color-success, #22C55E)' }} />
        ) : (
          <XCircle size={20} weight="fill" style={{ color: 'var(--color-error, #EF4444)' }} />
        )}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-primary)',
            fontWeight: 500,
            lineHeight: 'var(--text-body-sm-lh)',
          }}
          title={entry.title}
        >
          {entry.title}
        </p>
        <div
          className="flex items-center gap-2t mt-0t"
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--text-tertiary)',
          }}
        >
          {entry.bvid && <span>{entry.bvid}</span>}
          <span>{entry.quality}</span>
          {entry.size && entry.size !== '获取中...' && <span>{entry.size}</span>}
          <span>{formatDate(entry.downloadedAt)}</span>
          {!isCompleted && entry.errorMessage && (
            <span className="truncate" style={{ color: 'var(--color-error, #EF4444)', maxWidth: '200px' }}>
              — {entry.errorMessage}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2t flex-shrink-0" style={{ marginLeft: 'var(--space-3)' }}>
        {entry.bvid && (
          <button
            onClick={() => onReDownload?.(entry.bvid!)}
            className="flex items-center gap-1t px-3t py-1t rounded-lg transition-colors duration-fast"
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--color-accent)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title="重新下载"
          >
            <ArrowCounterClockwise size={14} weight="regular" />
            重新下载
          </button>
        )}
        <button
          onClick={() => onRemove(entry.id)}
          className="flex items-center justify-center rounded-lg transition-colors duration-fast"
          style={{
            width: '28px',
            height: '28px',
            color: 'var(--text-quaternary)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-quaternary)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="删除此记录"
        >
          <Trash size={14} weight="regular" />
        </button>
      </div>
    </div>
  )
}

/* ── Empty state ── */

interface EmptyStateProps {
  icon: PhosphorIcon
  message: string
  subtitle: string
}

function EmptyState({ icon: Icon, message, subtitle }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12t"
      style={{ color: 'var(--text-tertiary)' }}
    >
      <Icon
        size={48}
        weight="regular"
        style={{ marginBottom: 'var(--space-3)', opacity: 0.3 }}
      />
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <p
        className="mt-1t"
        style={{ fontSize: 'var(--text-caption)', lineHeight: 'var(--text-caption-lh)' }}
      >
        {subtitle}
      </p>
    </div>
  )
}
