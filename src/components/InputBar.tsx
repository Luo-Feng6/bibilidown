import { useState, useRef, type KeyboardEvent } from 'react'
import { Link, X, Warning } from '@phosphor-icons/react'
import { parseBilibiliUrl } from '../services/bilibili-api'
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
  const inputRef = useRef<HTMLInputElement>(null)

  const { status, error, lastUrl, setUrl, setParsing, setVideos, setError, reset: resetParse } =
    useParseStore()

  const isParsing = status === 'parsing'

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
                ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                : document.activeElement === inputRef.current
                  ? 'var(--input-ring-focus)'
                  : 'none',
            borderColor:
              status === 'error'
                ? 'rgba(239, 68, 68, 0.5)'
                : undefined,
          }}
        >
          {/* Leading icon */}
          <span
            className="flex-shrink-0 select-none"
            style={{
              width: '40px',
              textAlign: 'center',
              fontSize: 'var(--icon-size-sm)',
              color: status === 'error' ? 'var(--color-error, #EF4444)' : 'var(--text-tertiary)',
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
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)'
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
              : 'var(--gray-200)',
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
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            fontSize: 'var(--text-body-sm)',
            color: 'var(--color-error, #EF4444)',
          }}
        >
          <Warning size={14} weight="fill" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
