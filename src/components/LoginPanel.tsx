import { useState } from 'react'
import { X, QrCode, Password, DeviceMobile } from '@phosphor-icons/react'
import { logout as doLogout, type LoginTab } from '../services/login-service'
import { setGlobalCookie } from '../services/bilibili-api'
import { useUserPrefsStore } from '../stores/userPrefsStore'
import { useShallow } from 'zustand/shallow'
import LoggedInView from './LoggedInView'
import QrLoginTab from './QrLoginTab'
import PasswordLoginTab from './PasswordLoginTab'
import SmsLoginTab from './SmsLoginTab'

interface LoginPanelProps {
  open: boolean
  onClose: () => void
}

/**
 * LoginPanel — slide-in overlay from the right for Bilibili login.
 *
 * UX spec §5.6:
 * - NOT a dialog — slides in from right over main content
 * - 3 tabs: QR code (default), password, SMS
 * - Backdrop overlay with acrylic blur
 * - Width: 360px
 */
export default function LoginPanel({ open, onClose }: LoginPanelProps) {
  const [activeTab, setActiveTab] = useState<LoginTab>('qr')

  // User prefs — useShallow so unrelated store changes don't re-render us
  const { loginName, loginFace, cookieStr, setLoginInfo, clearLoginInfo } = useUserPrefsStore(
    useShallow((s) => ({
      loginName: s.loginName,
      loginFace: s.loginFace,
      cookieStr: s.cookieStr,
      setLoginInfo: s.setLoginInfo,
      clearLoginInfo: s.clearLoginInfo,
    }))
  )

  const isLoggedIn = !!loginName

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-slow"
        style={{
          backgroundColor: 'var(--surface-overlay)',
          opacity: open ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-xl"
        style={{
          width: '360px',
          backgroundColor: 'var(--surface-elevated)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
          animation: 'panel-slide-in 300ms var(--ease-spring) both',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0 px-4t"
          style={{ height: '48px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2
            className="font-medium"
            style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)' }}
          >
            登录 Bilibili
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-sm transition-colors duration-fast"
            style={{
              width: '32px',
              height: '32px',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
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
            <X size={18} weight="regular" />
          </button>
        </div>

        {/* Tab bar — hidden when logged in */}
        {!isLoggedIn && (
          <div
            className="flex flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            {([
              { key: 'qr' as const, label: '二维码', icon: <QrCode size={16} weight="regular" /> },
              { key: 'password' as const, label: '密码', icon: <Password size={16} weight="regular" /> },
              { key: 'sms' as const, label: '短信', icon: <DeviceMobile size={16} weight="regular" /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-2t transition-colors duration-fast"
                style={{
                  height: '40px',
                  fontSize: 'var(--text-body-sm)',
                  fontWeight: activeTab === tab.key ? 500 : 400,
                  color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab.key
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto p-6t">
          {/* Logged-in state */}
          {isLoggedIn ? (
            <LoggedInView
              name={loginName}
              face={loginFace}
              onLogout={() => {
                doLogout()
                clearLoginInfo()
                setGlobalCookie('')
              }}
            />
          ) : (
            <>
              {activeTab === 'qr' && <QrLoginTab />}
              {activeTab === 'password' && (
                <PasswordLoginTab
                  onSuccess={(cookie, name, face) => {
                    setGlobalCookie(cookie)
                    setLoginInfo(cookie, name, face)
                  }}
                />
              )}
              {activeTab === 'sms' && (
                <SmsLoginTab
                  onSuccess={(cookie, name, face) => {
                    setGlobalCookie(cookie)
                    setLoginInfo(cookie, name, face)
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Slide-in animation keyframe */}
        <style>{`
          @keyframes panel-slide-in {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>
      </aside>
    </>
  )
}
