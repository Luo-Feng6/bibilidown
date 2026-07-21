import { useDownloadStore } from '../stores/downloadStore'
import { useUserPrefsStore } from '../stores/userPrefsStore'

interface StatusBarProps {
  onLoginClick?: () => void
}

/**
 * StatusBar — Bottom 28px bar showing connection status,
 * download queue summary, and login status.
 */
export default function StatusBar({ onLoginClick }: StatusBarProps) {
  const activeCount = useDownloadStore((s) => s.activeCount)
  const totalCount = useDownloadStore((s) => s.items.length)
  const cookieStatus = useUserPrefsStore((s) => s.cookieStatus)
  const cookieUsername = useUserPrefsStore((s) => s.cookieUsername)
  const loginName = useUserPrefsStore((s) => s.loginName)
  const loginFace = useUserPrefsStore((s) => s.loginFace)

  const displayName = cookieUsername ?? loginName
  const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI

  return (
    <footer
      className="flex items-center justify-between flex-shrink-0 px-3t"
      style={{
        height: 'var(--statusbar-height)',
        fontSize: 'var(--text-caption)',
        lineHeight: 'var(--text-caption-lh)',
        color: 'var(--text-tertiary)',
        backgroundColor: 'var(--surface-default)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left: Mode indicator + connection status + version */}
      <div className="flex items-center gap-2t">
        {/* Platform mode indicator */}
        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            opacity: 0.7,
          }}
          title={isDesktop ? undefined : '部分功能仅桌面版可用'}
        >
          {isDesktop ? '\u{1F5A5}️ 桌面版' : '\u{1F310} 浏览器模式'}
        </span>
        <span style={{ color: 'var(--text-disabled)' }}>·</span>

        {/* Login hint */}
        {!displayName && (
          <>
            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                opacity: 0.7,
              }}
            >
              {'\u{1F512} 未登录 — 仅480P'}
            </span>
            <span style={{ color: 'var(--text-disabled)' }}>·</span>
          </>
        )}

        <span
          className="inline-block rounded-full flex-shrink-0"
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--color-success)',
          }}
        />
        <span>就绪</span>
        <span style={{ color: 'var(--text-disabled)' }}>·</span>
        <span>v7.2.0</span>
        {cookieStatus === 'expired' && (
          <>
            <span style={{ color: 'var(--text-disabled)' }}>·</span>
            <button
              onClick={onLoginClick}
              className="transition-colors duration-fast hover:underline"
              style={{
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                color: 'var(--color-warning)',
                fontSize: 'inherit',
              }}
            >
              会话已过期
            </button>
          </>
        )}
      </div>

      {/* Center: Download queue summary */}
      <div className="flex items-center gap-2t">
        <span>下载队列 {activeCount()}/{totalCount}</span>
      </div>

      {/* Right: version info */}
      <div className="flex items-center gap-2t">
        {displayName && (
          <div className="flex items-center gap-1.5t">
            {loginFace ? (
              <img
                src={loginFace}
                alt={displayName}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : null}
            <span>{displayName}</span>
          </div>
        )}
      </div>
    </footer>
  )
}
