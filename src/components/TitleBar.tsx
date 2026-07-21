import { Minus, Square, X } from '@phosphor-icons/react'
import { isElectron } from '../utils/env'

/**
 * TitleBar — Custom window title bar (replaces native OS chrome).
 * Provides drag region, app icon, minimize/maximize/close buttons.
 * Windows 11 style: rounded hover backgrounds on window controls.
 *
 * 浏览器模式：仅显示图标 + 标题，不显示窗口控制按钮。
 * Electron 模式：显示完整标题栏含窗口控制（最小化/最大化/关闭）。
 */
export default function TitleBar() {
  const inElectron = isElectron()
  return (
    <header
      className="titlebar-drag flex items-center justify-between flex-shrink-0 select-none"
      style={{
        height: '32px',
        backgroundColor: 'var(--mica-bg)',
        paddingLeft: 'var(--space-4)',
      }}
    >
      {/* Left: App icon + name */}
      <div className="flex items-center gap-2t">
        <img src="/favicon.svg" alt="" style={{ width: '18px', height: '18px' }} />
        <span
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-primary)',
          }}
        >
          BibiliDown
        </span>
      </div>

      {/* Right: Window controls (Electron only) */}
      {inElectron && (
        <div
          className="titlebar-no-drag flex items-center h-full"
          style={{ color: 'var(--text-secondary)' }}
        >
          <WindowControl
            label={<Minus size={12} weight="regular" />}
            action="minimize"
          />
          <WindowControl
            label={<Square size={10} weight="regular" />}
            action="maximize"
          />
          <WindowControl
            label={<X size={12} weight="regular" />}
            action="close"
            isClose
          />
        </div>
      )}
      {/* Browser mode spacer: keep right padding balanced */}
      {!inElectron && <div style={{ width: '16px' }} />}
    </header>
  )
}

function WindowControl({
  label,
  isClose,
  action,
}: {
  label: React.ReactNode
  isClose?: boolean
  action: 'minimize' | 'maximize' | 'close'
}) {
  const handleClick = () => {
    const api = window.electronAPI
    if (!api) return // Browser dev mode — no-op
    if (action === 'minimize') api.minimize()
    else if (action === 'maximize') api.maximize()
    else api.close()
  }

  return (
    <button
      onClick={handleClick}
      className="titlebar-no-drag flex items-center justify-center transition-colors duration-fast"
      style={{
        width: '46px',
        height: '32px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isClose
          ? 'var(--color-error)'
          : 'var(--surface-overlay)'
        if (isClose) e.currentTarget.style.color = 'var(--text-inverse)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      {label}
    </button>
  )
}
