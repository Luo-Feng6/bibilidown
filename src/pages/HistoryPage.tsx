import { useState, useMemo, useRef } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  ClockCounterClockwise,
  MagnifyingGlass,
  Trash,
  X,
  ArrowCounterClockwise,
  CheckCircle,
  XCircle,
  Faders,
  DownloadSimple,
  UploadSimple,
} from '@phosphor-icons/react'
import { useHistoryStore, type HistoryEntry } from '../stores/historyStore'
import { useToastStore } from '../stores/toastStore'
import { useShallow } from 'zustand/shallow'
import { showConfirm, showAlert } from '../services/dialog-service'

interface HistoryPageProps {
  onReDownload?: (bvid: string) => void
}

/**
 * HistoryPage — download history with search, filter, import/export, and re-download.
 */
export default function HistoryPage({ onReDownload }: HistoryPageProps) {
  const { entries, clearHistory, deleteEntry } = useHistoryStore(
    useShallow((s) => ({
      entries: s.entries,
      clearHistory: s.clearHistory,
      deleteEntry: s.deleteEntry,
    }))
  )
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all')

  const filtered = useMemo(() => {
    let list = [...entries]
    if (filter === 'completed') list = list.filter((e) => e.status === 'completed')
    if (filter === 'failed') list = list.filter((e) => e.status === 'failed')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || (e.bvid ?? '').toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => b.downloadedAt - a.downloadedAt)
    return list
  }, [entries, search, filter])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const allEntries = useHistoryStore.getState().exportAll()
    const blob = new Blob([JSON.stringify(allEntries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bibilidown-history-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!Array.isArray(data)) { await showAlert({ title: '导入失败', message: '无效的导入文件：内容不是数组' }); return }
        for (const item of data) {
          if (!item.id || !item.title || !item.status || !item.downloadedAt) {
            await showAlert({ title: '导入失败', message: '无效的导入文件：数据格式不正确' }); return
          }
        }
        const before = useHistoryStore.getState().entries.length
        useHistoryStore.getState().importEntries(data)
        const after = useHistoryStore.getState().entries.length
        const imported = after - before
        if (imported > 0) useToastStore.getState().success(`成功导入 ${imported} 条记录`)
        else useToastStore.getState().info('没有新的记录可导入')
      } catch { await showAlert({ title: '导入失败', message: '无法解析 JSON 文件，请检查文件格式' }) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const formatDate = (ts: number): string => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const completedCount = entries.filter((e) => e.status === 'completed').length
  const failedCount = entries.filter((e) => e.status === 'failed').length

  return (
    <div className="flex-1 overflow-y-auto px-8t py-6t">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6t">
        <div className="flex items-center gap-3t">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-accent-muted)',
              color: 'var(--color-accent)',
            }}
          >
            <ClockCounterClockwise size={22} weight="regular" />
          </div>
          <div>
            <h1
              className="font-display"
              style={{ fontSize: 'var(--text-heading)', lineHeight: 'var(--text-heading-lh)', color: 'var(--text-primary)' }}
            >
              历史记录
            </h1>
            {entries.length > 0 && (
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                共 {entries.length} 条 · {completedCount} 已完成 · {failedCount} 失败
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {entries.length > 0 && (
          <div className="flex items-center gap-2t">
            <ToolButton icon={<DownloadSimple size={14} />} label="导出" onClick={handleExport}
              title="导出保存为 JSON 备份文件，方便换电脑迁移或清空后找回" />
            <ToolButton icon={<UploadSimple size={14} />} label="导入" onClick={handleImportClick}
              title="从之前导出的 JSON 备份文件恢复历史记录" />
            <ToolButton
              icon={<Trash size={14} />}
              label="清空"
              onClick={async () => {
                const confirmed = await showConfirm({
                  title: '清空历史记录',
                  message: '确定要清空全部历史记录吗？此操作不可撤销。',
                })
                if (confirmed) clearHistory()
              }}
              danger
            />
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* ── Search & filter bar ── */}
      {entries.length > 0 && (
        <div className="flex items-center gap-3t mb-4t flex-wrap">
          <div
            className="flex items-center rounded-lg"
            style={{
              height: '36px',
              minWidth: '220px',
              flex: '1 1 280px',
              backgroundColor: 'var(--surface-default)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <MagnifyingGlass size={16} weight="regular" style={{ color: 'var(--text-tertiary)', margin: '0 10px', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题或 BV 号..."
              style={{
                flex: 1,
                height: '100%',
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 'var(--text-body-sm)',
                color: 'var(--text-primary)',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  height: '100%',
                  padding: '0 10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--text-caption)',
                  color: 'var(--text-tertiary)',
                }}
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1t">
            <Faders size={14} weight="regular" style={{ color: 'var(--text-tertiary)', marginRight: '2px' }} />
            {(['all', 'completed', 'failed'] as const).map((f) => {
              const active = filter === f
              const label = f === 'all' ? '全部' : f === 'completed' ? '已完成' : '失败'
              const count = f === 'all' ? entries.length : f === 'completed' ? completedCount : failedCount
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="transition-all duration-fast"
                  style={{
                    fontSize: 'var(--text-caption)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    background: active ? 'var(--color-accent)' : 'transparent',
                    color: active ? 'var(--color-accent-text)' : 'var(--text-secondary)',
                    borderColor: active ? 'var(--color-accent)' : 'var(--border-subtle)',
                    cursor: 'pointer',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {label} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── History list ── */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2t">
          {filtered.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} formatDate={formatDate} onReDownload={onReDownload} onRemove={deleteEntry} />
          ))}
        </div>
      ) : entries.length > 0 ? (
        <EmptyState icon={MagnifyingGlass} message="没有匹配的记录" subtitle="尝试调整搜索或筛选条件" />
      ) : (
        <EmptyState
          icon={ClockCounterClockwise}
          message="暂无历史记录"
          subtitle="下载过的视频会自动出现在这里，方便重复下载"
        />
      )}
    </div>
  )
}

/* ── Toolbar button ── */

function ToolButton({
  icon,
  label,
  onClick,
  danger,
  title,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 px-3t py-1.5 rounded-lg transition-all duration-fast"
      style={{
        fontSize: 'var(--text-body-sm)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
        background: 'transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (danger) {
          e.currentTarget.style.color = 'var(--color-error)'
          e.currentTarget.style.borderColor = 'var(--color-error)'
          e.currentTarget.style.background = 'var(--color-error-bg)'
        } else {
          e.currentTarget.style.background = 'var(--surface-overlay)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-secondary)'
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

/* ── History row ── */

function HistoryRow({
  entry,
  formatDate,
  onReDownload,
  onRemove,
}: {
  entry: HistoryEntry
  formatDate: (ts: number) => string
  onReDownload?: (bvid: string) => void
  onRemove: (id: string) => void
}) {
  const isCompleted = entry.status === 'completed'

  return (
    <div
      className="flex items-center gap-3t px-4t py-3t rounded-xl transition-colors duration-fast group"
      style={{
        backgroundColor: 'var(--surface-default)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Status dot + icon */}
      <div className="flex-shrink-0 flex items-center gap-2t" style={{ minWidth: '80px' }}>
        <span
          className="inline-block rounded-full flex-shrink-0"
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: isCompleted ? 'var(--color-success)' : 'var(--color-error)',
            boxShadow: isCompleted
              ? '0 0 6px var(--color-success)'
              : '0 0 6px var(--color-error)',
          }}
        />
        <span
          style={{
            fontSize: 'var(--text-caption)',
            fontWeight: 500,
            color: isCompleted ? 'var(--color-success)' : 'var(--color-error)',
          }}
        >
          {isCompleted ? '已完成' : '失败'}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', fontWeight: 500 }}
          title={entry.title}
        >
          {entry.title}
        </p>
        <div
          className="flex items-center gap-2t mt-0.5 flex-wrap"
          style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}
        >
          {entry.inputUrl && (
            <span className="truncate" style={{ maxWidth: '180px', color: 'var(--text-tertiary)' }} title={entry.inputUrl}>
              {entry.inputUrl}
            </span>
          )}
          {entry.bvid && (
            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{entry.bvid}</span>
          )}
          {entry.quality && <span>{entry.quality}</span>}
          {entry.format && <span>{entry.format}</span>}
          {entry.size && entry.size !== '获取中...' && <span>{entry.size}</span>}
          <span>{formatDate(entry.downloadedAt)}</span>
          {!isCompleted && entry.errorMessage && (
            <span className="truncate" style={{ color: 'var(--color-error)', maxWidth: '200px' }}>
              — {entry.errorMessage}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {entry.bvid && (
          <button
            onClick={() => onReDownload?.(entry.bvid!)}
            className="flex items-center gap-1t px-2.5 py-1 rounded-md transition-all duration-fast"
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--color-accent)',
              background: 'var(--color-accent-muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-accent)'
              e.currentTarget.style.color = 'var(--color-accent-text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-accent-muted)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            title="重新下载"
          >
            <ArrowCounterClockwise size={13} weight="bold" />
            重新下载
          </button>
        )}
        <button
          onClick={() => onRemove(entry.id)}
          className="flex items-center justify-center rounded-md transition-all duration-fast opacity-0 group-hover:opacity-100"
          style={{
            width: '28px',
            height: '28px',
            color: 'var(--text-tertiary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-error)'
            e.currentTarget.style.background = 'var(--color-error-bg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.background = 'none'
          }}
          title="删除此记录"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}

/* ── Empty state ── */

function EmptyState({
  icon: Icon,
  message,
  subtitle,
}: {
  icon: PhosphorIcon
  message: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16t" style={{ color: 'var(--text-tertiary)' }}>
      <div
        className="flex items-center justify-center rounded-2xl mb-4t"
        style={{
          width: '72px',
          height: '72px',
          backgroundColor: 'var(--surface-default)',
          border: '1px dashed var(--border-subtle)',
        }}
      >
        <Icon size={32} weight="light" style={{ opacity: 0.4 }} />
      </div>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', fontWeight: 500 }}>{message}</p>
      <p className="mt-1t" style={{ fontSize: 'var(--text-caption)', lineHeight: 'var(--text-caption-lh)' }}>
        {subtitle}
      </p>
    </div>
  )
}
