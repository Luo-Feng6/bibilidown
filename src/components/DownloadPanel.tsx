import { useState, useMemo } from 'react'
import { DownloadSimple, CheckCircle, XCircle, ArrowDown, Tray, CaretDown, CaretRight, CaretLeft } from '@phosphor-icons/react'
import DownloadItem, { type DownloadItemData, type DownloadStatus } from './DownloadItem'

interface DownloadPanelProps {
  items: DownloadItemData[]
  collapsed?: boolean
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
  onClearCompleted?: () => void
  onOpenFolder?: (id: string) => void
  onToggleCollapse?: () => void
}

/* ── Group helpers ── */

interface DownloadGroup {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  items: DownloadItemData[]
  defaultExpanded: boolean
}

function groupItems(items: DownloadItemData[]): DownloadGroup[] {
  const active = items.filter(
    (i) => i.status === 'downloading' || i.status === 'paused' || i.status === 'queued'
  )
  const completed = items.filter((i) => i.status === 'completed')
  const failed = items.filter((i) => i.status === 'failed')

  const groups: DownloadGroup[] = []

  if (active.length > 0) {
    groups.push({
      key: 'active',
      label: '进行中',
      icon: <ArrowDown size={14} weight="regular" />,
      color: 'var(--color-accent)',
      items: active,
      defaultExpanded: true,
    })
  }

  if (completed.length > 0) {
    groups.push({
      key: 'completed',
      label: '已完成',
      icon: <CheckCircle size={14} weight="regular" />,
      color: 'var(--color-success)',
      items: completed,
      defaultExpanded: completed.length <= 5,
    })
  }

  if (failed.length > 0) {
    groups.push({
      key: 'failed',
      label: '失败',
      icon: <XCircle size={14} weight="regular" />,
      color: 'var(--color-error)',
      items: failed,
      defaultExpanded: true,
    })
  }

  return groups
}

/* ── Summary ── */

function computeSummary(items: DownloadItemData[]) {
  const active = items.filter(
    (i) => i.status === 'downloading' || i.status === 'paused' || i.status === 'queued'
  )
  const completed = items.filter((i) => i.status === 'completed')
  const failed = items.filter((i) => i.status === 'failed')

  const totalProgress =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.progress, 0) / items.length)
      : 0

  return { active, completed, failed, totalProgress }
}

/* ═══════════════════════════════════════════════════════════════
   DownloadPanel
   ═══════════════════════════════════════════════════════════════ */

/**
 * DownloadPanel — right-side Acrylic panel managing the download queue.
 *
 * Visual spec §8.6 / UX spec §3.4:
 * - 320px wide, glass-panel (Acrylic) background
 * - Groups: 进行中 (always expanded), 已完成 (collapsed when > 5), 失败 (always expanded)
 * - Header with count badge, clear completed, collapse toggle
 * - Empty state when no items
 * - Footer summary bar
 */
