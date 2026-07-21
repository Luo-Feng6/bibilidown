import { Minus, Square, X } from '@phosphor-icons/react'

/**
 * TitleBar — Custom window title bar (replaces native OS chrome).
 * Provides drag region, app icon, minimize/maximize/close buttons.
 * Windows 11 style: rounded hover backgrounds on window controls.
 */
export default function TitleBar() {
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
        <div
          className="flex items-center justify-center rounded-sm"
          style={{
            width: '18px',
            height: '18px',
            backgroundColor: 'var(--brand-pink)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          B
        </div>
        <span
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-primary)',
          }}
        >
          BilibiliDown
        </span>
      </div>

      {/* Right: Window controls */}
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
        ...(isClose
          ? {
              ':hover': {
                backgroundColor: 'var(--color-error)',
                color: '#fff',
              } as React.CSSProperties,
            }
          : {}),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isClose
          ? 'var(--color-error)'
          : 'rgba(255,255,255,0.06)'
        if (isClose) e.currentTarget.style.color = '#fff'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = ''
      }}
    >
      {label}
    </button>
  )
}
