import { useState, useMemo } from 'react'
import {
  ArrowDown,
  Pause,
  CheckCircle,
  XCircle,
  Hourglass,
  X,
  Play,
  ArrowCounterClockwise,
  FolderOpen,
  CaretRight,
  CaretDown,
} from '@phosphor-icons/react'

/* ── Types ── */

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed'

export interface DownloadItemData {
  id: string
  title: string
  quality: string
  format: string
  totalSize: string
  downloadedSize: string
  progress: number // 0–100
  speed: string // e.g. "12.3 MB/s"
  eta: string // e.g. "剩余 45 秒"
  status: DownloadStatus
  errorMessage?: string
  /** Last N speed samples for the sparkline chart (MB/s). */
  speedHistory?: number[]
  /** B站视频 ID（下载时需要） */
  bvid?: string
  /** 分P cid（下载时需要） */
  cid?: number
}

interface DownloadItemProps {
  item: DownloadItemData
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
  onOpenFolder?: (id: string) => void
}

/* ── Helpers ── */

const ICON_SIZE = 14

function statusMeta(status: DownloadStatus) {
  switch (status) {
    case 'downloading':
      return { label: '下载中', color: 'var(--color-accent)', icon: <ArrowDown size={ICON_SIZE} weight="regular" /> }
    case 'paused':
      return { label: '已暂停', color: 'var(--color-warning)', icon: <Pause size={ICON_SIZE} weight="regular" /> }
    case 'completed':
      return { label: '已完成', color: 'var(--color-success)', icon: <CheckCircle size={ICON_SIZE} weight="regular" /> }
    case 'failed':
      return { label: '失败', color: 'var(--color-error)', icon: <XCircle size={ICON_SIZE} weight="regular" /> }
    case 'queued':
      return { label: '排队中', color: 'var(--text-tertiary)', icon: <Hourglass size={ICON_SIZE} weight="regular" /> }
  }
}

/**
 * Sparkline — tiny inline SVG line chart of recent download speeds.
 *
 * From visual spec §8.5:
 * - Height 28px, stroke 1.5px
 * - Color: accent, opacity 0.6
 * - No fill
 */
