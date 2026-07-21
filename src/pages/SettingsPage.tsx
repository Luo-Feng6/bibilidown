import { GearSix, Power } from '@phosphor-icons/react'
import { useUserPrefsStore } from '../stores/userPrefsStore'

/**
 * SettingsPage — Application preferences.
 *
 * Sections:
 * - Theme (light/dark toggle)
 * - Download defaults (path, quality, format)
 * - Concurrency & auto-start
 */
export default function SettingsPage() {
  const prefs = useUserPrefsStore()
  const setTheme = useUserPrefsStore((s) => s.setTheme)

  return (
    <div className="flex-1 overflow-y-auto px-8t py-6t">
      {/* Page header */}
      <div className="flex items-center gap-3t mb-6t">
        <GearSix size={24} weight="regular" style={{ color: 'var(--color-accent)' }} />
        <h1
          className="font-display"
          style={{
            fontSize: 'var(--text-heading)',
            lineHeight: 'var(--text-heading-lh)',
            color: 'var(--text-primary)',
          }}
        >
          设置
        </h1>
      </div>

      {/* ── Theme Section ── */}
      <Section title="外观">
        <SettingRow label="主题模式" hint="暗色更适合夜间使用">
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}
          >
            <ThemeButton
              label="暗色"
              active={prefs.theme === 'dark'}
              onClick={() => setTheme('dark')}
            />
            <ThemeButton
              label="亮色"
              active={prefs.theme === 'light'}
              onClick={() => setTheme('light')}
            />
          </div>
        </SettingRow>
      </Section>

      {/* ── Download Section ── */}
      <Section title="下载">
        <SettingRow label="默认清晰度" hint="解析视频时自动选中此清晰度">
          <select
            value={prefs.preferredQuality}
            onChange={(e) => prefs.setPreferredQuality(e.target.value)}
            style={{
              height: 'var(--btn-height)',
              padding: '0 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-default)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-body)',
              cursor: 'pointer',
            }}
          >
            {['4K', '1080P60', '1080P', '720P', '480P', '仅音频'].map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="默认格式" hint="mp4 兼容性最好">
          <select
            value={prefs.preferredFormat}
            onChange={(e) => prefs.setPreferredFormat(e.target.value)}
            style={{
              height: 'var(--btn-height)',
              padding: '0 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-default)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-body)',
              cursor: 'pointer',
            }}
          >
            {['mp4', 'flv', 'm4s'].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="下载路径" hint={prefs.downloadPath || '未设置（默认下载文件夹）'}>
          <button
            onClick={async () => {
              const api = window.electronAPI
              if (api) {
                const dir = await api.selectDirectory()
                if (dir) prefs.setDownloadPath(dir)
              }
            }}
            className="px-4t py-2t rounded-md transition-colors duration-fast"
            style={{
              fontSize: 'var(--text-body-sm)',
              backgroundColor: 'var(--surface-overlay)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {prefs.downloadPath ? prefs.downloadPath.split('\\').pop() : '选择文件夹…'}
          </button>
        </SettingRow>
      </Section>

      {/* ── Performance Section ── */}
      <Section title="性能">
        <SettingRow label="同时下载" hint="同时进行的下载任务数 (1–8)">
          <div className="flex items-center gap-2t">
            <input
              type="range"
              min={1}
              max={8}
              value={prefs.maxConcurrent}
              onChange={(e) => prefs.setMaxConcurrent(Number(e.target.value))}
              style={{ width: '100px', accentColor: 'var(--color-accent)' }}
            />
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', minWidth: '16px' }}
            >
              {prefs.maxConcurrent}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="自动开始下载" hint="加入队列后立即开始下载">
          <Toggle
            checked={prefs.autoStart}
            onChange={() => prefs.setAutoStart(!prefs.autoStart)}
          />
        </SettingRow>
      </Section>

      {/* ── About Section ── */}
      <Section title="关于">
        <div
          style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--text-secondary)',
            lineHeight: 'var(--text-body-sm-lh)',
          }}
        >
          <p>BilibiliDown v7.0.0</p>
          <p className="mt-1t" style={{ color: 'var(--text-tertiary)' }}>
            Electron + React + TypeScript + Tailwind CSS
          </p>
          <p className="mt-2t" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)' }}>
            关闭窗口后，应用会最小化到系统托盘继续运行。
          </p>
        </div>
        <div className="px-4t py-3t" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => {
              const api = window.electronAPI
              if (api) {
                api.quitApp()
              }
            }}
            className="flex items-center gap-2t px-3t py-2t rounded-md transition-colors duration-fast"
            style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--color-error)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Power size={16} weight="regular" />
            退出应用
          </button>
        </div>
      </Section>
    </div>
  )
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6t">
      <h2
        className="font-medium mb-3t"
        style={{
          fontSize: 'var(--text-body)',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-default)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between px-4t py-3t"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex-1 mr-4t">
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>
          {label}
        </span>
        {hint && (
          <span
            className="block mt-0.5"
            style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}
          >
            {hint}
          </span>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function ThemeButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="px-4t py-2t transition-colors duration-fast"
      style={{
        fontSize: 'var(--text-body-sm)',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: active ? 'var(--color-accent)' : 'transparent',
        color: active ? 'var(--color-accent-text)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative inline-flex items-center transition-colors duration-fast"
      style={{
        width: '40px',
        height: '22px',
        borderRadius: 'var(--radius-full)',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: checked ? 'var(--color-accent)' : 'var(--gray-600)',
        padding: 0,
      }}
    >
      <span
        className="inline-block rounded-full bg-white transition-transform duration-fast"
        style={{
          width: '16px',
          height: '16px',
          transform: checked ? 'translateX(19px)' : 'translateX(3px)',
        }}
      />
    </button>
  )
}
