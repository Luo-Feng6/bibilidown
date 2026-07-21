import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Warning, ArrowClockwise } from '@phosphor-icons/react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] 组件渲染错误:', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV

      return (
        <div
          className="flex flex-col items-center justify-center h-full w-full"
          style={{ backgroundColor: 'var(--surface-root)' }}
        >
          <div className="flex flex-col items-center gap-6t max-w-md text-center px-6t">
            {/* Error icon */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--color-error-bg)',
              }}
            >
              <Warning
                size={40}
                weight="regular"
                style={{ color: 'var(--color-error)' }}
              />
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 'var(--text-heading)',
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
            >
              出错了
            </h2>

            {/* Error message */}
            <p
              style={{
                fontSize: 'var(--text-body)',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {this.state.error?.message || '应用发生了未知错误'}
            </p>

            {/* Stack trace — dev mode only */}
            {isDev && this.state.error?.stack && (
              <pre
                style={{
                  fontSize: 'var(--text-caption)',
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'var(--surface-default)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  width: '100%',
                }}
              >
                {this.state.error.stack}
              </pre>
            )}

            {/* Reload button */}
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2t px-5t py-2.5t rounded-lg transition-colors duration-fast"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-accent-text)',
                border: 'none',
                fontWeight: 500,
                fontSize: 'var(--text-body-sm)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  'var(--color-accent-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  'var(--color-accent)'
              }}
            >
              <ArrowClockwise size={16} weight="bold" />
              重新加载
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
