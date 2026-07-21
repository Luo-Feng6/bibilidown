import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Link, X, Warning } from '@phosphor-icons/react'
import { parseBilibiliUrl, identifyInput } from '../services/bilibili-api'
import { useParseStore } from '../stores/parseStore'
import { useToastStore } from '../stores/toastStore'

/**
 * InputBar — Permanent top input area for pasting Bilibili links.
 * Supports: paste, Enter to parse, clear button, loading state, error display.
 *
 * Data flow:
 *   user input → parseBilibiliUrl() → parseStore.setVideos() → App re-renders VideoCards
 */
export default function InputBar() {
  const [value, setValue] = useState('')
  const [clipboardHint, setClipboardHint] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastCheckRef = useRef<number>(0)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasCheckedOnceRef = useRef<boolean>(false)

  const { status, error, lastUrl, setUrl, setParsing, setVideos, setError, reset: resetParse } =
    useParseStore()

  const isParsing = status === 'parsing'

  // Clipboard auto-detection on focus/visibility change
  useEffect(() => {
    const checkClipboard = async () => {
      // Don't show if input already has content
      if (value.trim()) return
      // Debounce: allow first check, then 30s between checks
      const now = Date.now()
      if (hasCheckedOnceRef.current && now - lastCheckRef.current < 30_000) return

      try {
        const text = await navigator.clipboard.readText()
        if (!text || !text.trim()) return
        const idInfo = identifyInput(text)
        if (idInfo) {
          hasCheckedOnceRef.current = true
          lastCheckRef.current = now
          setClipboardHint(text)
          // Auto-dismiss after 5 seconds
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
          dismissTimerRef.current = setTimeout(() => {
            setClipboardHint(null)
          }, 5000)
        }
      } catch {
        // Clipboard access denied or empty — silently ignore
      }
    }

    const onFocus = () => { checkClipboard() }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkClipboard()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [value])

  const handleParse = async () => {
    const trimmed = value.trim()
    if (!trimmed || isParsing) return

    // 同上一个链接，直接刷新
    if (trimmed === lastUrl && status === 'success') return

    setUrl(trimmed)
    setParsing()

    try {
      const videos = await parseBilibiliUrl(trimmed)
      if (videos.length === 0) {
        setError('未解析到任何视频，请检查链接是否正确')
      } else {
        setVideos(videos)
        useToastStore.getState().success(
          videos.length === 1
            ? `解析成功: ${videos[0].title}`
            : `解析成功: ${videos.length} 个视频`
        )
      }
    } catch (err: any) {
      setError(err.message || '解析失败，请稍后重试')
      useToastStore.getState().error(err.message || '解析失败')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleParse()
  }

  const handleClear = () => {
    setValue('')
    // 也清除之前的解析结果
    if (status === 'success' || status === 'error') {
      resetParse()
    }
  }

  return (
    <div className="flex flex-col gap-3t">
      <div className="flex gap-3t">
        {/* Input container */}
        <div
          className="relative flex-1 flex items-center transition-all duration-normal"
          style={{
            height: 'var(--input-height)',
            borderRadius: 'var(--input-radius)',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            boxShadow:
              status === 'error'
                ? '0 0 0 2px var(--color-error)'
                : document.activeElement === inputRef.current
                  ? 'var(--input-ring-focus)'
                  : 'none',
            borderColor:
              status === 'error'
                ? 'var(--color-error)'
                : undefined,
          }}
        >
          {/* Clipboard hint chip */}
          {clipboardHint && (
            <button
              onClick={() => {
                setValue(clipboardHint)
                setClipboardHint(null)
                if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
              }}
              className="hover:underline whitespace-nowrap"
              style={{
                position: 'absolute',
                top: '-36px',
                left: '0',
                backgroundColor: 'var(--surface-default)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--color-accent)',
              }}
              title="点击粘贴到输入框"
            >
              {'\u{1F4CB} 检测到剪贴板中的B站链接，点击粘贴'}
            </button>
          )}

          {/* Leading icon */}
          <span
            className="flex-shrink-0 select-none flex items-center justify-center"
            style={{
              width: '44px',
              height: '100%',
              fontSize: 'var(--icon-size-sm)',
              color: status === 'error' ? 'var(--color-error)' : 'var(--text-tertiary)',
            }}
          >
            {status === 'error' ? (
              <Warning size={16} weight="regular" />
            ) : (
              <Link size={16} weight="regular" />
            )}
          </span>

          {/* Input field */}
          <input
            id="bilibili-url-input"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              // 输入时清除错误状态
              if (status === 'error') resetParse()
            }}
            onKeyDown={handleKeyDown}
            placeholder="粘贴 B 站链接或 BV/av/ep/ss/md 号..."
            className="flex-1 bg-transparent border-none outline-none"
            style={{
              fontSize: 'var(--text-body)',
              color: 'var(--input-text)',
              fontFamily: 'var(--font-body)',
            }}
            disabled={isParsing}
            onFocus={(e) => {
              if (status !== 'error') {
                e.currentTarget.parentElement!.style.borderColor = 'var(--input-border-focus)'
                e.currentTarget.parentElement!.style.boxShadow = 'var(--input-ring-focus)'
              }
            }}
            onBlur={(e) => {
              if (status !== 'error') {
                e.currentTarget.parentElement!.style.borderColor = 'var(--input-border)'
                e.currentTarget.parentElement!.style.boxShadow = 'none'
              }
            }}
          />

          {/* Clear button */}
          {value && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 flex items-center justify-center rounded-sm transition-colors duration-fast"
              style={{
                width: '28px',
                height: '28px',
                fontSize: '14px',
                color: 'var(--text-tertiary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <X size={14} weight="regular" />
            </button>
          )}
        </div>

        {/* Parse button */}
        <button
          onClick={handleParse}
          disabled={!value.trim() || isParsing}
          className="flex-shrink-0 flex items-center justify-center font-medium transition-all duration-fast"
          style={{
            height: 'var(--btn-height)',
            paddingLeft: 'var(--btn-padding-x)',
            paddingRight: 'var(--btn-padding-x)',
            borderRadius: 'var(--btn-radius)',
            fontSize: 'var(--text-body)',
            backgroundColor: value.trim()
              ? 'var(--btn-primary-bg)'
              : 'var(--surface-overlay)',
            color: value.trim()
              ? 'var(--btn-primary-text)'
              : 'var(--text-disabled)',
            cursor: value.trim() && !isParsing ? 'pointer' : 'not-allowed',
            minWidth: '80px',
          }}
          onMouseEnter={(e) => {
            if (value.trim() && !isParsing) {
              e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (value.trim() && !isParsing) {
              e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)'
            }
          }}
          onMouseDown={(e) => {
            if (value.trim() && !isParsing) {
              e.currentTarget.style.transform = 'scale(0.98)'
            }
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {isParsing ? (
            <span
              className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
              style={{
                borderColor: 'var(--surface-overlay)',
                borderTopColor: 'var(--text-inverse)',
              }}
            />
          ) : (
            '解析'
          )}
        </button>
      </div>

      {/* Error message */}
      {status === 'error' && error && (
        <div
          className="flex items-center gap-2t px-3t py-2t rounded-lg"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            fontSize: 'var(--text-body-sm)',
            color: 'var(--color-error)',
          }}
        >
          <Warning size={14} weight="fill" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
