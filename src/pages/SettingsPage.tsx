import { useState, useRef, useEffect } from 'react'
import { GearSix, Power, ArrowCounterClockwise, CaretDown } from '@phosphor-icons/react'
import { useUserPrefsStore } from '../stores/userPrefsStore'
import { usePresetStore } from '../stores/presetStore'
import { useShallow } from 'zustand/shallow'
import { showConfirm } from '../services/dialog-service'

/* ── 平台检测 ── */

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI
}

/* ── 仅桌面版徽标 ── */

function DesktopOnlyBadge() {
  if (isElectron()) return null
  return (
    <span style={{
      fontSize: '9px',
      padding: '1px 5px',
      borderRadius: 'var(--radius-full)',
      backgroundColor: 'var(--color-accent-muted)',
      color: 'var(--color-accent)',
      fontWeight: 600,
      marginLeft: '6px',
    }}>
      仅桌面版
    </span>
  )
}

/** 统一风格的下拉框 — 暗色主题原生 select 美化 */
function SettingsSelect({
  value,
  onChange,
  options,
  style,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  // click outside → close
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', zIndex: open ? 100 : 'auto', ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          height: '34px',
          padding: '0 10px 0 12px',
          borderRadius: open ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
          border: `1px solid ${open ? 'var(--color-accent)' : 'var(--border-default)'}`,
          backgroundColor: open ? '#1a1a2e' : 'var(--surface-default)',
          color: open ? '#e0e0e0' : 'var(--text-primary)',
          fontSize: 'var(--text-body-sm)',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '140px',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s, background 0.15s, border-radius 0s',
          boxShadow: open ? '0 0 0 3px var(--color-accent-muted)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.borderColor = 'var(--border-strong)'
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.borderColor = 'var(--border-default)'
        }}
      >
        <span>{selectedLabel}</span>
        <CaretDown
          size={12}
          weight="bold"
          style={{
            color: 'var(--text-tertiary)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            padding: '4px',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            border: '1px solid var(--color-accent)',
            borderTop: 'none',
            backgroundColor: '#1a1a2e',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isSelected ? 'var(--color-accent-muted)' : 'transparent',
                  color: isSelected ? 'var(--color-accent)' : '#e0e0e0',
                  fontSize: 'var(--text-body-sm)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span style={{ fontSize: '10px', opacity: 0.6 }}>●</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ACCENT_COLORS = [
  { key: 'blue', label: '蓝', color: '#3B82F6' },
  { key: 'pink', label: '粉', color: '#FB7299' },
  { key: 'cyan', label: '青', color: '#06B6D4' },
  { key: 'purple', label: '紫', color: '#8B5CF6' },
  { key: 'amber', label: '金', color: '#F59E0B' },
] as const

const QUALITY_OPTIONS = ['4K', '1080P60', '1080P', '720P', '480P']
const FILENAME_HINT: Record<string, string> = {
  '{title}': '标题',
  '{bvid}': 'BV号',
  '{quality}': '清晰度',
  '{up}': 'UP主',
  '{date}': '日期',
  '{time}': '时间',
  '{format}': '格式',
  '{mode}': '模式',
}

export default function SettingsPage() {
  const prefs = useUserPrefsStore(
    useShallow((s) => ({
      theme: s.theme,
      downloadPath: s.downloadPath,
      preferredQuality: s.preferredQuality,
      preferredFormat: s.preferredFormat,
      preferredAudioFormat: s.preferredAudioFormat,
      autoStart: s.autoStart,
      maxConcurrent: s.maxConcurrent,
      downloadNotify: s.downloadNotify,
      openFolderAfterDownload: s.openFolderAfterDownload,
      maxRetries: s.maxRetries,
      downloadDanmaku: s.downloadDanmaku,
      downloadSubtitle: s.downloadSubtitle,
      filenameTemplate: s.filenameTemplate,
      minimizeToTray: s.minimizeToTray,
      accentColor: s.accentColor,
      setPreferredQuality: s.setPreferredQuality,
      setPreferredFormat: s.setPreferredFormat,
      setPreferredAudioFormat: s.setPreferredAudioFormat,
      setDownloadPath: s.setDownloadPath,
      setMaxConcurrent: s.setMaxConcurrent,
      setAutoStart: s.setAutoStart,
      setDownloadNotify: s.setDownloadNotify,
      setOpenFolderAfterDownload: s.setOpenFolderAfterDownload,
      setMaxRetries: s.setMaxRetries,
      setDownloadDanmaku: s.setDownloadDanmaku,
      setDownloadSubtitle: s.setDownloadSubtitle,
      setFilenameTemplate: s.setFilenameTemplate,
      setMinimizeToTray: s.setMinimizeToTray,
      setAccentColor: s.setAccentColor,
      downloadModeStyle: s.downloadModeStyle,
      setDownloadModeStyle: s.setDownloadModeStyle,
      showCoverImage: s.showCoverImage,
      setShowCoverImage: s.setShowCoverImage,
    }))
  )
  const setTheme = useUserPrefsStore((s) => s.setTheme)

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: '重置所有设置',
      message: '确定重置所有设置？下载记录不会删除。',
    })
    if (!confirmed) return
    const s = useUserPrefsStore.getState()
    s.setTheme('dark')
    s.setAccentColor('blue')
    s.setPreferredQuality('1080P60')
    s.setPreferredFormat('mp4')
    s.setAutoStart(true)
    s.setMaxConcurrent(3)
    s.setDownloadNotify(true)
    s.setOpenFolderAfterDownload(false)
    s.setMaxRetries(3)
    s.setDownloadDanmaku(false)
    s.setDownloadSubtitle(false)
    s.setFilenameTemplate('{title}_{quality}')
    s.setMinimizeToTray(false)
    s.setDownloadModeStyle('popup')
  }

  return (
    <div className="flex-1 overflow-y-auto px-8t py-6t">
      {/* Page header */}
      <div className="flex items-center gap-3t mb-6t">
        <GearSix size={24} weight="regular" style={{ color: 'var(--color-accent)' }} />
        <h1 className="font-display" style={{ fontSize: 'var(--text-heading)', lineHeight: 'var(--text-heading-lh)', color: 'var(--text-primary)' }}>
          设置
        </h1>
      </div>

      {/* ── 下载方案（Preset） ── */}
      <PresetSection />

      {/* ── 外观 ── */}
      <Section title="外观">
        <SettingRow label="主题模式" hint="暗色更适合夜间使用">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
            <ThemeButton label="暗色" active={prefs.theme === 'dark'} onClick={() => setTheme('dark')} />
            <ThemeButton label="亮色" active={prefs.theme === 'light'} onClick={() => setTheme('light')} />
          </div>
        </SettingRow>

        <SettingRow label="主题色" hint="按钮、选中态的主色调">
          <div className="flex items-center gap-2t">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => prefs.setAccentColor(c.key)}
                title={c.label}
                className="rounded-full transition-all duration-fast"
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: c.color,
                  border: '2px solid transparent',
                  outline: prefs.accentColor === c.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                  outlineOffset: '2px',
                  cursor: 'pointer',
                  transform: prefs.accentColor === c.key ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* ── 下载 ── */}
      <Section title="下载">
        <SettingRow label="默认清晰度" hint="解析后默认选中的清晰度">
          <SettingsSelect
            value={prefs.preferredQuality}
            onChange={(v) => prefs.setPreferredQuality(v)}
            options={QUALITY_OPTIONS.map((q) => ({ value: q, label: q }))}
          />
        </SettingRow>

        <SettingRow
          label="视频输出格式"
          hint="MP4（推荐）/ M4S（原始流）"
          info="MP4：即下即播，兼容所有播放器。\nM4S：B站原始 DASH 流，需 FFmpeg 混流后才能播放，保留原始画质。"
        >
          <SettingsSelect
            value={prefs.preferredFormat}
            onChange={(v) => prefs.setPreferredFormat(v)}
            options={[{ value: 'mp4', label: 'MP4（推荐）' }, { value: 'm4s', label: 'M4S（原始流）' }]}
          />
        </SettingRow>

        <SettingRow
          label="音频输出格式"
          hint="M4A（推荐）/ MP3 / M4S（原始流）"
          info="M4A：AAC 原始音质，兼容主流播放器。\nMP3：兼容性最佳，但需 FFmpeg 转码（浏览器端仅改扩展名，非真正 MP3）。\nM4S：原始 DASH 音频流，需混流。"
        >
          <SettingsSelect
            value={prefs.preferredAudioFormat}
            onChange={(v) => prefs.setPreferredAudioFormat(v as 'm4a' | 'm4s' | 'mp3')}
            options={[{ value: 'm4a', label: 'M4A（推荐）' }, { value: 'mp3', label: 'MP3' }, { value: 'm4s', label: 'M4S（原始流）' }]}
          />
        </SettingRow>

        <SettingRow label="下载路径" hint={prefs.downloadPath || '未设置（默认下载文件夹）'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              value={prefs.downloadPath}
              onChange={(e) => prefs.setDownloadPath(e.target.value)}
              placeholder="D:\BibiliDown\downloads"
              style={{ width: '160px', height: '32px', padding: '0 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-default)', color: 'var(--text-primary)', fontSize: 'var(--text-body-sm)', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
            />
            <button
              onClick={async () => {
                if (isElectron()) {
                  const dir = await window.electronAPI!.selectDirectory()
                  if (dir) prefs.setDownloadPath(dir)
                } else if ('showDirectoryPicker' in window) {
                  try {
                    const handle = await (window as any).showDirectoryPicker()
                    prefs.setDownloadPath(handle.name)
                  } catch { /* user cancelled */ }
                }
              }}
              title={isElectron() ? undefined : '浏览器模式下路径仅保存配置，实际下载路径由桌面版使用'}
              style={{ height: '32px', padding: '0 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-default)', color: 'var(--text-secondary)', fontSize: 'var(--text-body-sm)', cursor: 'pointer', whiteSpace: 'nowrap', outline: 'none', transition: 'border-color 150ms, color 150ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              📁 浏览
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="文件名模板"
          hint={Object.entries(FILENAME_HINT).map(([k, v]) => `${k}=${v}`).join('  ')}
          info="自定义下载文件名。可用变量：\n{title} — 视频标题\n{bvid} — BV 号\n{quality} — 清晰度（如 1080P60）\n{up} — UP 主名称\n{date} — 当前日期（YYYY-MM-DD）\n{time} — 当前时间（HHMMSS）\n{format} — 输出格式（MP4 / M4A）\n{mode} — 下载模式（仅视频 / 仅音频）\n\n示例：{up}_{title}_{quality}_{date}"
        >
          <input
            value={prefs.filenameTemplate}
            onChange={(e) => prefs.setFilenameTemplate(e.target.value)}
            placeholder="{title}_{quality}"
            style={{ width: '160px', height: '32px', padding: '0 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-default)', color: 'var(--text-primary)', fontSize: 'var(--text-body-sm)', outline: 'none' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
          />
        </SettingRow>

        <SettingRow
          label="下载模式"
          hint="弹窗模式每次确认 · 内联模式点击按钮即直接下载"
          info="弹窗：点击「加入下载队列」后弹出选择对话框，可取消（点 ✕ 或遮罩），适合想每次确认下载方式的用户。\n\n内联：清晰度下方显示四个下载按钮（📹仅视频 🎵仅音频 📦分别下载 🔗合并），点击即立即加入队列开始下载，不弹窗确认，适合快速操作。\n\n输出格式由下方「视频/音频输出格式」设置控制。"
        >
          <SettingsSelect
            value={prefs.downloadModeStyle}
            onChange={(v) => prefs.setDownloadModeStyle(v as 'popup' | 'inline')}
            options={[{ value: 'popup', label: '弹窗' }, { value: 'inline', label: '内联' }]}
          />
        </SettingRow>
      </Section>

      {/* ── 内容 ── */}
      <Section title="内容">
        <SettingRow
          label="同时下载弹幕"
          hint="随视频下载弹幕 (.xml)"
          info="开启后每次下载视频会自动保存弹幕为 XML 文件。\n也可在首页 VideoCard 的「附带」行点 ⬇ 单独下载弹幕（不下载视频）。"
        >
          <Toggle checked={prefs.downloadDanmaku} onChange={() => prefs.setDownloadDanmaku(!prefs.downloadDanmaku)} />
        </SettingRow>
        <SettingRow
          label="同时下载字幕"
          hint="随视频下载字幕 (.srt)"
          info="开启后每次下载视频会自动保存字幕为 SRT 文件。\n也可在首页 VideoCard 的「附带」行点 ⬇ 单独下载字幕（不下载视频）。"
        >
          <Toggle checked={prefs.downloadSubtitle} onChange={() => prefs.setDownloadSubtitle(!prefs.downloadSubtitle)} />
        </SettingRow>
        <SettingRow
          label="显示视频封面"
          hint="显示视频封面图"
          info="关闭后解析结果只显示标题和视频信息，不加载封面图片。适合列表密集浏览或网络较慢时使用。"
        >
          <Toggle checked={prefs.showCoverImage} onChange={() => prefs.setShowCoverImage(!prefs.showCoverImage)} />
        </SettingRow>
      </Section>

      {/* ── 行为 ── */}
      <Section title="行为">
        <SettingRow label="同时下载" hint="并行下载任务数 (1–8)">
          <SliderValue value={prefs.maxConcurrent} min={1} max={8} onChange={(v) => prefs.setMaxConcurrent(v)} />
        </SettingRow>

        <SettingRow label="最大重试次数" hint="下载失败后自动重试 (1–5)">
          <SliderValue value={prefs.maxRetries} min={1} max={5} onChange={(v) => prefs.setMaxRetries(v)} />
        </SettingRow>

        <SettingRow
          label="自动开始下载"
          hint="加入队列后立即开始下载"
          info="开启：视频加入队列后自动按顺序下载（受「同时下载」并发数限制）。\n关闭：加入队列后需手动点击开始按钮。"
        >
          <Toggle checked={prefs.autoStart} onChange={() => prefs.setAutoStart(!prefs.autoStart)} />
        </SettingRow>

        <SettingRow
          label="下载完成通知"
          hint="下载完成后弹出系统通知"
          info="浏览器模式：使用浏览器 Notification API（首次需授权）。\nElectron 桌面版：使用系统原生通知。"
        >
          <Toggle
            checked={prefs.downloadNotify}
            onChange={() => {
              const next = !prefs.downloadNotify
              // 浏览器模式：开启通知前检查/请求 Web Notification 权限
              if (next && !isElectron() && 'Notification' in window) {
                if (Notification.permission === 'denied') {
                  // 已拒绝 — 提示用户手动在浏览器设置中开启
                  showConfirm({
                    title: '需要通知权限',
                    message: '通知权限已被浏览器拒绝。请在浏览器设置中允许本网站的通知权限后再开启此功能。',
                    confirmText: '知道了',
                    variant: 'info',
                  })
                  return
                }
                if (Notification.permission === 'default') {
                  Notification.requestPermission().then((perm) => {
                    if (perm === 'granted') {
                      prefs.setDownloadNotify(true)
                    }
                    // denied or dismissed — don't enable
                  })
                  return
                }
              }
              prefs.setDownloadNotify(next)
            }}
          />
        </SettingRow>

        <SettingRow
          label={<span>下载后打开文件夹<DesktopOnlyBadge /></span>}
          hint="完成后打开文件夹"
          info="仅 Electron 桌面版可用。下载完成后自动在资源管理器中打开文件所在目录。浏览器模式受安全限制无法打开本地文件夹。"
        >
          <Toggle checked={prefs.openFolderAfterDownload} onChange={() => prefs.setOpenFolderAfterDownload(!prefs.openFolderAfterDownload)} disabled={!isElectron()} />
        </SettingRow>
      </Section>

      <Section title="启动">
        <SettingRow
          label={<span>启动时最小化到托盘<DesktopOnlyBadge /></span>}
          hint="启动时最小化到托盘"
          info="仅 Electron 桌面版可用。应用启动后不弹出窗口，直接最小化到系统托盘图标，安静后台运行。"
        >
          <Toggle checked={prefs.minimizeToTray} onChange={() => prefs.setMinimizeToTray(!prefs.minimizeToTray)} disabled={!isElectron()} />
        </SettingRow>
      </Section>

      {/* ── 高级 ── */}
      <Section title="高级">
        <div className="flex items-center justify-between px-4t py-3t">
          <div>
            <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>重置所有设置</span>
            <span className="block mt-0.5" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
              恢复偏好为默认值（不删除下载记录）
            </span>
          </div>
          <button onClick={handleReset}
            className="flex items-center gap-2t px-3t py-1.5 rounded-md transition-all duration-fast"
            style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.borderColor = 'var(--color-error)'; e.currentTarget.style.background = 'var(--color-error-bg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'transparent' }}
          >
            <ArrowCounterClockwise size={14} /> 重置
          </button>
        </div>

        {window.electronAPI && (
          <div className="flex items-center justify-between px-4t py-3t" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)' }}>退出应用</span>
              <span className="block mt-0.5" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                关闭窗口并退出 BibiliDown
              </span>
            </div>
            <button
              onClick={() => window.electronAPI!.quitApp()}
              className="flex items-center gap-2t px-3t py-1.5 rounded-md transition-all duration-fast"
              style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-error)', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-error)'; e.currentTarget.style.background = 'var(--color-error-bg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Power size={14} /> 退出应用
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}

/* ── Sub-components ── */

/** 下载方案 Section — 顶部独立组件，管理 preset CRUD */
function PresetSection() {
  const presets = usePresetStore((s) => s.presets)
  const activePresetId = usePresetStore((s) => s.activePresetId)
  const saveCurrentAsPreset = usePresetStore((s) => s.saveCurrentAsPreset)
  const deletePreset = usePresetStore((s) => s.deletePreset)
  const applyPreset = usePresetStore((s) => s.applyPreset)
  const renamePreset = usePresetStore((s) => s.renamePreset)
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const activePreset = presets.find((p) => p.id === activePresetId)

  // preset 下拉选项：默认 + 所有已保存方案
  const presetOptions = [
    { value: '__default__', label: '默认（无方案）' },
    ...presets.map((p) => ({ value: p.id, label: p.name })),
  ]

  const currentValue = activePresetId ?? '__default__'

  const handleSelect = (value: string) => {
    if (value === '__default__') {
      applyPreset(null)
    } else {
      applyPreset(value)
    }
  }

  const handleSave = () => {
    const name = saveName.trim()
    if (!name) return
    if (presets.some((p) => p.name === name)) {
      // 名字冲突
      return
    }
    saveCurrentAsPreset(name)
    setSaveName('')
    setShowSaveInput(false)
  }

  const handleRenameStart = (id: string) => {
    const p = presets.find((pr) => pr.id === id)
    if (p) {
      setEditingId(id)
      setEditName(p.name)
    }
  }

  const handleRenameConfirm = () => {
    const name = editName.trim()
    if (name && editingId && !presets.some((p) => p.name === name && p.id !== editingId)) {
      renamePreset(editingId, name)
    }
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = async (id: string) => {
    const p = presets.find((pr) => pr.id === id)
    const confirmed = await showConfirm({
      title: '删除方案',
      message: `确定删除方案「${p?.name ?? ''}」？此操作不可撤销。`,
      confirmText: '删除',
      variant: 'warning',
    })
    if (confirmed) {
      deletePreset(id)
    }
  }

  return (
    <Section title="下载方案">
      <SettingRow
        label={<span>当前方案<InfoTip text="下载方案保存以下设置：\n• 清晰度 + 视频/音频格式\n• 弹幕 / 字幕开关\n• 文件名模板\n• 下载模式（弹窗/内联）\n\n每次打开 BibiliDown 时，上次选中的方案会自动生效，无需重新设置。\n\n切换方案会立即更新所有下载相关选项，首页的清晰度选择和弹幕/字幕也会同步变化。" /></span>}
        hint={activePreset ? `${presets.length} 个方案已保存` : '保存当前设置为一键切换方案'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsSelect
            value={currentValue}
            onChange={handleSelect}
            options={presetOptions}
            style={{ minWidth: '130px' }}
          />
          {activePreset && (
            <>
              <HoverButton onClick={() => usePresetStore.getState().updatePreset(activePreset.id)} title="用当前设置覆盖更新此方案">
                💾
              </HoverButton>
              <HoverButton onClick={() => handleRenameStart(activePreset.id)} title="重命名方案">
                ✏
              </HoverButton>
              <HoverButton onClick={() => handleDelete(activePreset.id)} title="删除方案">
                🗑
              </HoverButton>
            </>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label={showSaveInput ? '方案名称' : '保存方案'}
        hint={showSaveInput ? '输入名称后回车确认' : '将当前下载设置保存为新方案'}
      >
        {showSaveInput ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setShowSaveInput(false); setSaveName('') } }}
              placeholder="例如：AI知识库"
              style={{
                width: '130px', height: '28px', padding: '0 8px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent)',
                backgroundColor: 'var(--surface-default)', color: 'var(--text-primary)',
                fontSize: 'var(--text-body-sm)', outline: 'none',
              }}
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              style={{
                height: '28px', padding: '0 10px', borderRadius: 'var(--radius-md)',
                border: 'none', backgroundColor: saveName.trim() ? 'var(--color-accent)' : 'var(--border-default)',
                color: saveName.trim() ? 'var(--color-accent-text)' : 'var(--text-tertiary)',
                fontSize: 'var(--text-body-sm)', cursor: saveName.trim() ? 'pointer' : 'default',
                fontWeight: 500,
              }}
            >
              确认
            </button>
            <button
              onClick={() => { setShowSaveInput(false); setSaveName('') }}
              style={{
                height: '28px', padding: '0 8px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', backgroundColor: 'transparent',
                color: 'var(--text-tertiary)', fontSize: 'var(--text-body-sm)', cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            style={{
              height: '30px', padding: '0 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-accent)', backgroundColor: 'transparent',
              color: 'var(--color-accent)', fontSize: 'var(--text-body-sm)', cursor: 'pointer',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            💾 保存当前
          </button>
        )}
      </SettingRow>

      {/* 内联重命名 */}
      {editingId && (
        <SettingRow label="重命名方案" hint="输入新名称后回车确认">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') { setEditingId(null); setEditName('') } }}
              style={{
                width: '130px', height: '28px', padding: '0 8px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent)',
                backgroundColor: 'var(--surface-default)', color: 'var(--text-primary)',
                fontSize: 'var(--text-body-sm)', outline: 'none',
              }}
            />
            <button
              onClick={handleRenameConfirm}
              disabled={!editName.trim()}
              style={{
                height: '28px', padding: '0 10px', borderRadius: 'var(--radius-md)',
                border: 'none', backgroundColor: editName.trim() ? 'var(--color-accent)' : 'var(--border-default)',
                color: editName.trim() ? 'var(--color-accent-text)' : 'var(--text-tertiary)',
                fontSize: 'var(--text-body-sm)', cursor: editName.trim() ? 'pointer' : 'default',
                fontWeight: 500,
              }}
            >
              确认
            </button>
            <button
              onClick={() => { setEditingId(null); setEditName('') }}
              style={{
                height: '28px', padding: '0 8px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', backgroundColor: 'transparent',
                color: 'var(--text-tertiary)', fontSize: 'var(--text-body-sm)', cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </SettingRow>
      )}
    </Section>
  )
}

/** 小型悬停按钮 */
function HoverButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)', border: '1px solid transparent',
        backgroundColor: 'transparent', color: 'var(--text-tertiary)',
        fontSize: '12px', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
    >
      {children}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5t">
      <h2 className="flex items-center gap-2t mb-3t" style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', fontWeight: 600 }}>
        <span style={{
          display: 'inline-block', width: '3px', height: '16px', borderRadius: '2px',
          backgroundColor: 'var(--color-accent)', flexShrink: 0,
        }} />
        {title}
      </h2>
      <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-default)' }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, hint, info, children }: {
  label: React.ReactNode
  hint?: string
  /** 详细说明 — hover 时在 ⓘ 图标上弹出 */
  info?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4t py-3t" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex-1 mr-4t">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
          {info && <InfoTip text={info} />}
        </span>
        {hint && <span className="block mt-0.5" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>{hint}</span>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

/** ⓘ 小圆圈 — hover 弹出详细说明气泡 */
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          border: `1px solid ${show ? 'var(--color-accent)' : 'var(--border-strong)'}`,
          fontSize: '10px',
          fontWeight: 600,
          color: show ? 'var(--color-accent)' : 'var(--text-tertiary)',
          background: show ? 'var(--color-accent-muted)' : 'transparent',
          lineHeight: 1,
          cursor: 'help',
          transition: 'border-color 0.15s, color 0.15s, background 0.15s',
        }}
      >
        ?
      </span>
      {/* Tooltip bubble — left-aligned to avoid overflow when ⓘ is near left edge */}
      <span
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: 0,
          padding: '6px 10px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#1a1a2e',
          color: '#e0e0e0',
          fontSize: '11px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          maxWidth: '260px',
          width: 'max-content',
          pointerEvents: 'none',
          opacity: show ? 1 : 0,
          transition: 'opacity 0.12s',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {text.split(/\\n|\n/).map((line, i, arr) => (
          i < arr.length - 1 ? <span key={i}>{line}<br /></span> : <span key={i}>{line}</span>
        ))}
        {/* Arrow — points at center of ⓘ icon (7.5px from left edge of 15px icon) */}
        <span
          style={{
            position: 'absolute',
            top: '100%',
            left: '7px',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #1a1a2e',
          }}
        />
      </span>
    </span>
  )
}

function ThemeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-4t py-2t transition-colors duration-fast"
      style={{ fontSize: 'var(--text-body-sm)', border: 'none', cursor: 'pointer', backgroundColor: active ? 'var(--color-accent)' : 'transparent', color: active ? 'var(--color-accent-text)' : 'var(--text-secondary)' }}>
      {label}
    </button>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="relative inline-flex items-center transition-colors duration-fast"
      style={{
        width: '40px',
        height: '22px',
        borderRadius: 'var(--radius-full)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: disabled ? 'var(--border-subtle)' : (checked ? 'var(--color-accent)' : 'var(--border-strong)'),
        padding: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span className="inline-block rounded-full bg-white transition-transform duration-fast"
        style={{
          width: '16px',
          height: '16px',
          transform: checked ? 'translateX(19px)' : 'translateX(3px)',
          opacity: disabled ? 0.6 : 1,
        }} />
    </button>
  )
}

function SliderValue({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2t">
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100px', accentColor: 'var(--color-accent)' }} />
      <span className="font-mono tabular-nums" style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', minWidth: '16px', textAlign: 'center' }}>
        {value}
      </span>
    </div>
  )
}