export default function DownloadPanel({
  items,
  collapsed = false,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClearCompleted,
  onOpenFolder,
  onToggleCollapse,
}: DownloadPanelProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    // Initialize: collapse completed group if > 5 items
    const groups = groupItems(items)
    const collapsed = new Set<string>()
    for (const g of groups) {
      if (!g.defaultExpanded) collapsed.add(g.key)
    }
    return collapsed
  })

  const groups = useMemo(() => groupItems(items), [items])
  const summary = useMemo(() => computeSummary(items), [items])

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <aside
        className="glass-panel flex-shrink-0 overflow-y-auto border-l flex flex-col"
        style={{ width: 'var(--panel-width)' }}
      >
        {/* Header */}
        <Header
          activeCount={0}
          hasCompleted={false}
          collapsed={collapsed}
          onClearCompleted={onClearCompleted}
          onToggleCollapse={onToggleCollapse}
        />

        {/* Empty body */}
        <div className="flex-1 flex flex-col items-center justify-center px-4t text-center">
          <div className="mb-3t" style={{ opacity: 0.4 }}>
            <Tray size={48} weight="regular" />
          </div>
          <p
            style={{
              fontSize: 'var(--text-body)',
              color: 'var(--text-secondary)',
            }}
          >
            下载队列为空
          </p>
          <p
            className="mt-1t"
            style={{
              fontSize: 'var(--text-caption)',
              lineHeight: 'var(--text-caption-lh)',
              color: 'var(--text-tertiary)',
            }}
          >
            解析视频后点击
            <span style={{ color: 'var(--color-accent)' }}>「加入下载队列」</span>
          </p>

          {/* Hint: supported link types */}
          <div
            className="mt-6t px-3t py-2t rounded-md"
            style={{
              fontSize: 'var(--text-caption)',
              lineHeight: '1.6',
              color: 'var(--text-tertiary)',
              textAlign: 'left',
              backgroundColor: 'var(--surface-overlay)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            支持: BV号 · av号 · ep · ss · md · ml · 合集链接
          </div>
        </div>
      </aside>
    )
  }

  /* ── Populated panel ── */
  return (
    <aside
      className="glass-panel flex-shrink-0 overflow-y-auto border-l flex flex-col"
      style={{ width: 'var(--panel-width)' }}
    >
      {/* Header */}
      <Header
        activeCount={summary.active.length}
        hasCompleted={summary.completed.length > 0}
        collapsed={collapsed}
        onClearCompleted={onClearCompleted}
        onToggleCollapse={onToggleCollapse}
      />

      {/* Download list */}
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.key)
          return (
            <div key={group.key}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex items-center justify-between w-full px-4t py-2t transition-colors duration-fast sticky top-0 z-10"
                style={{
                  fontSize: 'var(--text-caption)',
                  fontWeight: 500,
                  color: group.color,
                  backgroundColor: 'var(--acrylic-bg)',
                  backdropFilter: 'blur(var(--acrylic-blur))',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span className="flex items-center gap-2t">
                  <span>{group.icon}</span>
                  {group.label}
                  <span
                    style={{
                      fontSize: 'var(--text-caption)',
                      color: 'var(--text-tertiary)',
                      fontWeight: 400,
                    }}
                  >
                    ({group.items.length})
                  </span>
                </span>
                <span
                  style={{
                    transition: 'transform var(--duration-fast) var(--ease-out)',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    color: 'var(--text-tertiary)',
                    display: 'inline-flex',
                  }}
                >
                  <CaretDown size={10} weight="regular" />
                </span>
              </button>

              {/* Group items */}
              {!isCollapsed && (
                <div>
                  {group.items.map((item) => (
                    <DownloadItem
                      key={item.id}
                      item={item}
                      onPause={onPause}
                      onResume={onResume}
                      onCancel={onCancel}
                      onRetry={onRetry}
                      onOpenFolder={onOpenFolder}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer summary bar */}
      <div
        className="flex-shrink-0 px-4t py-2t flex items-center justify-between"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 'var(--text-caption)',
          lineHeight: 'var(--text-caption-lh)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span>
          {summary.active.length > 0
            ? `${summary.active.length} 进行中`
            : '全部完成'}
        </span>
        <span className="tabular-nums">
          {summary.completed.length > 0
            ? `已完成 ${summary.completed.length}`
            : summary.failed.length > 0
              ? `失败 ${summary.failed.length}`
              : ''}
        </span>
      </div>
    </aside>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Header sub-component
   ═══════════════════════════════════════════════════════════════ */

function Header({
  activeCount,
  hasCompleted,
  collapsed,
  onClearCompleted,
  onToggleCollapse,
}: {
  activeCount: number
  hasCompleted: boolean
  collapsed: boolean
  onClearCompleted?: () => void
  onToggleCollapse?: () => void
}) {
  return (
    <div
      className="flex-shrink-0 px-4t py-3t flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2t">
        <h3
          className="font-medium"
          style={{
            fontSize: 'var(--text-body)',
            color: 'var(--text-primary)',
          }}
        >
          <DownloadSimple size={16} weight="regular" className="inline mr-1t" />下载队列
        </h3>
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center font-medium tabular-nums"
            style={{
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              fontSize: 'var(--text-caption)',
              lineHeight: 1,
              color: 'var(--color-accent-text)',
              backgroundColor: 'var(--color-accent)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {activeCount}
          </span>
        )}
      </div>

      <div className="flex items-center" style={{ gap: '2px' }}>
        {/* Clear completed */}
        {hasCompleted && onClearCompleted && (
          <button
            onClick={onClearCompleted}
            className="transition-colors duration-fast"
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            清空
          </button>
        )}

        {/* Collapse toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center transition-colors duration-fast"
            style={{
              width: '28px',
              height: '28px',
              fontSize: '14px',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
            }}
            aria-label={collapsed ? '展开下载面板' : '收起下载面板'}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {collapsed ? <CaretLeft size={14} weight="regular" /> : <CaretRight size={14} weight="regular" />}
          </button>
        )}
      </div>
    </div>
  )
}
