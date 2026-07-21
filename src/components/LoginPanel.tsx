import { useState, useEffect, useRef } from 'react'
import { X, QrCode, Password, DeviceMobile, CheckCircle, Warning, User, SignOut } from '@phosphor-icons/react'
import QRCode from 'qrcode'
import {
  generateQrCode,
  pollQrStatus,
  loginWithPassword,
  sendSmsCode,
  loginWithSms,
  logout as doLogout,
  checkLoginState,
  type LoginTab,
} from '../services/login-service'
import { setGlobalCookie } from '../services/bilibili-api'
import { useUserPrefsStore } from '../stores/userPrefsStore'

interface LoginPanelProps {
  open: boolean
  onClose: () => void
}

type QrStatus = 'loading' | 'ready' | 'scanned' | 'expired' | 'success'

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

  // User prefs
  const { loginName, loginFace, cookieStr, setLoginInfo, clearLoginInfo } = useUserPrefsStore()

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
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
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

/* ── Logged-in view ── */

function LoggedInView({
  name,
  face,
  onLogout,
}: {
  name: string
  face: string
  onLogout: () => void
}) {
  return (
    <div className="flex flex-col items-center pt-6t">
      <CheckCircle size={40} weight="fill" style={{ color: 'var(--color-success)' }} />
      <p
        className="mt-3t font-medium"
        style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)' }}
      >
        已登录
      </p>

      <div className="flex items-center gap-3t mt-4t">
        {face ? (
          <img
            src={face}
            alt={name}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid var(--color-accent)',
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-overlay)',
              border: '2px solid var(--border-subtle)',
            }}
          >
            <User size={24} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 500 }}>
          {name}
        </span>
      </div>

      <button
        onClick={onLogout}
        className="flex items-center gap-2t mt-6t px-4t transition-colors duration-fast"
        style={{
          height: '36px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--surface-default)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-error)'
          e.currentTarget.style.color = 'var(--color-error)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        <SignOut size={16} weight="regular" />
        退出登录
      </button>
    </div>
  )
}

/* ── QR Code login tab ── */

