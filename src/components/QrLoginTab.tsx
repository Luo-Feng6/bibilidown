import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Warning } from '@phosphor-icons/react'
import QRCode from 'qrcode'
import { generateQrCode, pollQrStatus } from '../services/login-service'
import { setGlobalCookie } from '../services/bilibili-api'
import { useUserPrefsStore } from '../stores/userPrefsStore'

type QrStatus = 'loading' | 'ready' | 'scanned' | 'expired' | 'success'

function QrLoginTab() {
  const [status, setStatus] = useState<QrStatus>('loading')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const [qrVersion, setQrVersion] = useState(0)
  const qrcodeKeyRef = useRef('')
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setLoginInfoForStore = useUserPrefsStore((s) => s.setLoginInfo)
  const theme = useUserPrefsStore((s) => s.theme)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setStatus('loading')
        setError('')
        const { url, qrcodeKey } = await generateQrCode()
        if (cancelled) return

        qrcodeKeyRef.current = qrcodeKey

        // QR dark color: black in light mode, white in dark mode
        const qrDark = theme === 'light' ? '#1e293b' : '#ffffff'
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: { dark: qrDark, light: '#00000000' },
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
                  // 直接用提取到的 cookieStr 验证，不依赖 localStorage
                  const { validateLoginStatus, persistCookie } = await import('../services/cookie-manager')
                  const { user, isValid } = await validateLoginStatus(result.cookieStr)
                  if (isValid && user) {
                    persistCookie(result.cookieStr, true)
                    setLoginInfoForStore(result.cookieStr, user.name, user.face)
                  } else if (result.cookieStr.includes('SESSDATA')) {
                    // cookie 提取成功但验证失败（可能是网络问题），依然保存
                    const { persistCookie } = await import('../services/cookie-manager')
                    persistCookie(result.cookieStr, true)
                    setLoginInfoForStore(result.cookieStr, '', '')
                  }
                } else {
                  // cookieStr 为空 — 可能 HttpOnly 未剥离，尝试从 document.cookie 重新提取
                  console.warn('[QR login] cookieStr is empty — trying document.cookie fallback')
                  const fallback = document.cookie
                  if (fallback) {
                    const { validateLoginStatus, persistCookie } = await import('../services/cookie-manager')
                    const { user, isValid } = await validateLoginStatus(fallback)
                    if (isValid) {
                      persistCookie(fallback, true)
                      setGlobalCookie(fallback)
                      setLoginInfoForStore(fallback, user?.name ?? '', user?.face ?? '')
                    } else {
                      console.error('[QR login] fallback cookie validation failed')
                    }
                  } else {
                    console.error('[QR login] document.cookie is also empty — login may have failed silently')
                  }
                }
                break
              case 'expired':
                setStatus('expired')
                if (pollTimerRef.current) clearInterval(pollTimerRef.current)
                break
              default:
                // Still waiting — no UI change needed
                break
            }
          } catch (err) {
            console.error('QR poll error:', err)
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
  }, [setLoginInfoForStore, qrVersion, theme])

  const handleRefresh = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    setQrDataUrl('')
    setError('')
    qrcodeKeyRef.current = ''
    setQrVersion((v) => v + 1)
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

      <p
        className="mt-3t text-center"
        style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', padding: '0 1rem' }}
      >
        扫码后 Cookie 将保存在本地浏览器中，刷新页面可保持登录状态
      </p>
    </div>
  )
}

export default QrLoginTab
