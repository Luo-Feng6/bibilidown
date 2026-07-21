import { useState } from 'react'
import {
  Info, GithubLogo, Heart, Warning,
  FilmSlate, Stack, MonitorPlay, Download, Subtitles, QrCode,
  GearFine, Palette, ClockCounterClockwise, CaretDown,
  Lightning, ClipboardText, SignOut, Faders,
  Desktop, Browser, ArrowRight,
} from '@phosphor-icons/react'
import { isElectron, getElectronVersion, getChromeVersion } from '../utils/env'

/* ── Version (synced with package.json) ── */
const APP_VERSION = 'v7.7.2'

/* ── Platform info ── */
const electronVersion = getElectronVersion()
const chromeVersion = getChromeVersion()
const inElectron = isElectron()

/* ── Collapsible card wrapper ── */
function CollapsibleCard({
  title, icon, defaultOpen, children,
}: {
  title: string; icon: React.ReactNode; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-2t"
      style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 16px',
          border: 'none', background: 'transparent',
          color: 'var(--text-primary)', cursor: 'pointer',
          fontSize: 'var(--text-body-sm)', fontWeight: 600,
          fontFamily: 'inherit',
        }}
      >
        <div className="flex items-center gap-2t" style={{ color: 'var(--text-secondary)' }}>
          {icon}
          <span>{title}</span>
        </div>
        <CaretDown size={12} weight="bold" style={{
          color: 'var(--text-tertiary)', transition: 'transform 0.2s',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        }} />
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

/* ── Section label ── */
function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2t mb-3t" style={{ color: 'var(--text-tertiary)' }}>
      {icon}
      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{text}</span>
    </div>
  )
}

/* ── Feature card ── */
function FeatureCard({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3t p-3t rounded-xl transition-colors duration-fast"
      style={{ backgroundColor: 'var(--surface-default)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ width: '36px', height: '36px', backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{label}</p>
        <p className="mt-0.5" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{desc}</p>
      </div>
    </div>
  )
}

/* ── Timeline entry ── */
function TimelineEntry({ version, date, children, latest }: {
  version: string; date: string; children: React.ReactNode; latest?: boolean;
}) {
  return (
    <div className="pb-4t" style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', left: '-23px', top: '3px',
        width: latest ? '11px' : '8px', height: latest ? '11px' : '8px',
        borderRadius: '50%',
        backgroundColor: latest ? 'var(--color-accent)' : 'var(--border-strong)',
        border: latest ? '2px solid var(--color-accent-muted)' : '2px solid var(--surface-root)',
        boxShadow: latest ? '0 0 8px rgba(var(--color-accent-rgb, 59,130,246), 0.4)' : 'none',
      }} />
      <div className="flex items-center gap-2t mb-1t">
        <span className="font-mono" style={{ fontSize: 'var(--text-caption)', color: 'var(--color-accent)', fontWeight: 600 }}>{version}</span>
        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{date}</span>
        {latest && (
          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)', fontWeight: 600 }}>
            最新
          </span>
        )}
      </div>
      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>{children}</p>
    </div>
  )
}

/* ── Tech stack pill ── */
function TechPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--radius-full)',
      backgroundColor: 'var(--surface-default)', color: 'var(--text-tertiary)',
      border: '1px solid var(--border-subtle)', fontWeight: 500,
    }}>{children}</span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   AboutPage — 关于页面
   ══════════════════════════════════════════════════════════════════════════ */