function QrLoginTab() {
  const [status, setStatus] = useState<QrStatus>('loading')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const qrcodeKeyRef = useRef('')
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { setLoginInfo } = useUserPrefsStore()

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setStatus('loading')
        setError('')
        const { url, qrcodeKey } = await generateQrCode()
        if (cancelled) return

        qrcodeKeyRef.current = qrcodeKey

        // Generate QR code data URL
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: { dark: '#ffffff', light: '#00000000' },
        })
        if (cancelled) return

        setQrDataUrl(dataUrl)
        setStatus('ready')

        // Start polling
        pollTimerRef.current = setInterval(async () => {
          if (cancelled) return
          try {
            const result = await pollQrStatus(qrcodeKeyRef.current)
            if (cancelled) return
            switch (result.status) {
              case 'scanned':
                setStatus('scanned')
                break
              case 'success':
                setStatus('success')
                if (pollTimerRef.current) clearInterval(pollTimerRef.current)
                if (result.cookieStr) {
                  setGlobalCookie(result.cookieStr)
                  // Check login status for user info
                  const { user } = await checkLoginState()
                  if (user) {
                    setLoginInfo(result.cookieStr, user.name, user.face)
                  }
                }
                break
              case 'expired':
                setStatus('expired')
                if (pollTimerRef.current) clearInterval(pollTimerRef.current)
                break
            }
          } catch {
            // Poll error, keep trying
          }
        }, 2000)
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '生成二维码失败')
          setStatus('expired')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  const handleRefresh = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    setQrDataUrl('')
    setError('')
    // Re-trigger effect by re-mounting key (simulated by re-init)
    qrcodeKeyRef.current = ''
    // Simple approach: reload the component
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center pt-4t">
      {/* QR code */}
      <div
        className="flex items-center justify-center relative"
        style={{
          width: '210px',
          height: '210px',
          backgroundColor: 'var(--surface-overlay)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-2t">
            <div
              className="animate-spin rounded-full"
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border-subtle)',
                borderTopColor: 'var(--color-accent)',
              }}
            />
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
              加载中...
            </span>
          </div>
        )}

        {qrDataUrl && status !== 'loading' && (
          <img
            src={qrDataUrl}
            alt="登录二维码"
            style={{
              width: '200px',
              height: '200px',
              borderRadius: 'var(--radius-lg)',
              opacity: status === 'expired' ? 0.3 : 1,
            }}
          />
        )}

        {/* Scanned overlay */}
        {status === 'scanned' && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <div className="flex flex-col items-center gap-2t">
              <CheckCircle size={32} weight="fill" style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 'var(--text-body-sm)', color: '#fff' }}>已扫码</span>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                请在手机上确认
              </span>
            </div>
          </div>
        )}

        {/* Expired overlay */}
        {status === 'expired' && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <div className="flex flex-col items-center gap-2t">
              <Warning size={32} weight="fill" style={{ color: 'var(--color-warning)' }} />
              <span style={{ fontSize: 'var(--text-body-sm)', color: '#fff' }}>已过期</span>
            </div>
          </div>
        )}

        {/* Success overlay */}
        {status === 'success' && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <div className="flex flex-col items-center gap-2t">
              <CheckCircle size={32} weight="fill" style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 'var(--text-body-sm)', color: '#fff' }}>登录成功</span>
            </div>
          </div>
        )}
      </div>

      <p
        className="mt-4t text-center"
        style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}
      >
        {status === 'loading' && '正在生成二维码...'}
        {status === 'ready' && '打开 Bilibili 客户端扫描二维码登录'}
        {status === 'scanned' && '请在手机上确认登录'}
        {status === 'expired' && '二维码已过期'}
        {status === 'success' && '登录成功！'}
      </p>

      {error && (
        <p className="mt-2t" style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      {status === 'expired' && (
        <button
          onClick={handleRefresh}
          className="mt-3t px-4t transition-colors duration-fast"
          style={{
            height: '32px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-body-sm)',
            color: 'var(--color-accent)',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-accent)',
            cursor: 'pointer',
          }}
        >
          刷新二维码
        </button>
      )}

      <p
        className="mt-2t"
        style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}
      >
        二维码有效期为 3 分钟
      </p>
    </div>
  )
}

/* ── Password login tab ── */

function PasswordLoginTab({
  onSuccess,
}: {
  onSuccess: (cookie: string, name: string, face: string) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入手机号/邮箱和密码')
      return
    }
    setLoading(true)
    setError('')

    const result = await loginWithPassword(username.trim(), password)
    setLoading(false)

    if (result.success && result.cookieStr) {
      onSuccess(result.cookieStr, result.user?.name ?? '', result.user?.face ?? '')
    } else {
      setError(result.error || '登录失败')
    }
  }

  return (
    <div className="flex flex-col gap-4t pt-2t">
      <InputField
        label="手机号 / 邮箱"
        type="text"
        placeholder="请输入手机号或邮箱"
        value={username}
        onChange={(e) => { setUsername(e.target.value); setError('') }}
      />
      <InputField
        label="密码"
        type="password"
        placeholder="请输入密码"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError('') }}
        onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
      />

      {error && (
        <div
          className="flex items-center gap-2t px-3t py-2t rounded-lg"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <Warning size={16} weight="fill" style={{ color: 'var(--color-error)' }} />
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)' }}>{error}</span>
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center font-medium transition-all duration-fast mt-2t"
        style={{
          height: 'var(--btn-height)',
          paddingLeft: 'var(--btn-padding-x)',
          paddingRight: 'var(--btn-padding-x)',
          borderRadius: 'var(--btn-radius)',
          fontSize: 'var(--text-body)',
          backgroundColor: loading ? 'var(--btn-primary-disabled, #6b7280)' : 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)'
        }}
      >
        {loading ? '登录中...' : '登录'}
      </button>

      <p
        className="text-center mt-2t"
        style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}
      >
        推荐使用二维码登录，更安全便捷
      </p>
    </div>
  )
}

