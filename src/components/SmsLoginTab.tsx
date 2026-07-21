import { useState, useEffect } from 'react'
import { Warning } from '@phosphor-icons/react'
import { sendSmsCode, loginWithSms } from '../services/login-service'
import InputField from './InputField'

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
        id="sms-phone"
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
            id="sms-code-input"
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
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
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

export default SmsLoginTab
