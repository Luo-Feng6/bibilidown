import { useState, useMemo, type KeyboardEvent } from 'react'
import {
  CheckSquare,
  Square,
  DownloadSimple,
  ListNumbers,
  ArrowDown,
  Spinner,
} from '@phosphor-icons/react'
import type { ParsedVideo } from '../stores/parseStore'
import type { QualityOption } from './QualityChip'
import QualityChip from './QualityChip'

interface EpisodeListProps {
  episodes: ParsedVideo[]
  onAddToQueue: (episodes: ParsedVideo[], quality: QualityOption) => void
  /** 是否还有更多页可加载（ml 收藏夹分页） */
  hasMore?: boolean
  /** 是否正在加载更多 */
  isLoadingMore?: boolean
  /** 点击"加载更多"回调 */
  onLoadMore?: () => void
}

/**
 * EpisodeList — compact batch-selection UI for multi-episode content.
 *
 * Used when parsing ss/md returns >3 episodes.
 * Shows a dense table with checkboxes, batch select controls,
 * and a global quality selector.
 *
 * UX spec §4.4: Batch operations for playlists/collections.
 */
export default function EpisodeList({
  episodes,
  onAddToQueue,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: EpisodeListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>(
    episodes[0]?.qualities.find((q) => q.selected) ?? episodes[0]?.qualities.find((q) => q.available) ?? { label: '1080P', size: '', available: true }
  )

  const allSelected = selectedIds.size === episodes.length && episodes.length > 0
  const someSelected = selectedIds.size > 0 && !allSelected
  const noneSelected = selectedIds.size === 0

  // Global quality options
  const qualityOptions = useMemo(() => {
    return episodes[0]?.qualities ?? []
  }, [episodes])

  const [qualityFocusedIdx, setQualityFocusedIdx] = useState(-1)

  const handleQualityKeyDown = (idx: number, e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = qualityOptions.findIndex(
        (q, i) => i > idx && q.available
      )
      setQualityFocusedIdx(next >= 0 ? next : idx)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = [...qualityOptions]
        .reverse()
        .findIndex((q) => qualityOptions.indexOf(q) < idx && q.available)
      const realIdx = prev >= 0 ? qualityOptions.length - 1 - prev : idx
      setQualityFocusedIdx(realIdx)
    }
  }

  const toggleEpisode = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(episodes.map((e) => e.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const invertSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set<string>()
      for (const ep of episodes) {
        if (!prev.has(ep.id)) next.add(ep.id)
      }
      return next
    })
  }

  const handleBatchAdd = () => {
    const selected = episodes.filter((e) => selectedIds.has(e.id))
    if (selected.length === 0) return
    onAddToQueue(selected, selectedQuality)
    // Clear selection after adding
    setSelectedIds(new Set())
  }

  return (
    <div className="flex flex-col gap-3t">
      {/* Header: episode count + quality selector */}
      <div
        className="flex items-center justify-between p-3t rounded-xl"
        style={{
          backgroundColor: 'var(--surface-default)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3t">
          <ListNumbers size={20} weight="regular" style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 500 }}>
            {episodes.length} 集
          </span>
        </div>

        {/* Global quality selector */}
        <div className="flex items-center gap-2t">
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
            清晰度:
          </span>
          <div className="flex flex-wrap items-center" style={{ gap: 'var(--chip-gap)' }}>
            {qualityOptions.map((q, i) => (
              <QualityChip
                key={q.label}
                option={q}
                selected={q.label === selectedQuality.label}
                focused={i === qualityFocusedIdx}
                onClick={() => q.available && setSelectedQuality(q)}
                onKeyDown={(e) => handleQualityKeyDown(i, e)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Batch controls */}
      <div className="flex items-center gap-2t">
        {/* Select-all checkbox */}
        <button
          onClick={allSelected ? deselectAll : selectAll}
          className="flex items-center gap-2t px-3t py-1t rounded-lg transition-colors duration-fast"
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-default)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {allSelected ? (
            <CheckSquare size={16} weight="fill" style={{ color: 'var(--color-accent)' }} />
          ) : someSelected ? (
            <CheckSquare size={16} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
          ) : (
            <Square size={16} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
          )}
          {allSelected ? '取消全选' : '全选'}
        </button>

        <button
          onClick={invertSelection}
          className="flex items-center gap-2t px-3t py-1t rounded-lg transition-colors duration-fast"
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-default)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          反选
        </button>

        <div className="flex-1" />

        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
          已选 {selectedIds.size} / {episodes.length}
        </span>
      </div>

      {/* Episode list */}
      <div
        className="flex flex-col overflow-hidden rounded-xl"
        style={{
          border: '1px solid var(--border-subtle)',
          maxHeight: '480px',
        }}
      >
        {/* Table header */}
        <div
          className="flex items-center px-3t py-2t flex-shrink-0"
          style={{
            backgroundColor: 'var(--surface-default)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-caption)',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}
        >
          <span style={{ width: '40px', textAlign: 'center' }}>#</span>
          <span className="flex-1">标题</span>
          <span style={{ width: '70px', textAlign: 'right' }}>时长</span>
        </div>

        {/* Scrollable rows */}
        <div className="overflow-y-auto flex-1">
          {episodes.map((ep, idx) => {
            const isSelected = selectedIds.has(ep.id)
            return (
              <button
                key={ep.id}
                onClick={() => toggleEpisode(ep.id)}
                className="flex items-center px-3t py-2t w-full text-left transition-colors duration-fast"
                style={{
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-default)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {/* Checkbox + episode number */}
                <span
                  className="flex items-center justify-center gap-1t"
                  style={{ width: '40px', flexShrink: 0 }}
                >
                  {isSelected ? (
                    <CheckSquare size={15} weight="fill" style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <Square size={15} weight="regular" style={{ color: 'var(--text-quaternary)', opacity: 0.5 }} />
                  )}
                  <span
                    style={{
                      fontSize: 'var(--text-caption)',
                      color: isSelected ? 'var(--color-accent)' : 'var(--text-tertiary)',
                      fontWeight: isSelected ? 500 : 400,
                    }}
                  >
                    {ep.episodeIndex ?? idx + 1}
                  </span>
                </span>

                {/* Title */}
                <span
                  className="flex-1 truncate"
                  style={{
                    fontSize: 'var(--text-body-sm)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    paddingRight: '8px',
                  }}
                >
                  {ep.episodeTitle || ep.title}
                </span>

                {/* Duration */}
                <span
                  style={{
                    width: '70px',
                    textAlign: 'right',
                    fontSize: 'var(--text-caption)',
                    color: 'var(--text-tertiary)',
                    flexShrink: 0,
                  }}
                >
                  {ep.duration}
                </span>
              </button>
            )
          })}

          {/* "加载更多" button for ml favorites pagination */}
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="flex items-center justify-center gap-2t w-full py-3t transition-colors duration-fast"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                borderTop: '1px solid var(--border-subtle)',
                cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-body-sm)',
                color: 'var(--text-secondary)',
                opacity: isLoadingMore ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoadingMore) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-default)'
                  e.currentTarget.style.color = 'var(--color-accent)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {isLoadingMore ? (
                <>
                  <Spinner size={16} weight="regular" className="animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <ArrowDown size={16} weight="regular" />
                  加载更多
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Add to queue button */}
      <button
        onClick={handleBatchAdd}
        disabled={noneSelected}
        className="flex items-center justify-center gap-2t font-medium transition-all duration-fast self-end"
        style={{
          height: 'var(--btn-height)',
          paddingLeft: 'var(--btn-padding-x)',
          paddingRight: 'var(--btn-padding-x)',
          borderRadius: 'var(--btn-radius)',
          fontSize: 'var(--text-body)',
          backgroundColor: noneSelected ? 'var(--surface-overlay)' : 'var(--btn-primary-bg)',
          color: noneSelected ? 'var(--text-tertiary)' : 'var(--btn-primary-text)',
          border: 'none',
          cursor: noneSelected ? 'not-allowed' : 'pointer',
          opacity: noneSelected ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!noneSelected) e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'
        }}
        onMouseLeave={(e) => {
          if (!noneSelected) e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)'
        }}
      >
        <DownloadSimple size={18} weight="regular" />
        加入下载队列 ({selectedIds.size})
      </button>
    </div>
  )
}
