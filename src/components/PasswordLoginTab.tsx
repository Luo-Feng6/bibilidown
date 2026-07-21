import { useState, useEffect, useRef } from 'react'
import { Warning } from '@phosphor-icons/react'
import { loginWithPassword, getCaptchaData } from '../services/login-service'
import InputField from './InputField'

function PasswordLoginTab({
  onSuccess,
}: {
  onSuccess: (cookie: string, name: string, face: string) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // GeeTest captcha state
  const [captchaVisible, setCaptchaVisible] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const loginParamsRef = useRef<{ username: string; encryptedPwd: string } | null>(null)
  const captchaObjRef = useRef<any>(null)
  const captchaContainerIdRef = useRef(
    `geetest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  )

  // Cleanup captcha instance on unmount
  useEffect(() => {
    return () => {
      if (captchaObjRef.current) {
        try {
          captchaObjRef.current.destroy?.()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

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
    } else if (result.captchaRequired && result.loginParams) {
      // B 站要求验证码 — 保存登录参数并启动 GeeTest
      loginParamsRef.current = result.loginParams
      startCaptcha()
    } else {
      setError(result.error || '登录失败')
    }
  }

  /** Dynamically load the GeeTest JS SDK from CDN. */
  function loadGeetestScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.initGeetest) {
        resolve()
        return
      }
      // A previous call may have inserted the script tag but it hasn't fired yet
      const existing = document.querySelector('script[src*="gt.0.4.9.js"]')
      if (existing) {
        let attempts = 0
        const poll = setInterval(() => {
          if (window.initGeetest) {
            clearInterval(poll)
            resolve()
          } else if (++attempts > 80) {
            clearInterval(poll)
            reject(new Error('验证码脚本加载超时'))
          }
        }, 200)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://static.geetest.com/static/js/gt.0.4.9.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('验证码脚本加载失败'))
      document.head.appendChild(script)
    })
  }

  /** Start the GeeTest captcha flow — load SDK, fetch params, render widget. */
  async function startCaptcha() {
    const lp = loginParamsRef.current
    if (!lp) return

    setCaptchaVisible(true)
    setCaptchaLoading(true)
    setError('')

    try {
      // Load SDK and fetch B 站 captcha params in parallel
      const [captchaData] = await Promise.all([getCaptchaData(), loadGeetestScript()])

      if (!window.initGeetest) {
        throw new Error('验证码脚本未就绪')
      }

      const containerId = captchaContainerIdRef.current
      const uname = lp.username
      const encPwd = lp.encryptedPwd

      window.initGeetest(
        {
          gt: captchaData.gt,
          challenge: captchaData.challenge,
          new_captcha: captchaData.success === 1,
          product: 'popup',
          offline: false,
          width: '100%',
        },
        (captchaObj: any) => {
          captchaObjRef.current = captchaObj

          captchaObj.onReady(() => {
            setCaptchaLoading(false)
          })

          captchaObj.onSuccess(() => {
            const v = captchaObj.getValidate()
            // B 站 expects geetest_challenge / geetest_validate / geetest_seccode
            handleCaptchaRetry(
              uname,
              encPwd,
              v?.geetest_challenge ?? v?.challenge ?? '',
              v?.geetest_validate ?? v?.validate ?? '',
              v?.geetest_seccode ?? v?.seccode ?? ''
            )
          })

          captchaObj.onError(() => {
            setCaptchaLoading(false)
            setCaptchaVisible(false)
            setError('验证码加载失败，请使用二维码登录')
          })

          captchaObj.onClose(() => {
            setCaptchaVisible(false)
            setError('已取消验证码，请使用二维码登录')
          })

          captchaObj.appendTo(`#${containerId}`)
        }
      )
    } catch (err: any) {
      setCaptchaLoading(false)
      setCaptchaVisible(false)
      setError('验证码加载失败，请使用二维码登录')
    }
  }

  /** Retry password login with GeeTest captcha tokens. */
  async function handleCaptchaRetry(
    uname: string,
    encPwd: string,
    challenge: string,
    validate: string,
    seccode: string
  ) {
    setLoading(true)
    setCaptchaVisible(false)

    if (captchaObjRef.current) {
      try {
        captchaObjRef.current.destroy?.()
      } catch {
        /* ignore */
      }
      captchaObjRef.current = null
    }

    const result = await loginWithPassword(
      uname,
      '',
      { challenge, validate, seccode },
      encPwd
    )
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
        id="password-username"
        label="手机号 / 邮箱"
        type="text"
        placeholder="请输入手机号或邮箱"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value)
          setError('')
        }}
      />
      <InputField
        id="password-password"
        label="密码"
        type="password"
        placeholder="请输入密码"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          setError('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleLogin()
        }}
      />

      {error && (
        <div
          className="flex items-center gap-2t px-3t py-2t rounded-lg"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
          }}
        >
          <Warning size={16} weight="fill" style={{ color: 'var(--color-error)' }} />
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)' }}>
            {error}
          </span>
        </div>
      )}

      {/* GeeTest captcha area — shown inline when captcha is required */}
      {captchaVisible && (
        <div
          className="flex flex-col items-center gap-3t p-4t rounded-xl"
          style={{
            backgroundColor: 'var(--surface-default)',
            border: '1px solid var(--border-default)',
          }}
        >
          {captchaLoading ? (
            <>
              <div
                className="animate-spin rounded-full"
                style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid var(--border-subtle)',
                  borderTopColor: 'var(--color-accent)',
                }}
              />
              <span
                style={{
                  fontSize: 'var(--text-body-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                正在加载验证码...
              </span>
            </>
          ) : (
            <span
              style={{
                fontSize: 'var(--text-body-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              请完成下方验证码
            </span>
          )}

          {/* GeeTest renders into this container */}
          <div
            id={captchaContainerIdRef.current}
            style={{ width: '100%', minHeight: '36px' }}
          />

          <button
            onClick={() => {
              setCaptchaVisible(false)
              if (captchaObjRef.current) {
                try {
                  captchaObjRef.current.destroy?.()
                } catch {
                  /* ignore */
                }
                captchaObjRef.current = null
              }
              setError('已取消验证码，请使用二维码登录')
            }}
            className="transition-colors duration-fast"
            style={{
              height: '28px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-caption)',
              color: 'var(--text-tertiary)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }}
          >
            取消验证码
          </button>
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading || captchaVisible}
        className="w-full flex items-center justify-center font-medium transition-all duration-fast mt-2t"
        style={{
          height: 'var(--btn-height)',
          paddingLeft: 'var(--btn-padding-x)',
          paddingRight: 'var(--btn-padding-x)',
          borderRadius: 'var(--btn-radius)',
          fontSize: 'var(--text-body)',
          backgroundColor:
            loading || captchaVisible
              ? 'var(--btn-primary-disabled, #6b7280)'
              : 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: 'none',
          cursor: loading || captchaVisible ? 'not-allowed' : 'pointer',
          opacity: loading || captchaVisible ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading && !captchaVisible)
            e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'
        }}
        onMouseLeave={(e) => {
          if (!loading && !captchaVisible)
            e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)'
        }}
      >
        {loading ? '登录中...' : captchaVisible ? '请先完成验证码' : '登录'}
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

export default PasswordLoginTab
