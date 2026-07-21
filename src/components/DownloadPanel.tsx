import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { DownloadSimple, CheckCircle, XCircle, ArrowDown, Tray, CaretDown, CaretRight, CaretLeft, SidebarSimple } from '@phosphor-icons/react'
import DownloadItem, { type DownloadItemData, type DownloadStatus } from './DownloadItem'

interface DownloadPanelProps {
  items: DownloadItemData[]
  collapsed?: boolean
  panelWidth?: number
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
  onClearCompleted?: () => void
  onClearFailed?: () => void
  onOpenFolder?: (id: string) => void
  onToggleCollapse?: () => void
  onPanelWidthChange?: (width: number) => void
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
   Resize Hook
   ═══════════════════════════════════════════════════════════════ */

const MIN_PANEL_WIDTH = 240
const MAX_PANEL_WIDTH = 600

function usePanelResize(
  initialWidth: number,
  onWidthChange?: (w: number) => void
) {
  const [width, setWidth] = useState(initialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // Sync external width changes
  useEffect(() => {
    setWidth(initialWidth)
  }, [initialWidth])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = startX.current - ev.clientX // drag left = shrink panel
      const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth.current + delta))
      setWidth(newWidth)
    }

    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      // Save final width
      onWidthChange?.(width)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [width, onWidthChange])

  return { width, onMouseDown }
}

/* ═══════════════════════════════════════════════════════════════
   DownloadPanel
   ═══════════════════════════════════════════════════════════════ */

/**
 * DownloadPanel — right-side Acrylic panel managing the download queue.
 *
 * Features:
 * - Groups: 进行中 / 已完成 / 失败, collapsible groups
 * - Resizable: drag the left edge to adjust width (240px–600px)
 * - Collapsible: toggle to hide/show the panel
 * - Batch operations: clear completed, clear failed
 * - Empty state when no items
 * - Footer summary bar
 */
export default function DownloadPanel({
  items,
  collapsed = false,
  panelWidth: propPanelWidth,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClearCompleted,
  onClearFailed,
  onOpenFolder,
  onToggleCollapse,
  onPanelWidthChange,
}: DownloadPanelProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const groups = groupItems(items)
    const collapsed = new Set<string>()
    for (const g of groups) {
      if (!g.defaultExpanded) collapsed.add(g.key)
    }
    return collapsed
  })

  const groups = useMemo(() => groupItems(items), [items])
  const summary = useMemo(() => computeSummary(items), [items])

  const { width, onMouseDown } = usePanelResize(propPanelWidth ?? 320, onPanelWidthChange)

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /* ── Collapsed state: show narrow tab ── */
  if (collapsed) {
    return (
      <aside
        className="glass-panel flex-shrink-0 flex flex-col items-center border-l"
        style={{ width: '36px' }}
      >
        {/* Expand button at top */}
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center mt-2t"
          style={{
            width: '28px', height: '28px',
            borderRadius: 'var(--radius-sm)',
            background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-tertiary)',
          }}
          aria-label="展开下载面板"
          title={`${summary.active.length} 进行中 | ${summary.completed.length} 已完成${summary.failed.length > 0 ? ` | ${summary.failed.length} 失败` : ''}`}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <SidebarSimple size={16} weight="regular" />
        </button>

        {/* Badge counts */}
        {summary.active.length > 0 && (
          <span style={{
            marginTop: '6px', fontSize: '10px', fontWeight: 600,
            color: 'var(--color-accent)',
          }}>
            {summary.active.length}
          </span>
        )}
        {summary.failed.length > 0 && (
          <span style={{
            marginTop: '4px', fontSize: '10px', fontWeight: 600,
            color: 'var(--color-error)',
          }}>
            {summary.failed.length}
          </span>
        )}
      </aside>
    )
  }

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <aside
        className="glass-panel flex-shrink-0 overflow-y-auto border-l flex flex-col"
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: '4px', cursor: 'col-resize', zIndex: 20,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(var(--color-accent-rgb, 59, 130, 246), 0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        />

        {/* Header */}
        <Header
          activeCount={0}
          hasCompleted={false}
          hasFailed={false}
          collapsed={collapsed}
          onClearCompleted={onClearCompleted}
          onClearFailed={onClearFailed}
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
            {' '}开始下载
          </p>
        </div>
      </aside>
    )
  }

  /* ── Populated panel ── */
  return (
    <aside
      className="glass-panel flex-shrink-0 overflow-y-auto border-l flex flex-col relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize drag handle — left edge */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '5px', cursor: 'col-resize', zIndex: 20,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(var(--color-accent-rgb, 59, 130, 246), 0.25)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      />

      {/* Header */}
      <Header
        activeCount={summary.active.length}
        hasCompleted={summary.completed.length > 0}
        hasFailed={summary.failed.length > 0}
        collapsed={collapsed}
        onClearCompleted={onClearCompleted}
        onClearFailed={onClearFailed}
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
  hasFailed,
  collapsed,
  onClearCompleted,
  onClearFailed,
  onToggleCollapse,
}: {
  activeCount: number
  hasCompleted: boolean
  hasFailed: boolean
  collapsed: boolean
  onClearCompleted?: () => void
  onClearFailed?: () => void
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
        {/* Clear failed */}
        {hasFailed && onClearFailed && (
          <button
            onClick={onClearFailed}
            className="transition-colors duration-fast"
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
            }}
            title="清空所有失败项"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-error)'
              e.currentTarget.style.backgroundColor = 'var(--color-error-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            ✕失败
          </button>
        )}

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
            title="清空所有已完成项"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
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
            title="收起下载面板"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <CaretRight size={14} weight="regular" />
          </button>
        )}
      </div>
    </div>
  )
}
