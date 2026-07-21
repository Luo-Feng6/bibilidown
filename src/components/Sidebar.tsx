import { DownloadSimple, GearSix, ClockCounterClockwise, Info } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useNavigationStore, type AppView } from '../stores/navigationStore'

const NAV_ITEMS: { id: AppView; icon: ReactNode; label: string }[] = [
  { id: 'download', icon: <DownloadSimple size={20} weight="regular" />, label: '下载主页' },
  { id: 'settings', icon: <GearSix size={20} weight="regular" />, label: '设置' },
  { id: 'history', icon: <ClockCounterClockwise size={20} weight="regular" />, label: '历史记录' },
]

const BOTTOM_ITEMS: { id: AppView; icon: ReactNode; label: string }[] = [
  { id: 'about', icon: <Info size={20} weight="regular" />, label: '关于' },
]

/**
 * Sidebar — 56px wide navigation rail.
 * Windows 11 style: icon-only with accent-colored active indicator.
 */
export default function Sidebar() {
  const { currentView, navigate } = useNavigationStore()

  return (
    <nav
      className="flex flex-col flex-shrink-0"
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--mica-bg)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top navigation items */}
      <div className="flex-1 flex flex-col items-center pt-4t gap-1t">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            active={currentView === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col items-center pb-4t gap-1t">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            active={currentView === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}
      </div>
    </nav>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center transition-colors duration-fast rounded-lg"
      style={{
        width: '40px',
        height: '40px',
        fontSize: 'var(--icon-size-md)',
        color: active ? 'var(--color-accent)' : 'var(--text-tertiary)',
        backgroundColor: active ? 'var(--color-accent-muted)' : 'transparent',
      }}
      title={label}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.backgroundColor = 'var(--surface-overlay)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = ''
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      {/* Active indicator — 3px left accent bar */}
      {active && (
        <span
          className="absolute left-0 rounded-r-xs"
          style={{
            top: '8px',
            bottom: '8px',
            width: '3px',
            backgroundColor: 'var(--color-accent)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      {icon}
    </button>
  )
}