function Sparkline({ data, max, width = 100, height = 28 }: {
  data: number[]
  max: number
  width?: number
  height?: number
}) {
  if (!data || data.length < 2) return null

  const paddingY = 4
  const plotHeight = height - paddingY * 2
  const stepX = width / (data.length - 1)

  const points = data
    .map((v, i) => {
      const x = i * stepX
      const y = paddingY + plotHeight * (1 - v / max)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      aria-label="下载速度曲线"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * IconButton — 32×32px icon button for download item controls.
 *
 * From visual spec §8.4:
 * - 32×32px, radius 6px
 * - Icon 20px, color --text-secondary
 * - Hover: bg rgba(0,0,0,0.06), text -> --text-primary
 */
function IconButton({
  label,
  onClick,
  children,
  destructive = false,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center transition-colors duration-fast"
      style={{
        width: '32px',
        height: '32px',
        borderRadius: 'var(--radius-md)',
        fontSize: '16px',
        color: 'var(--text-secondary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = destructive
          ? 'var(--color-error-bg)'
          : 'rgba(255,255,255,0.06)'
        e.currentTarget.style.color = destructive
          ? 'var(--color-error)'
          : 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DownloadItem
   ═══════════════════════════════════════════════════════════════ */

/**
 * DownloadItem — single entry in the download queue panel.
 *
 * Visual spec §8.5 / UX spec §5.4:
 * - 4 statuses: downloading (glow bar), paused (dim), completed (green), failed (red)
 * - Signature element: glowing progress bar (--shadow-glow)
 * - Speed sparkline, collapsible on speed-text click
 * - Control buttons: pause/resume, cancel, retry
 */
export default function DownloadItem({
  item,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onOpenFolder,
}: DownloadItemProps) {
  const [showSparkline, setShowSparkline] = useState(false)
  const meta = statusMeta(item.status)

  const isActive = item.status === 'downloading' || item.status === 'paused'
  const isDone = item.status === 'completed'
  const isFailed = item.status === 'failed'
  const isQueued = item.status === 'queued'

  /* ── Progress bar fill color ── */
  const progressFillColor = isDone
    ? 'var(--color-success)'
    : isFailed
      ? 'var(--color-error)'
      : 'var(--progress-fill)'

  /* ── Progress bar glow (signature element — only when actively downloading) ── */
  const progressGlow = item.status === 'downloading'
    ? 'var(--progress-glow)'
    : 'none'

  /* ── Sparkline data ── */
  const sparklineMax = useMemo(() => {
    if (!item.speedHistory || item.speedHistory.length === 0) return 1
    return Math.max(...item.speedHistory, 1)
  }, [item.speedHistory])

  return (
    <div
      className="transition-all duration-slow"
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border-subtle)',
        opacity: isDone ? 0.7 : 1,
      }}
    >
      {/* ── Row 1: Title + Controls ── */}
      <div className="flex items-center justify-between gap-2t">
        {/* Status icon + Title */}
        <div className="flex-1 min-w-0 flex items-center gap-2t">
          <span style={{ fontSize: '14px', flexShrink: 0 }}>{meta.icon}</span>
          <span
            className="truncate"
            style={{
              fontSize: 'var(--text-body)',
              color: 'var(--text-primary)',
              fontWeight: isActive ? 500 : 400,
            }}
            title={item.title}
          >
            {item.title}
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center flex-shrink-0" style={{ gap: '2px' }}>
          {isActive && (
            <>
              {item.status === 'downloading' ? (
                <IconButton label="暂停" onClick={() => onPause?.(item.id)}>
                  ⏸
                </IconButton>
              ) : (
                <IconButton label="继续" onClick={() => onResume?.(item.id)}>
                  <Play size={16} weight="regular" />
                </IconButton>
              )}
              <IconButton label="取消" onClick={() => onCancel?.(item.id)} destructive>
                <X size={16} weight="regular" />
              </IconButton>
            </>
          )}
          {isFailed && (
            <IconButton label="重试" onClick={() => onRetry?.(item.id)}>
              <ArrowCounterClockwise size={16} weight="regular" />
            </IconButton>
          )}
          {isDone && onOpenFolder && (
            <IconButton label="打开文件夹" onClick={() => onOpenFolder?.(item.id)}>
              <FolderOpen size={16} weight="regular" />
            </IconButton>
          )}
          {isQueued && (
            <IconButton label="取消" onClick={() => onCancel?.(item.id)} destructive>
              <X size={16} weight="regular" />
            </IconButton>
          )}
        </div>
      </div>

      {/* ── Row 2: Progress Bar (signature element) ── */}
      <div className="mt-2t">
        {/* Track */}
        <div
          className="relative overflow-hidden"
          style={{
            height: 'var(--progress-height)',
            borderRadius: 'var(--progress-radius)',
            background: isDone
              ? 'var(--color-success-bg)'
              : isFailed
                ? 'var(--color-error-bg)'
                : 'var(--progress-bg)',
          }}
        >
          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full transition-all duration-normal"
            style={{
              width: `${item.progress}%`,
              borderRadius: 'var(--progress-radius)',
              backgroundColor: progressFillColor,
              boxShadow: progressGlow,
              transition: 'width var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out)',
            }}
          />

          {/* Indeterminate shimmer for queued state */}
          {isQueued && (
            <div
              className="absolute left-0 top-0 h-full skeleton"
              style={{
                width: '100%',
                borderRadius: 'var(--progress-radius)',
              }}
            />
          )}
        </div>

        {/* Percentage badge */}
        <div className="flex items-center justify-between mt-1t">
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: 'var(--text-caption)',
              lineHeight: 'var(--text-caption-lh)',
              color: isDone
                ? 'var(--color-success)'
                : isFailed
                  ? 'var(--color-error)'
                  : 'var(--text-secondary)',
            }}
          >
            {item.progress}%
          </span>
        </div>
      </div>

      {/* ── Row 3: Speed + ETA (click to toggle sparkline for active items) ── */}
      <div
        className="flex items-center justify-between mt-1t"
        style={{
          fontSize: 'var(--text-caption)',
          lineHeight: 'var(--text-caption-lh)',
          color: 'var(--text-tertiary)',
        }}
      >
        <div className="flex items-center gap-3t">
          {/* Speed — clickable for sparkline toggle */}
          {isActive && (
            <button
              onClick={() => setShowSparkline(!showSparkline)}
              className="flex items-center gap-1t transition-colors duration-fast"
              style={{
                fontSize: 'var(--text-caption)',
                color: showSparkline ? 'var(--color-accent)' : 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              title="点击查看速度曲线"
            >
              <span style={{ display: 'inline-flex' }}>
                {showSparkline ? <CaretDown size={10} weight="regular" /> : <CaretRight size={10} weight="regular" />}
              </span>
              {item.speed}
            </button>
          )}
          {!isActive && (
            <span>{item.speed || meta.label}</span>
          )}

          {/* Separator dot */}
          {isActive && item.eta && <MetaDot />}

          {/* ETA */}
          {isActive && item.eta && (
            <span>{item.eta}</span>
          )}
        </div>

        {/* Status label (non-active states) */}
        {!isActive && (
          <span style={{ color: meta.color, fontWeight: 500 }}>{meta.label}</span>
        )}
      </div>

      {/* ── Row 4: Quality + Format + Size ── */}
      <div
        className="flex items-center gap-3t mt-1t"
        style={{
          fontSize: 'var(--text-caption)',
          lineHeight: 'var(--text-caption-lh)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span>{item.quality}</span>
        <MetaDot />
        <span>{item.format}</span>
        <MetaDot />
        <span>
          {item.downloadedSize} / {item.totalSize}
        </span>
      </div>

      {/* ── Sparkline (collapsible) ── */}
      {showSparkline && item.speedHistory && item.speedHistory.length >= 2 && (
        <div
          className="mt-2t pt-2t"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between mb-1t">
            <span
              style={{
                fontSize: 'var(--text-caption)',
                color: 'var(--text-tertiary)',
              }}
            >
              速度曲线
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 'var(--text-caption)',
                color: 'var(--text-tertiary)',
              }}
            >
              {item.speed} 峰值
            </span>
          </div>
          <Sparkline data={item.speedHistory} max={sparklineMax} width={240} height={28} />
        </div>
      )}

      {/* ── Error message ── */}
      {isFailed && item.errorMessage && (
        <div
          className="mt-2t p-2t rounded-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            fontSize: 'var(--text-caption)',
            lineHeight: 'var(--text-caption-lh)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {item.errorMessage}
        </div>
      )}
    </div>
  )
}

/* ── Tiny meta separator dot ── */

function MetaDot() {
  return (
    <span
      className="select-none"
      style={{
        color: 'var(--text-disabled)',
        fontSize: '6px',
        lineHeight: 1,
      }}
    >
      ●
    </span>
  )
}
