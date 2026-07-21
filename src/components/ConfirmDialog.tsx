import { useEffect } from 'react'
import { Warning, Info } from '@phosphor-icons/react'

export interface ConfirmDialogProps {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  variant?: 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * ConfirmDialog — modal confirmation dialog.
 *
 * Uses CSS variables for theme support (works in both light and dark mode).
 * Supports:
 *   - title, message, custom button text
 *   - warning (red confirm) or info (accent confirm) variant
 *   - showCancel=false renders as an alert (confirm-only)
 *   - Escape key dismisses (calls onCancel)
 */
export default function ConfirmDialog({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  showCancel = true,
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const isWarning = variant === 'warning'
  const Icon = isWarning ? Warning : Info
  const iconColor = isWarning ? 'var(--color-warning)' : 'var(--color-accent)'
  const iconBg = isWarning ? 'var(--color-warning-bg)' : 'var(--color-accent-muted)'
  const confirmBg = isWarning ? 'var(--color-error)' : 'var(--color-accent)'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        animation: 'dialog-fade-in 150ms var(--ease-out) both',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="flex flex-col"
        style={{
          maxWidth: '400px',
          width: '90%',
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: '24px',
          animation: 'dialog-scale-in 200ms var(--ease-spring) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Icon + Title + Message */}
        <div className="flex items-start gap-3t mb-4t">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: iconBg,
            }}
          >
            <Icon size={20} weight="fill" style={{ color: iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <p style={{
                fontSize: 'var(--text-body)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                lineHeight: 'var(--text-body-lh)',
              }}>
                {title}
              </p>
            )}
            <p style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 'var(--text-body-sm-lh, 1.5)',
              marginTop: title ? '4px' : 0,
            }}>
              {message}
            </p>
          </div>
        </div>

        {/* Footer: Buttons */}
        <div className="flex items-center justify-end gap-3t mt-2t">
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-4t py-2t rounded-md transition-all duration-fast"
              style={{
                fontSize: 'var(--text-body-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
                e.currentTarget.style.borderColor = 'var(--border-strong)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border-default)'
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-4t py-2t rounded-md transition-all duration-fast font-medium"
            style={{
              fontSize: 'var(--text-body-sm)',
              fontWeight: 600,
              color: 'var(--color-accent-text, #fff)',
              backgroundColor: confirmBg,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.85'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  )
}
