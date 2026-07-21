import { useEffect, useState } from 'react'
import { CheckCircle, Warning, XCircle, Info, X } from '@phosphor-icons/react'
import { useToastStore, type ToastType } from '../stores/toastStore'

/* ── Icon & color mapping ── */

const TOAST_CONFIG: Record<
  ToastType,
  { icon: typeof CheckCircle; iconColor: string; bg: string; border: string; progressColor: string }
> = {
  success: {
    icon: CheckCircle,
    iconColor: 'var(--color-success)',
    bg: 'var(--color-success-bg)',
    border: 'var(--color-success)',
    progressColor: 'var(--color-success)',
  },
  error: {
    icon: XCircle,
    iconColor: 'var(--color-error)',
    bg: 'var(--color-error-bg)',
    border: 'var(--color-error)',
    progressColor: 'var(--color-error)',
  },
  warning: {
    icon: Warning,
    iconColor: 'var(--color-warning)',
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning)',
    progressColor: 'var(--color-warning)',
  },
  info: {
    icon: Info,
    iconColor: 'var(--color-accent)',
    bg: 'var(--color-accent-muted)',
    border: 'rgba(var(--color-accent-rgb), 0.25)',
    progressColor: 'var(--color-accent)',
  },
}

/**
 * Toast notification component.
 * Renders a stack of toasts from toastStore.
 * Each toast has an icon, message, progress bar, and close button.
 */
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2t pointer-events-none"
      style={{ maxWidth: '380px' }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: ReturnType<typeof useToastStore.getState>['toasts'][number] }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const config = TOAST_CONFIG[toast.type]
  const Icon = config.icon
  const [progress, setProgress] = useState(100)
  const [exiting, setExiting] = useState(false)

  // Progress bar animation
  useEffect(() => {
    if (toast.duration <= 0) return

    const startTime = Date.now()
    const totalMs = toast.duration

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / totalMs) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 50)

    return () => clearInterval(timer)
  }, [toast.duration])

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => removeToast(toast.id), 200)
  }

  return (
    <div
      className="pointer-events-auto flex items-start gap-3t p-3t shadow-lg backdrop-blur-md transition-all duration-fast"
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(12px)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(120%)' : 'translateX(0)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Icon */}
      <Icon size={20} weight="fill" style={{ color: config.iconColor, flexShrink: 0, marginTop: 1 }} />

      {/* Message */}
      <p
        className="flex-1 leading-snug"
        style={{
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text-primary)',
          lineHeight: 'var(--text-body-sm-lh, 1.5)',
        }}
      >
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
        style={{
          width: '22px',
          height: '22px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          marginTop: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-tertiary)'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <X size={14} weight="bold" />
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-[2px]"
          style={{
            width: `${progress}%`,
            backgroundColor: config.progressColor,
            transition: 'width 50ms linear',
            opacity: 0.6,
          }}
        />
      )}
    </div>
  )
}