export default function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-8t pt-10t pb-8t text-center"
        style={{
          background: `linear-gradient(180deg, var(--color-accent-muted) 0%, transparent 100%)`,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
        <div className="flex justify-center mb-5t">
          <img src="/favicon.svg" alt="BibiliDown"
            onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.png' }}
            style={{
              width: '80px', height: '80px',
              filter: 'drop-shadow(0 8px 32px rgba(251,114,153,0.35))',
            }} />
        </div>

        <h1 className="flex items-center justify-center gap-3t" style={{
          fontSize: 'var(--text-heading-lg)', fontWeight: 600,
          color: 'var(--text-primary)', lineHeight: 1.2,
        }}>
          BibiliDown
          <span className="font-mono" style={{
            fontSize: 'var(--text-body-sm)',
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-accent-text)',
            fontWeight: 600,
          }}>{APP_VERSION}</span>
        </h1>

        {inElectron && (
          <p className="mt-1t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
            Electron {electronVersion}
            {chromeVersion && <span> · Chromium {chromeVersion}</span>}
          </p>
        )}
        {!inElectron && (
          <p className="mt-1t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontWeight: 500 }}>
            🌐 当前使用浏览器版
          </p>
        )}

        <p className="mt-3t" style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '8px auto 0' }}>
          B 站视频下载工具 · 高清下载 · 多 P 拆分 · FFmpeg 合并 · 弹幕字幕 · 批量队列 · 扫码登录 · 下载方案一键切换
        </p>

        {/* Tech stack pills — varies by environment */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-5t">
          {inElectron ? (
            <>
              <TechPill>Electron {electronVersion}</TechPill>
              {chromeVersion && <TechPill>Chromium {chromeVersion}</TechPill>}
            </>
          ) : (
            <TechPill>🌐 浏览器</TechPill>
          )}
          <TechPill>React 18</TechPill>
          <TechPill>TypeScript</TechPill>
          <TechPill>Tailwind</TechPill>
          <TechPill>Zustand 5</TechPill>
          <TechPill>Vite 5</TechPill>
        </div>
      </div>

      <div className="px-8t py-6t mx-auto" style={{ maxWidth: '600px' }}>
        {/* ── 浏览器 vs 桌面端 ── */}
        <SectionLabel icon={inElectron ? <Desktop size={14} /> : <Browser size={14} />} text="运行环境" />
        <PlatformComparison />

        {/* ── Feature grid ── */}
        <SectionLabel icon={<FilmSlate size={14} />} text="功能特性" />
        <div className="grid gap-2t mb-8t" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          <FeatureCard icon={<Download size={18} />} label="高清下载" desc="4K / 1080P60 / 720P / 480P" />
          <FeatureCard icon={<Stack size={18} />} label="多 P 拆分" desc="自动识别分P，每P独立下载" />
          <FeatureCard icon={<GearFine size={18} />} label="FFmpeg 合并" desc="音视频自动合并 + 转码" />
          <FeatureCard icon={<MonitorPlay size={18} />} label="批量队列" desc="番剧 · 合集 · 收藏夹一键加入" />
          <FeatureCard icon={<Subtitles size={18} />} label="弹幕 & 字幕" desc="同时下载 .xml 弹幕和 .srt 字幕" />
          <FeatureCard icon={<QrCode size={18} />} label="扫码登录" desc="手机 B 站 App 扫码，Cookie 持久化" />
          <FeatureCard icon={<Palette size={18} />} label="暗色主题" desc="跟随系统，5 种主题色可选" />
          <FeatureCard icon={<ClockCounterClockwise size={18} />} label="历史记录" desc="自动记录，支持搜索 · 日期筛选 · 导入导出" />
          <FeatureCard icon={<Faders size={18} />} label="下载方案" desc="保存多套设置，一键切换清晰度/格式/模式" />
          <FeatureCard icon={<ClipboardText size={18} />} label="全站复制" desc="标题 · BV号 · 链接一键复制到剪贴板" />
        </div>

        {/* ── Changelog ── */}
        <CollapsibleCard title="更新日志" icon={<Info size={14} />} defaultOpen={false}>
          <div style={{ position: 'relative', padding: '12px 16px 8px 44px' }}>
            <div style={{ position: 'absolute', left: '21px', top: '20px', bottom: '20px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />
            <TimelineEntry version="v7.7.2" date="2026-07-22" latest>
              Electron API_BASE 修复 · 下载弹窗 React 化 · LoginPanel 拆分 · QN_LABELS + keyframes 去重
            </TimelineEntry>
            <TimelineEntry version="v7.7.1" date="2026-07-22">
              关于页重设计 · 浏览器/桌面端对比 · 退出登录修复 · isElectron 去重 · 文档四件套
            </TimelineEntry>
            <TimelineEntry version="v7.7.0" date="2026-07-22">
              预设系统 · 全站复制按钮 · 退出登录/更换账号 · 历史日期范围筛选 · 文件名模板变量插入
            </TimelineEntry>
            <TimelineEntry version="v7.6.0" date="2026-07-20">
              设置页下拉 UI 修复 · 文件名模板扩展 · 弹窗 ✕ 关闭 · Electron 双流并行 · 历史记录导入/导出
            </TimelineEntry>
            <TimelineEntry version="v7.5.0" date="2026-07-18">
              格式系统拆分 · 设置页 UI 重设计 · 字幕独立下载 · 暗色主题全面修复 · 5 色主题选择器
            </TimelineEntry>
            <TimelineEntry version="v7.1.0" date="2026-07-15">
              FFmpeg 自动下载与检测 · 极验验证码 · 多 P 视频拆分 · 分页 API 泛型化 · 亮色主题适配
            </TimelineEntry>
            <TimelineEntry version="v7.0.0" date="2026-07-01">
              Java Swing → Electron + React + TypeScript 全面重写 · Fluent Design · 三种登录方式 · 批量下载
            </TimelineEntry>
          </div>
        </CollapsibleCard>

        {/* ── System & Credits ── */}
        <CollapsibleCard title="系统 & 致谢" icon={<GithubLogo size={14} />} defaultOpen={false}>
          <div className="px-4t py-3t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
            {inElectron ? (
              <div className="flex flex-wrap gap-x-5t gap-y-1t mb-2t">
                <span>Electron {electronVersion}</span>
                {chromeVersion && <span>Chromium {chromeVersion}</span>}
                <span>{navigator.platform}</span>
              </div>
            ) : (
              <p className="mb-2t" style={{ color: 'var(--text-secondary)' }}>
                🌐 浏览器模式 — 运行于 {navigator.platform} 上的 {chromeVersion ? `Chrome ${chromeVersion}` : '现代浏览器'}
              </p>
            )}
            <p>图标：Phosphor Icons · 字体：Segoe UI Variable</p>
            <p>设计：Windows 11 Fluent Design</p>
            <p>依赖：React 18 · Zustand 5 · Vite 5 · QRCode · SparkMD5 · JSEncrypt</p>
          </div>
        </CollapsibleCard>

        {/* ── Contact ── */}
        <CollapsibleCard title="联系 & 反馈" icon={<Heart size={14} />} defaultOpen={false}>
          <div className="px-4t py-3t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
            <p>🐛 发现问题？欢迎通过以下方式反馈：</p>
            <p className="mt-1.5t">
              📧 邮箱：<a href="mailto:mike-666@foxmail.com" style={{ color: 'var(--color-accent)' }}>mike-666@foxmail.com</a>
            </p>
            <p>
              🔗 GitHub：<a href="https://github.com/Luo-Feng6/bibilidown" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Luo-Feng6/bibilidown</a>
            </p>
            <p className="mt-1.5t" style={{ color: 'var(--text-secondary)' }}>
              Issues & PR 欢迎提交，附上版本号和错误日志会更快定位。
            </p>
          </div>
        </CollapsibleCard>

        {/* ── Disclaimer ── */}
        <div className="flex items-start gap-3t p-4t"
          style={{ borderRadius: 'var(--radius-xl)', border: '1px solid rgba(var(--color-accent-rgb, 251, 191, 36), 0.2)', backgroundColor: 'var(--color-warning-bg)' }}>
          <Warning size={16} weight="fill" style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
            本工具仅用于个人学习与研究，下载内容版权归 B 站及 UP 主所有。使用即表示同意遵守相关法律法规。
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PlatformComparison — 浏览器版 vs 桌面版差异对比
   ══════════════════════════════════════════════════════════════════════════ */
function PlatformComparison() {
  // Feature availability matrix
  const rows: { feature: string; browser: string | boolean; desktop: string | boolean }[] = [
    { feature: '视频解析', browser: true, desktop: true },
    { feature: 'DASH 高清下载', browser: true, desktop: true },
    { feature: 'FLV 下载', browser: true, desktop: true },
    { feature: '弹幕 / 字幕', browser: true, desktop: true },
    { feature: '扫码登录', browser: true, desktop: true },
    { feature: '下载方案（预设）', browser: true, desktop: true },
    { feature: '历史记录', browser: true, desktop: true },
    { feature: '下载路径自定义', browser: '仅保存配置', desktop: '完整支持' },
    { feature: '下载后自动打开文件夹', browser: false, desktop: true },
    { feature: '系统托盘最小化', browser: false, desktop: true },
    { feature: '自定义窗口标题栏', browser: false, desktop: true },
    { feature: 'FFmpeg 自动检测', browser: '手动配置', desktop: '内置检测' },
  ]

  const checkIcon = (val: string | boolean) => {
    if (val === true) return <span style={{ color: 'var(--color-success, #34d399)' }}>✅</span>
    if (val === false) return <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>—</span>
    return <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{val}</span>
  }

  return (
    <div className="mb-6t">
      {/* Current environment banner */}
      <div className="p-4t rounded-xl mb-4t" style={{
        backgroundColor: inElectron ? 'rgba(52, 211, 153, 0.08)' : 'rgba(96, 165, 250, 0.08)',
        border: inElectron ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(96, 165, 250, 0.2)',
      }}>
        {inElectron ? (
          <div>
            <p className="flex items-center gap-2t mb-1t" style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Desktop size={18} style={{ color: 'var(--color-success, #34d399)' }} />
              正在使用 BibiliDown 桌面版
            </p>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              已启用全部功能：托盘驻留、自定义下载路径、FFmpeg 自动检测、窗口标题栏。
              <br />
              也可使用 <a href="https://github.com/Luo-Feng6/bibilidown" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>浏览器版</a>（无需安装，功能略少）。
            </p>
          </div>
        ) : (
          <div>
            <p className="flex items-center gap-2t mb-1t" style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Browser size={18} style={{ color: 'var(--color-accent)' }} />
              当前正在使用浏览器版
            </p>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              核心下载功能完整可用。如需托盘驻留、自定义下载路径、自动打开文件夹等高级功能，请使用桌面版。
              <br />
              下载桌面版：<a href="https://github.com/Luo-Feng6/bibilidown/releases" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
                GitHub Releases <ArrowRight size={10} weight="bold" style={{ display: 'inline' }} />
              </a>
              {' · '}
              项目主页：<a href="https://github.com/Luo-Feng6/bibilidown" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Luo-Feng6/bibilidown</a>
            </p>
          </div>
        )}
      </div>

      {/* Feature comparison table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-caption)' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-default)' }}>
              <th style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--text-secondary)', fontWeight: 600 }}>功能</th>
              <th style={{ textAlign: 'center', padding: '8px 14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Browser size={12} style={{ display: 'inline', marginRight: '4px' }} />
                浏览器版
              </th>
              <th style={{ textAlign: 'center', padding: '8px 14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Desktop size={12} style={{ display: 'inline', marginRight: '4px' }} />
                桌面版
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.feature}
                style={{
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.03)',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                <td style={{ padding: '7px 14px', color: 'var(--text-secondary)' }}>{row.feature}</td>
                <td style={{ textAlign: 'center', padding: '7px 14px' }}>{checkIcon(row.browser)}</td>
                <td style={{ textAlign: 'center', padding: '7px 14px' }}>{checkIcon(row.desktop)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
