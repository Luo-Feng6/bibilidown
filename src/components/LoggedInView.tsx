import { CheckCircle, User, SignOut } from '@phosphor-icons/react'

function LoggedInView({
  name,
  face,
  onLogout,
}: {
  name: string
  face: string
  onLogout: () => void
}) {
  return (
    <div className="flex flex-col items-center pt-6t">
      <CheckCircle size={40} weight="fill" style={{ color: 'var(--color-success)' }} />
      <p
        className="mt-3t font-medium"
        style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)' }}
      >
        已登录
      </p>

      <div className="flex items-center gap-3t mt-4t">
        {face ? (
          <img
            src={face}
            alt={name}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid var(--color-accent)',
              objectFit: 'cover',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-overlay)',
              border: '2px solid var(--border-subtle)',
            }}
          >
            <User size={24} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 500 }}>
          {name}
        </span>
      </div>

      <button
        onClick={onLogout}
        className="flex items-center gap-2t mt-6t px-4t transition-colors duration-fast"
        style={{
          height: '36px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--surface-default)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-error)'
          e.currentTarget.style.color = 'var(--color-error)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        <SignOut size={16} weight="regular" />
        退出登录
      </button>
    </div>
  )
}

export default LoggedInView
