import { useState, useCallback } from 'react'
import { User, Eye, Clock, Calendar, X, ImageSquare, DownloadSimple, Copy } from '@phosphor-icons/react'
import QualityChip, { type QualityOption } from './QualityChip'
import { useUserPrefsStore } from '../stores/userPrefsStore'
import { fetchDanmaku, fetchSubtitle } from '../services/bilibili-api'
import { useToastStore } from '../stores/toastStore'
import { copyText } from '../utils/clipboard'

interface VideoCardProps {
  coverUrl: string
  title: string
  upName: string
  views: string
  duration: string
  date: string
  qualities: QualityOption[]
  /** B站 BV 号（字幕/弹幕独立下载时需要） */
  bvid?: string
  /** 分P cid（字幕/弹幕独立下载时需要） */
  cid?: number
  onClose?: () => void
  onAddToQueue?: (quality: QualityOption) => void
  downloadModeStyle?: 'popup' | 'inline'
  onAddToQueueWithMode?: (quality: QualityOption, mode: 'video-only' | 'audio-only' | 'separate' | 'merge') => void
  onNavigateToSettings?: () => void
  showCoverImage?: boolean
}

/**
 * VideoCard — Parsed video detail card.
 *
 * Visual spec:
 * - 12px border-radius (--radius-xl)
 * - shadow-sm (0 2px 8px rgba(0,0,0,0.06))
 * - Hover: shadow upgrades to shadow-md (0 4px 16px), NO scale transform
 * - Border: 1px subtle (rgba(0,0,0,0.06))
 * - Enter animation: fade-in + slide-up 8px
 * - Cover: 280×158, 8px radius
 */
