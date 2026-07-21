import { useEffect, useState } from 'react'
import { VideoCamera, MusicNotes, Archive, LinkSimple, X, Warning } from '@phosphor-icons/react'

export type DownloadChoice = 'video-only' | 'audio-only' | 'separate' | 'merge'

export interface DownloadChoiceDialogProps {
  title: string
  isDash: boolean
  hasVideo: boolean
  hasAudio: boolean
  onSelect: (mode: DownloadChoice) => void
  onCancel: () => void
}

/**
 * DownloadChoiceDialog — modal dialog for choosing download mode.
 *
 * Uses CSS variables for theme support, consistent with ConfirmDialog.
 * Handles three cases:
 *   1. hasVideo && !hasAudio (single stream): simplified single-button "download video" dialog
 *   2. hasVideo && hasAudio (DASH dual stream): 4-choice dialog with merge warning sub-dialog
 *   3. !hasVideo && hasAudio: handled by the service layer, this component is not rendered
 *
 * Merge warning is shown as an internal state transition within the same component.
 */
export default function DownloadChoiceDialog({
  title,
  isDash,
  hasVideo,
  hasAudio,
  onSelect,
  onCancel,
}: DownloadChoiceDialogProps) {
  const [showMergeWarning, setShowMergeWarning] = useState(false)

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMergeWarning) {
          // Merge warning cancel → fall back to video-only
          onSelect('video-only')
        } else {
          onCancel()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, onSelect, showMergeWarning])

  const isSingleStream = hasVideo && !hasAudio

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        animation: 'dialog-fade-in 150ms var(--ease-out) both',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (showMergeWarning) {
            onSelect('video-only')
          } else {
            onCancel()
          }
        }
      }}
    >
      {showMergeWarning ? (
        /* ── Merge Warning Sub-dialog ── */
        <div
          className="flex flex-col"
          style={{
            maxWidth: '440px',
            width: '90%',
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            padding: '24px',
            animation: 'dialog-scale-in 200ms var(--ease-spring) both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3t mb-4t">
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'var(--color-warning-bg)',
              }}
            >
              <Warning size={20} weight="fill" style={{ color: 'var(--color-warning)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{
                fontSize: 'var(--text-body)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                lineHeight: 'var(--text-body-lh)',
              }}>
                浏览器模式不支持自动合并
              </p>
              <p style={{
                fontSize: 'var(--text-body-sm)',
                color: 'var(--text-secondary)',
                lineHeight: 'var(--text-body-sm-lh, 1.5)',
                marginTop: '4px',
              }}>
                浏览器无法自动合并音视频文件。<br /><br />
                下载后你会得到两个文件：<br />
                &nbsp;&nbsp;• 视频文件 (.mp4) — 没有声音<br />
                &nbsp;&nbsp;• 音频文件 (.m4a) — 只有声音<br /><br />
                <span style={{ fontWeight: 600 }}>推荐方案：</span><br />
                1. 使用 BilibiliDown 桌面版 (Electron)，支持 FFmpeg 自动合成<br />
                2. 或下载后用 FFmpeg 命令手动合并：<br />
                <code style={{
                  display: 'block',
                  margin: '6px 0 0',
                  padding: '6px 10px',
                  background: 'var(--surface-overlay)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: '"Cascadia Code","Fira Code","JetBrains Mono",Consolas,monospace',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  wordBreak: 'break-all',
                }}>
                  ffmpeg -i 视频.mp4 -i 音频.m4a -c copy 输出.mp4
                </code>
              </p>
            </div>
          </div>

          <p style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-primary)',
            fontWeight: 500,
            marginBottom: '16px',
          }}>
            是否下载视频+音频两个文件？
          </p>

          <div className="flex items-center justify-end gap-3t">
            <button
              onClick={() => onSelect('video-only')}
              className="px-4t py-2t rounded-md transition-all duration-fast"
              style={{
                fontSize: 'var(--text-body-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
                e.currentTarget.style.borderColor = 'var(--border-strong)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border-default)'
              }}
            >
              取消
            </button>
            <button
              onClick={() => onSelect('separate')}
              className="px-4t py-2t rounded-md transition-all duration-fast font-medium"
              style={{
                fontSize: 'var(--text-body-sm)',
                fontWeight: 600,
                color: 'var(--color-accent-text, #fff)',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              下载两个文件
            </button>
          </div>
        </div>
      ) : isSingleStream ? (
        /* ── Single-stream: Video Only ── */
        <div
          className="flex flex-col"
          style={{
            maxWidth: '380px',
            width: '90%',
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            padding: '24px',
            animation: 'dialog-scale-in 200ms var(--ease-spring) both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-content-between mb-1t">
            <p style={{
              margin: 0,
              fontSize: 'var(--text-body-sm)',
              color: 'var(--text-tertiary)',
            }}>
              确认下载 · {isDash ? 'DASH 单视频流（无独立音轨）' : 'FLV 单流格式（音视频已合并）'}
            </p>
            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
                padding: '0 0 0 12px',
              }}
              title="取消"
            >
              <X size={18} />
            </button>
          </div>
          <p style={{
            margin: '0 0 20px',
            fontSize: 'var(--text-body)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }} title={title}>
            {title}
          </p>
          <button
            onClick={() => onSelect('video-only')}
            style={{
              padding: '12px 16px',
              border: '2px solid var(--color-accent)',
              borderRadius: 'var(--radius-lg, 10px)',
              background: 'var(--color-accent-muted)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <VideoCamera size={20} style={{ color: 'var(--color-accent)' }} />
            <div>
              <b>下载视频</b>
              <br />
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>完整视频文件，无需额外操作</span>
            </div>
          </button>
          <p style={{
            margin: '14px 0 0',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
          }}>
            这是单流格式，音视频已合并，下载即完整视频
          </p>
        </div>
      ) : (
        /* ── DASH Dual-stream: 4 Choices ── */
        <div
          className="flex flex-col"
          style={{
            maxWidth: '380px',
            width: '90%',
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            padding: '24px',
            animation: 'dialog-scale-in 200ms var(--ease-spring) both',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between margin-bottom-1t">
            <p style={{
              margin: 0,
              fontSize: 'var(--text-body-sm)',
              color: 'var(--text-tertiary)',
            }}>
              此视频音视频分离 (DASH)，请选择下载方式
            </p>
            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
                padding: '0 0 0 12px',
              }}
              title="取消"
            >
              <X size={18} />
            </button>
          </div>
          <p style={{
            margin: '0 0 20px',
            fontSize: 'var(--text-body)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }} title={title}>
            {title}
          </p>

          {/* Choice buttons */}
          <ChoiceButton
            icon={<VideoCamera size={20} />}
            label="仅视频"
            desc="只需画面，静音下载"
            onClick={() => onSelect('video-only')}
          />
          <ChoiceButton
            icon={<MusicNotes size={20} />}
            label="仅音频"
            desc="提取声音，保存为 .m4a (AAC)"
            onClick={() => onSelect('audio-only')}
          />
          <ChoiceButton
            icon={<Archive size={20} />}
            label="都要（分别下载）"
            desc="下载视频和音频两个独立文件"
            onClick={() => onSelect('separate')}
          />
          <ChoiceButton
            icon={<LinkSimple size={20} />}
            label="合并（视频+音频合成一个文件）"
            desc="视频+音频合成为一个文件"
            onClick={() => setShowMergeWarning(true)}
          />

          {/* Browser merge warning */}
          <p style={{
            margin: '14px 0 0',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg, 8px)',
            padding: '8px 12px',
            lineHeight: 1.5,
          }}>
            浏览器模式不支持音视频合并。如需自动合并，请使用桌面版 (Electron)
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Choice button helper ── */

function ChoiceButton({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg, 10px)',
        background: 'var(--surface-elevated)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px',
        transition: 'border-color 150ms, background-color 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-accent)'
        e.currentTarget.style.background = 'var(--color-accent-muted)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.background = 'var(--surface-elevated)'
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
      <div>
        <b>{label}</b>
        <br />
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{desc}</span>
      </div>
    </button>
  )
}
