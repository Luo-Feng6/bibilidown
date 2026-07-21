import { useState, useCallback } from 'react'
import { FilmStrip, User, Eye, Clock, Calendar, X, CaretRight } from '@phosphor-icons/react'
import QualityChip, { type QualityOption } from './QualityChip'

interface VideoCardProps {
  coverUrl: string
  title: string
  upName: string
  views: string
  duration: string
  date: string
  qualities: QualityOption[]
  onClose?: () => void
  onAddToQueue?: (quality: QualityOption) => void
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
  onClose,
  onAddToQueue,
}: VideoCardProps) {
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(
      0,
      qualities.findIndex((q) => q.selected)
    )
  )
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const selectedQuality = qualities[selectedIndex]

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
        {/* Cover placeholder */}
        <div
          className="flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            width: '280px',
            height: '158px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--gray-800)',
            color: 'var(--text-tertiary)',
            fontSize: 'var(--text-body-sm)',
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-2t">
              <FilmStrip size={32} weight="regular" />
              <span>视频封面</span>
            </div>
          )}
        </div>

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
          </h2>

          {/* Meta: UP + stats */}
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
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = ''
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

      {/* ── Advanced Options (collapsible) ── */}
      <div className="mt-3t">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1t transition-colors duration-fast"
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 200ms var(--ease-out)',
              transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '10px',
            }}
          >
            <CaretRight size={10} weight="regular" />
          </span>
          高级选项
        </button>

        {showAdvanced && (
          <div
            className="mt-2t pt-3t flex flex-wrap items-center gap-4t"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            {/* Format */}
            <OptionGroup label="格式" options={['mp4', 'flv', 'm4s']} />
            {/* Codec */}
            <OptionGroup label="编码" options={['HEVC', 'AVC', 'AV1']} />
            {/* Extras */}
            <label
              className="flex items-center gap-2t cursor-pointer"
              style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}
            >
              <input type="checkbox" defaultChecked={false} />
              下载字幕
            </label>
            <label
              className="flex items-center gap-2t cursor-pointer"
              style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}
            >
              <input type="checkbox" defaultChecked={false} />
              下载弹幕
            </label>
          </div>
        )}
      </div>

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
      </div>

      {/* ── Card enter keyframe (injected once) ── */}
      <style>{`
        @keyframes card-enter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </article>
  )
}

/* ── Helpers ── */

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

function OptionGroup({
  label,
  options,
}: {
  label: string
  options: string[]
}) {
  return (
    <div className="flex items-center gap-2t">
      <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>
        {label}:
      </span>
      {options.map((opt) => (
        <span
          key={opt}
          className="px-2t py-1t rounded-sm transition-colors duration-fast cursor-pointer"
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {opt}
        </span>
      ))}
    </div>
  )
}
