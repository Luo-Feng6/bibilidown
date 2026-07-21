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

  const displayName = cookieUsername ?? loginName

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
      {/* Left: Connection status + version */}
      <div className="flex items-center gap-2t">
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
        <span>v7.0.0</span>
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
                color: '#D97706',
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
        <span style={{ color: 'var(--text-disabled)' }}>·</span>
        <span>总计 —</span>
      </div>

      {/* Right: Login status */}
      <button
        onClick={onLoginClick}
        className="transition-colors duration-fast hover:underline"
        style={{
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {displayName ? displayName : '未登录'}
      </button>
    </footer>
  )
}