/* ── SMS login tab ── */

function SmsLoginTab({
  onSuccess,
}: {
  onSuccess: (cookie: string, name: string, face: string) => void
}) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [captchaKey, setCaptchaKey] = useState('')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [countdown])

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError('请输入手机号')
      return
    }
    setSending(true)
    setError('')

    const result = await sendSmsCode(phone.trim())
    setSending(false)

    if (result.success) {
      setCountdown(60)
      if (result.captchaKey) {
        setCaptchaKey(result.captchaKey)
      }
    } else {
      setError(result.error || '发送验证码失败')
    }
  }

  const handleLogin = async () => {
    if (!phone.trim() || !code.trim()) {
      setError('请输入手机号和验证码')
      return
    }
    setLoading(true)
    setError('')

    // 保存当前 captchaKey，避免 setState 异步问题
    const cKey = captchaKey
    const result = await loginWithSms(phone.trim(), code.trim(), cKey)
    setLoading(false)

    if (result.success && result.cookieStr) {
      onSuccess(result.cookieStr, result.user?.name ?? '', result.user?.face ?? '')
    } else {
      setError(result.error || '登录失败')
    }
  }

  return (
    <div className="flex flex-col gap-4t pt-2t">
      <InputField
        label="手机号"
        type="text"
        placeholder="请输入手机号"
        value={phone}
        onChange={(e) => { setPhone(e.target.value); setError('') }}
      />

      <div>
        <label
          className="block mb-1t"
          style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}
        >
          验证码
        </label>
        <div className="flex gap-3t">
          <input
            type="text"
            placeholder="请输入验证码"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
            className="flex-1"
            style={{
              height: 'var(--input-height)',
              padding: '0 12px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-default)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-body)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--input-border-focus)'
              e.currentTarget.style.boxShadow = 'var(--input-ring-focus)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={handleSendCode}
            disabled={sending || countdown > 0}
            className="flex-shrink-0 transition-colors duration-fast"
            style={{
              height: 'var(--input-height)',
              padding: '0 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-body-sm)',
              backgroundColor:
                sending || countdown > 0 ? 'var(--surface-overlay)' : 'var(--surface-overlay)',
              color:
                sending || countdown > 0 ? 'var(--text-tertiary)' : 'var(--color-accent)',
              border: 'none',
              cursor: sending || countdown > 0 ? 'not-allowed' : 'pointer',
              opacity: sending || countdown > 0 ? 0.6 : 1,
            }}
          >
            {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-2t px-3t py-2t rounded-lg"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <Warning size={16} weight="fill" style={{ color: 'var(--color-error)' }} />
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)' }}>{error}</span>
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center font-medium transition-all duration-fast mt-2t"
        style={{
          height: 'var(--btn-height)',
          paddingLeft: 'var(--btn-padding-x)',
          paddingRight: 'var(--btn-padding-x)',
          borderRadius: 'var(--btn-radius)',
          fontSize: 'var(--text-body)',
          backgroundColor: loading ? 'var(--btn-primary-disabled, #6b7280)' : 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)'
        }}
      >
        {loading ? '登录中...' : '登录'}
      </button>
    </div>
  )
}

/* ── Reusable input field ── */

function InputField({
  label,
  type,
  placeholder,
  value,
  onChange,
  onKeyDown,
}: {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label
        className="block mb-1t"
        style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="w-full"
        style={{
          height: 'var(--input-height)',
          padding: '0 12px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-default)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-body)',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--input-border-focus)'
          e.currentTarget.style.boxShadow = 'var(--input-ring-focus)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