export default function VideoCard({
  coverUrl,
  title,
  upName,
  views,
  duration,
  date,
  qualities,
  bvid,
  cid,
  onClose,
  onAddToQueue,
  downloadModeStyle = 'popup',
  onAddToQueueWithMode,
  onNavigateToSettings,
  showCoverImage = true,
}: VideoCardProps) {
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(
      0,
      qualities.findIndex((q) => q.selected)
    )
  )
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  const selectedQuality = qualities[selectedIndex]

  /** 独立下载弹幕 XML 文件（不下载视频） */
  const handleDownloadDanmaku = async () => {
    if (!bvid || cid == null) return
    const toast = useToastStore.getState()
    try {
      const xml = await fetchDanmaku(cid)
      if (xml) {
        const safeName = title.replace(/[<>:"/\\|?*]/g, '_')
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${safeName}_danmaku.xml`; a.click()
        URL.revokeObjectURL(url)
        toast.success('弹幕已下载')
      } else {
        toast.warning('该视频暂无弹幕')
      }
    } catch {
      toast.error('弹幕下载失败')
    }
  }

  /** 独立下载字幕 SRT 文件（不下载视频） */
  const handleDownloadSubtitle = async () => {
    if (!bvid || cid == null) return
    const toast = useToastStore.getState()
    try {
      const srt = await fetchSubtitle(bvid, cid)
      if (srt) {
        const safeName = title.replace(/[<>:"/\\|?*]/g, '_')
        const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${safeName}_subtitle.srt`; a.click()
        URL.revokeObjectURL(url)
        toast.success('字幕已下载')
      } else {
        toast.warning('该视频暂无字幕')
      }
    } catch {
      toast.error('字幕下载失败')
    }
  }

  /* ── Keyboard navigation within chip group ── */
  const handleChipKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLButtonElement>) => {
      const available = qualities
        .map((q, i) => ({ ...q, index: i }))
        .filter((q) => q.available)

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = available.find((q) => q.index > index)
        if (next) setFocusedIndex(next.index)
        else setFocusedIndex(available[0]?.index ?? null)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = [...available].reverse().find((q) => q.index < index)
        if (prev) setFocusedIndex(prev.index)
        else setFocusedIndex(available[available.length - 1]?.index ?? null)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (qualities[index].available) setSelectedIndex(index)
      }
    },
    [qualities]
  )

  const handleAddToQueue = () => {
    onAddToQueue?.(selectedQuality)
  }

  return (
    <article
      className="card-hover"
      style={{
        borderRadius: 'var(--card-radius)',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: isHovered ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
        padding: 'var(--card-padding)',
        maxWidth: '720px',
        animation: 'card-enter 300ms var(--ease-out) both',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Top row: Cover + Info ── */}
      <div className="flex gap-4t">
        {/* Cover: loading → image → fallback on error */}
        {showCoverImage && (
        <div
          className="flex-shrink-0 flex items-center justify-center overflow-hidden relative"
          style={{
            width: '280px',
            height: '158px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--surface-overlay)',
          }}
        >
          {/* <img> always rendered so the browser actually loads it */}
          {coverUrl && !imgError && (
            <img
              src={coverUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgLoading(false); setImgError(true) }}
              loading="lazy"
            />
          )}

          {/* Loading overlay — shown on top while image fetches */}
          {imgLoading && coverUrl && !imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2t" style={{ backgroundColor: 'var(--surface-overlay)' }}>
              <div
                className="rounded-full animate-spin"
                style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid var(--border-subtle)',
                  borderTopColor: 'var(--color-accent)',
                }}
              />
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                封面加载中…
              </span>
            </div>
          )}

          {/* Error or no-URL fallback */}
          {(imgError || !coverUrl) && !imgLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2t">
              <ImageSquare size={28} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                {imgError ? '封面加载失败' : '暂无封面'}
              </span>
            </div>
          )}
        </div>
        )}

        {/* Info area */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Title */}
          <h2
            className="font-medium leading-snug"
            style={{
              fontSize: 'var(--text-heading-sm)',
              lineHeight: 'var(--text-heading-sm-lh)',
              color: 'var(--text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={title}
          >
            {title}
            <CopyIconButton onClick={() => copyText(title, '标题')} />
          </h2>

          {/* Meta: UP + stats + BV号 */}
          <div
            className="flex flex-wrap items-center gap-x-3t gap-y-1t mt-2t"
            style={{
              fontSize: 'var(--text-body-sm)',
              lineHeight: 'var(--text-body-sm-lh)',
              color: 'var(--text-secondary)',
            }}
          >
            <span className="flex items-center gap-1t"><User size={13} weight="regular" />{upName}</span>
            <MetaDot />
            <span className="flex items-center gap-1t"><Eye size={13} weight="regular" />{views}</span>
            <MetaDot />
            <span className="flex items-center gap-1t"><Clock size={13} weight="regular" />{duration}</span>
            <MetaDot />
            <span className="flex items-center gap-1t"><Calendar size={13} weight="regular" />{date}</span>
            {bvid && (
              <>
                <MetaDot />
                <span className="flex items-center gap-1t" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {bvid}
                  <CopyIconButton onClick={() => copyText(bvid, 'BV号')} />
                </span>
              </>
            )}
          </div>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="self-end flex items-center justify-center rounded-sm transition-colors duration-fast"
              style={{
                width: '28px',
                height: '28px',
                fontSize: '14px',
                color: 'var(--text-tertiary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-tertiary)'
              }}
            >
              <X size={14} weight="regular" />
            </button>
          )}
        </div>
      </div>

      {/* ── Quality Chips ── */}
      <div
        className="flex flex-wrap items-center mt-4t"
        style={{ gap: 'var(--chip-gap)' }}
        role="radiogroup"
        aria-label="选择清晰度"
      >
        <span
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-secondary)',
            marginRight: '4px',
          }}
        >
          清晰度:
        </span>
        {qualities.map((q, i) => (
          <QualityChip
            key={q.label}
            option={q}
            selected={i === selectedIndex}
            focused={i === focusedIndex}
            onClick={() => q.available && setSelectedIndex(i)}
            onKeyDown={(e) => handleChipKeyDown(i, e)}
          />
        ))}
      </div>

      {/* ── Inline download mode buttons ── */}
      {downloadModeStyle === 'inline' && (
        <div
          className="flex flex-wrap items-center mt-2t"
          style={{ gap: '8px' }}
        >
          <span
            style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--text-secondary)',
              marginRight: '4px',
            }}
          >
            下载方式:
          </span>
          <InlineModeButton
            icon="📹"
            label="仅视频"
            onClick={() => onAddToQueueWithMode?.(selectedQuality, 'video-only')}
          />
          <InlineModeButton
            icon="🎵"
            label="仅音频"
            onClick={() => onAddToQueueWithMode?.(selectedQuality, 'audio-only')}
          />
          <InlineModeButton
            icon="📦"
            label="分别下载"
            onClick={() => onAddToQueueWithMode?.(selectedQuality, 'separate')}
          />
          <InlineModeButton
            icon="🔗"
            label="合并"
            onClick={() => onAddToQueueWithMode?.(selectedQuality, 'merge')}
          />
          <span
            onClick={onNavigateToSettings}
            title="前往设置页调整更多下载选项"
            style={{
              fontSize: '11px',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              marginLeft: 'auto',
              opacity: 0.7,
            }}
          >
            ⚙ 更多设置 →
          </span>
          {/* 字幕/弹幕快捷开关 + 独立下载 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexBasis: '100%',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>附带:</span>
            <TogglePill label="弹幕" icon="💬" storeKey="danmaku" onDownload={handleDownloadDanmaku} />
            <TogglePill label="字幕" icon="📝" storeKey="subtitle" onDownload={handleDownloadSubtitle} />
          </div>
        </div>
      )}

      {/* ── Action Bar ── */}
      <div
        className="flex items-center justify-between mt-4t pt-4t"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          预估: {selectedQuality.size} ({selectedQuality.label})
        </span>

        {downloadModeStyle === 'popup' && (
          <button
            onClick={handleAddToQueue}
            className="flex items-center justify-center font-medium transition-all duration-fast"
            style={{
              height: 'var(--btn-height)',
              paddingLeft: '24px',
              paddingRight: '24px',
              borderRadius: 'var(--btn-radius)',
              fontSize: 'var(--text-body)',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            加入下载队列
          </button>
        )}
      </div>

    </article>
  )
}

