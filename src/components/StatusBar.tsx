import { useState, useEffect, useRef } from 'react'
import { useDownloadStore } from '../stores/downloadStore'
import { useUserPrefsStore } from '../stores/userPrefsStore'
import { logout } from '../services/login-service'
import { setGlobalCookie } from '../services/bilibili-api'

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

      {/* Right: login info */}
      <div className="flex items-center gap-2t">
        {displayName ? (
          <LoggedInUser
            displayName={displayName}
            loginFace={loginFace}
            onSwitchAccount={() => {
              logout()
              useUserPrefsStore.getState().clearLoginInfo()
              setGlobalCookie('')
              onLoginClick?.()
            }}
            onLogout={() => {
              logout()
              useUserPrefsStore.getState().clearLoginInfo()
              setGlobalCookie('')
            }}
          />
        ) : null}
      </div>
    </footer>
  )
}

/** 已登录用户区域 — 点击弹出退出/切换菜单 */
function LoggedInUser({
  displayName,
  loginFace,
  onSwitchAccount,
  onLogout,
}: {
  displayName: string
  loginFace: string
  onSwitchAccount: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title="账号管理"
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 'var(--text-caption)', color: 'var(--text-secondary)',
          fontFamily: 'inherit', padding: '2px 4px', borderRadius: '4px',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-overlay)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'none' }}
      >
        {loginFace ? (
          <img
            src={loginFace}
            alt={displayName}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{
              width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : null}
        <span>{displayName}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, zIndex: 200, marginBottom: '6px',
          minWidth: '130px', padding: '4px',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)',
          backgroundColor: '#1a1a2e', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: '1px',
        }}>
          <button
            onClick={() => { setOpen(false); onSwitchAccount() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '30px', padding: '0 10px', borderRadius: '6px',
              border: 'none', backgroundColor: 'transparent', color: '#e0e0e0',
              fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            🔄 更换账号
          </button>
          <button
            onClick={() => { setOpen(false); onLogout() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '30px', padding: '0 10px', borderRadius: '6px',
              border: 'none', backgroundColor: 'transparent', color: '#e0e0e0',
              fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,80,80,0.15)'; e.currentTarget.style.color = '#ff6b6b' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#e0e0e0' }}
          >
            🚪 退出账号
          </button>
        </div>
      )}
    </div>
  )
}
