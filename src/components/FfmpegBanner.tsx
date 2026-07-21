import { useState } from 'react'
import { Warning, X, DownloadSimple, ArrowClockwise } from '@phosphor-icons/react'
import { useFfmpegStore } from '../stores/ffmpegStore'

/**
 * FFmpeg 缺失时的警告横幅。
 *
 * 仅在 Electron 环境中检测到 FFmpeg 不可用时显示。
 * 关闭后本次会话内不再显示（组件级 state）。
 */
export default function FfmpegBanner() {
  const [dismissed, setDismissed] = useState(false)
  const status = useFfmpegStore((s) => s.status)
  const checkFfmpeg = useFfmpegStore((s) => s.checkFfmpeg)

  // 仅当状态为 'missing' 且未手动关闭时显示
  if (status !== 'missing' || dismissed) {
    return null
  }

  return (
    <div
      className="flex items-center gap-3t px-4t py-3t mx-8t mt-4t"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.10)',
        border: '1px solid rgba(245, 158, 11, 0.22)',
        borderRadius: 'var(--radius-xl)',
      }}
    >
      {/* Icon */}
      <Warning
        size={20}
        weight="fill"
        style={{
          color: 'var(--color-warning, #f59e0b)',
          flexShrink: 0,
        }}
      />

      {/* Message */}
      <p
        className="flex-1"
        style={{
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text-primary)',
          lineHeight: 'var(--text-body-sm-lh)',
        }}
      >
        未检测到 FFmpeg — 无法合并音视频
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2t flex-shrink-0">
        {/* 下载 FFmpeg */}
        <a
          href="https://ffmpeg.org/download.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3t py-1.5 rounded-lg transition-colors text-body-sm font-medium"
          style={{
            backgroundColor: 'var(--color-warning, #f59e0b)',
            color: '#1a1a1a',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-caption)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fbbf24'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-warning, #f59e0b)'
          }}
        >
          <DownloadSimple size={14} weight="bold" />
          下载 FFmpeg
        </a>

        {/* 重新检查 */}
        <button
          onClick={() => checkFfmpeg()}
          className="inline-flex items-center gap-1.5 px-3t py-1.5 rounded-lg transition-colors text-body-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-caption)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <ArrowClockwise size={14} weight="bold" />
          已安装，重新检查
        </button>

        {/* 关闭 */}
        <button
          onClick={() => setDismissed(true)}
          className="flex items-center justify-center rounded-full transition-colors flex-shrink-0"
          style={{
            width: '24px',
            height: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