/* ── Helpers ── */

function CopyIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title="复制"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '18px', height: '18px', borderRadius: '4px',
        border: 'none', backgroundColor: 'transparent', color: 'var(--text-tertiary)',
        cursor: 'pointer', fontSize: '11px', flexShrink: 0,
        opacity: 0, transition: 'opacity 0.15s, background 0.15s, color 0.15s',
        marginLeft: '3px',
      }}
      className="copy-btn"
    >
      <Copy size={12} weight="regular" />
    </button>
  )
}

function MetaDot() {
  return (
    <span
      className="select-none"
      style={{ color: 'var(--text-disabled)', fontSize: '8px' }}
    >
      ●
    </span>
  )
}

function TogglePill({ label, icon, storeKey, onDownload }: {
  label: string
  icon: string
  storeKey: 'danmaku' | 'subtitle'
  onDownload?: () => void
}) {
  const key = storeKey === 'danmaku' ? 'downloadDanmaku' as const : 'downloadSubtitle' as const
  const active = useUserPrefsStore((s) => s[key])
  const setter = storeKey === 'danmaku'
    ? (v: boolean) => useUserPrefsStore.getState().setDownloadDanmaku(v)
    : (v: boolean) => useUserPrefsStore.getState().setDownloadSubtitle(v)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0' }}>
      <button
        onClick={() => setter(!active)}
        title={active ? `已开启随视频下载${label}` : `随视频下载${label}（关）`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 4px 2px 8px',
          borderRadius: 'var(--radius-full, 999px) 0 0 var(--radius-full, 999px)',
          fontSize: '11px',
          border: active ? '1px solid var(--color-accent)' : '1px solid var(--border-subtle)',
          borderRight: 'none',
          background: active ? 'var(--color-accent-muted)' : 'transparent',
          color: active ? 'var(--color-accent)' : 'var(--text-tertiary)',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </button>
      {onDownload && (
        <button
          onClick={(e) => { e.stopPropagation(); onDownload() }}
          title={`单独下载${label}（不下载视频）`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 7px',
            borderRadius: '0 var(--radius-full, 999px) var(--radius-full, 999px) 0',
            fontSize: '11px',
            border: active ? '1px solid var(--color-accent)' : '1px solid var(--border-subtle)',
            borderLeft: 'none',
            background: 'transparent',
            color: active ? 'var(--color-accent)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <DownloadSimple size={12} weight="bold" />
        </button>
      )}
    </span>
  )
}

function InlineModeButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="transition-all duration-fast"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: 'var(--radius-full, 999px)',
        fontSize: 'var(--text-body-sm)',
        lineHeight: 'var(--text-body-sm-lh)',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-accent)'
        e.currentTarget.style.backgroundColor = 'var(--color-accent-muted)'
        e.currentTarget.style.color = 'var(--color-accent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.96)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
