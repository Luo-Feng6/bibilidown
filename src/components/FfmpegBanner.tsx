import { useState } from 'react'
import { Warning, X, DownloadSimple, ArrowClockwise, CircleNotch } from '@phosphor-icons/react'
import { useFfmpegStore } from '../stores/ffmpegStore'

/**
 * FFmpeg 缺失时的警告横幅。
 *
 * 仅在 Electron 环境中检测到 FFmpeg 不可用时显示。
 * 支持自动下载安装，显示下载进度。
 * 关闭后本次会话内不再显示（组件级 state）。
 */
export default function FfmpegBanner() {
  const [dismissed, setDismissed] = useState(false)
  const status = useFfmpegStore((s) => s.status)
  const checkFfmpeg = useFfmpegStore((s) => s.checkFfmpeg)
  const downloadPhase = useFfmpegStore((s) => s.downloadPhase)
  const downloadProgress = useFfmpegStore((s) => s.downloadProgress)
  const downloadMessage = useFfmpegStore((s) => s.downloadMessage)
  const downloadError = useFfmpegStore((s) => s.downloadError)
  const downloadFfmpeg = useFfmpegStore((s) => s.downloadFfmpeg)
  const resetDownload = useFfmpegStore((s) => s.resetDownload)

  // Determine whether to show the banner
  const isDownloading =
    downloadPhase === 'downloading' ||
    downloadPhase === 'extracting' ||
    downloadPhase === 'installing'

  // Always show while downloading; otherwise respect dismissed + status
  if (dismissed && !isDownloading) return null
  if (status !== 'missing' && !isDownloading && downloadPhase !== 'error') return null

  const handleClose = () => {
    if (isDownloading) {
      // During download, close just dismisses — download continues in background
      setDismissed(true)
    } else {
      setDismissed(true)
      resetDownload()
    }
  }

  const accentColor = 'var(--color-warning, #f59e0b)'

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
      {isDownloading ? (
        <CircleNotch
          size={20}
          weight="bold"
          style={{
            color: accentColor,
            flexShrink: 0,
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : downloadPhase === 'error' ? (
        <Warning
          size={20}
          weight="fill"
          style={{
            color: 'var(--color-danger, #ef4444)',
            flexShrink: 0,
          }}
        />
      ) : (
        <Warning
          size={20}
          weight="fill"
          style={{
            color: accentColor,
            flexShrink: 0,
          }}
        />
      )}

      {/* Message / Progress */}
      <div className="flex-1 min-w-0">
        {isDownloading ? (
          <div className="flex flex-col gap-1.5">
            <p
              style={{
                fontSize: 'var(--text-body-sm)',
                color: 'var(--text-primary)',
                lineHeight: 'var(--text-body-sm-lh)',
              }}
            >
              {downloadMessage}
            </p>
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div
                style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${downloadProgress}%`,
                    height: '100%',
                    backgroundColor: accentColor,
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 'var(--text-caption)',
                  color: 'var(--text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '2.5em',
                  textAlign: 'right',
                }}
              >
                {Math.round(downloadProgress)}%
              </span>
            </div>
          </div>
        ) : downloadPhase === 'error' ? (
          <p
            style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--text-primary)',
              lineHeight: 'var(--text-body-sm-lh)',
            }}
          >
            安装失败：{downloadError || '未知错误'}
          </p>
        ) : (
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
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2t flex-shrink-0">
        {isDownloading ? (
          /* During download: only close button */
          <button
            onClick={handleClose}
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
        ) : downloadPhase === 'error' ? (
          <>
            {/* Retry button */}
            <button
              onClick={() => downloadFfmpeg()}
              className="inline-flex items-center gap-1.5 px-3t py-1.5 rounded-lg transition-colors text-body-sm font-medium"
              style={{
                backgroundColor: accentColor,
                color: '#1a1a1a',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-caption)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fbbf24'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = accentColor
              }}
            >
              <ArrowClockwise size={14} weight="bold" />
              重试
            </button>

            {/* Manual download fallback */}
            <a
              href="https://ffmpeg.org/download.html"
              target="_blank"
              rel="noopener noreferrer"
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
              <DownloadSimple size={14} weight="bold" />
              手动下载
            </a>

            {/* Close */}
            <button
              onClick={handleClose}
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
          </>
        ) : (
          <>
            {/* Auto-install button */}
            <button
              onClick={() => downloadFfmpeg()}
              className="inline-flex items-center gap-1.5 px-3t py-1.5 rounded-lg transition-colors text-body-sm font-medium"
              style={{
                backgroundColor: accentColor,
                color: '#1a1a1a',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-caption)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fbbf24'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = accentColor
              }}
            >
              <DownloadSimple size={14} weight="bold" />
              自动安装 FFmpeg
            </button>

            {/* Re-check button */}
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

            {/* Close */}
            <button
              onClick={handleClose}
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
          </>
        )}
      </div>

      {/* Inline keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
