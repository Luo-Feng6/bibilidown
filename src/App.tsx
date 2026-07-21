import { useEffect, useState, useRef } from 'react'
import Sidebar from './components/Sidebar'
import InputBar from './components/InputBar'
import VideoCard from './components/VideoCard'
import StatusBar from './components/StatusBar'
import TitleBar from './components/TitleBar'
import DownloadPanel from './components/DownloadPanel'
import LoginPanel from './components/LoginPanel'
import ToastContainer from './components/Toast'
import EpisodeList from './components/EpisodeList'
import SettingsPage from './pages/SettingsPage'
import HistoryPage from './pages/HistoryPage'
import AboutPage from './pages/AboutPage'
import { type DownloadItemData } from './components/DownloadItem'
import type { QualityOption } from './components/QualityChip'
import { useDownloadStore } from './stores/downloadStore'
import { useParseStore, type ParsedVideo } from './stores/parseStore'
import { useUserPrefsStore } from './stores/userPrefsStore'
import { useHistoryStore } from './stores/historyStore'
import { usePresetStore } from './stores/presetStore'
import { useFfmpegStore } from './stores/ffmpegStore'
import FfmpegBanner from './components/FfmpegBanner'
import { CaretDown, DownloadSimple, Spinner, MonitorPlay, Stack, FilmSlate, Subtitles, QrCode } from '@phosphor-icons/react'
import { useNavigationStore } from './stores/navigationStore'
import { useToastStore } from './stores/toastStore'
import { startDownloadManager, stopDownloadManager } from './services/download-manager'
import { showConfirm, showDownloadChoice } from './services/dialog-service'
import { setGlobalCookie, refreshCookie, loadMoreMediaList, resolvePagesForBvid, parseBilibiliUrl, validateCookie } from './services/bilibili-api'

function generateDownloadId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/* ── Accent color presets ── */

interface AccentPreset { main: string; hover: string; muted: string; rgb: string }
interface AccentPresetLight extends AccentPreset { text: string }

const ACCENT_PRESETS_DARK: Record<string, AccentPreset> = {
  blue:   { main: '#60A5FA', hover: '#93C5FD', muted: 'rgba(59,130,246,0.15)', rgb: '96, 165, 250' },
  pink:   { main: '#FB7299', hover: '#FF85AD', muted: 'rgba(251,114,153,0.20)', rgb: '251, 114, 153' },
  cyan:   { main: '#22D3EE', hover: '#67E8F9', muted: 'rgba(34,211,238,0.15)', rgb: '34, 211, 238' },
  purple: { main: '#A78BFA', hover: '#C4B5FD', muted: 'rgba(139,92,246,0.15)', rgb: '167, 139, 250' },
  amber:  { main: '#FBBF24', hover: '#FDE68A', muted: 'rgba(245,158,11,0.15)', rgb: '251, 191, 36' },
}

const ACCENT_PRESETS_LIGHT: Record<string, AccentPresetLight> = {
  blue:   { main: '#2563EB', hover: '#1D4ED8', muted: '#EFF6FF', text: '#FFFFFF', rgb: '37, 99, 235' },
  pink:   { main: '#E55A80', hover: '#D14A6F', muted: '#FEF0F4', text: '#FFFFFF', rgb: '229, 90, 128' },
  cyan:   { main: '#0891B2', hover: '#0E7490', muted: '#ECFEFF', text: '#FFFFFF', rgb: '8, 145, 178' },
  purple: { main: '#7C3AED', hover: '#6D28D9', muted: '#F5F3FF', text: '#FFFFFF', rgb: '124, 58, 237' },
  amber:  { main: '#D97706', hover: '#B45309', muted: '#FFFBEB', text: '#FFFFFF', rgb: '217, 119, 6' },
}

export default function App() {
  const theme = useUserPrefsStore((s) => s.theme)
  const accentColor = useUserPrefsStore((s) => s.accentColor)
  const { currentView, navigate } = useNavigationStore()
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)

  /* ── Download store ── */
  const downloadItems = useDownloadStore((s) => s.items)
  const addItem = useDownloadStore((s) => s.addItem)
  const pauseItem = useDownloadStore((s) => s.pauseItem)
  const resumeItem = useDownloadStore((s) => s.resumeItem)
  const cancelItem = useDownloadStore((s) => s.cancelItem)
  const retryItem = useDownloadStore((s) => s.retryItem)
  const clearCompleted = useDownloadStore((s) => s.clearCompleted)
  const clearFailed = useDownloadStore((s) => s.clearFailed)

  /* ── Parse store (useShallow to avoid new object on every snapshot) ── */
  const videos = useParseStore((s) => s.videos)
  const parseStatus = useParseStore((s) => s.status)
  const lastUrl = useParseStore((s) => s.lastUrl)
  const paginationId = useParseStore((s) => s.paginationId)
  const paginationTotalCount = useParseStore((s) => s.paginationTotalCount)
  const isLoadingMore = useParseStore((s) => s.isLoadingMore)

  /* ── Panel preferences (persisted) ── */
  const panelWidth = useUserPrefsStore((s) => s.panelWidth)
  const panelCollapsed = useUserPrefsStore((s) => s.panelCollapsed)
  const setPanelWidth = useUserPrefsStore((s) => s.setPanelWidth)
  const setPanelCollapsed = useUserPrefsStore((s) => s.setPanelCollapsed)
  const downloadDanmaku = useUserPrefsStore((s) => s.downloadDanmaku)
  const downloadSubtitle = useUserPrefsStore((s) => s.downloadSubtitle)
  const downloadModeStyle = useUserPrefsStore((s) => s.downloadModeStyle)
  const showCoverImage = useUserPrefsStore((s) => s.showCoverImage)

  /* ── 分页状态 ── */
  const paginationHasMore = paginationId != null && videos.length < paginationTotalCount

  /* Download items now come from real parse + "加入下载队列" flow.
   * No more demo seed data — empty panel shows guidance. */

  /** 从设置读取当前格式偏好，生成队列/历史里显示的格式标签 */
  function resolveFormatLabel(mode?: DownloadItemData['downloadMode']): string {
    const prefs = useUserPrefsStore.getState()
    const v = prefs.preferredFormat === 'm4s' ? 'M4S' : 'MP4'
    const aMap: Record<string, string> = { m4a: 'M4A', m4s: 'M4S', mp3: 'MP3' }
    const a = aMap[prefs.preferredAudioFormat] || 'M4A'
    if (mode === 'video-only') return v
    if (mode === 'audio-only') return a
    if (mode === 'separate' || mode === 'merge') return `${v}+${a}`
    return v
  }

  /* ── Sync theme + accent color to <html> element so CSS variables resolve correctly ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)

    if (theme === 'dark') {
      const preset = ACCENT_PRESETS_DARK[accentColor] ?? ACCENT_PRESETS_DARK.blue
      const root = document.documentElement.style
      root.setProperty('--color-accent', preset.main, 'important')
      root.setProperty('--color-accent-hover', preset.hover, 'important')
      root.setProperty('--color-accent-muted', preset.muted, 'important')
      root.setProperty('--color-accent-text', '#0F172A', 'important')
      root.setProperty('--color-accent-rgb', preset.rgb, 'important')
    } else {
      const preset = ACCENT_PRESETS_LIGHT[accentColor] ?? ACCENT_PRESETS_LIGHT.blue
      const root = document.documentElement.style
      root.setProperty('--color-accent', preset.main, 'important')
      root.setProperty('--color-accent-hover', preset.hover, 'important')
      root.setProperty('--color-accent-muted', preset.muted, 'important')
      root.setProperty('--color-accent-text', preset.text, 'important')
      root.setProperty('--color-accent-rgb', preset.rgb, 'important')
    }
  }, [theme, accentColor])

  /* ── Hydrate persisted stores + init cookie (rehydrate MUST run first) ── */
  useEffect(() => {
    // 1) Load persisted state from localStorage into the in-memory stores
    useUserPrefsStore.persist.rehydrate()
    useHistoryStore.persist.rehydrate()
    useDownloadStore.persist.rehydrate()
    useParseStore.persist.rehydrate()
    usePresetStore.persist.rehydrate()

    // 2) Now the store has any previously-saved cookie — initialize it
    async function initCookie() {
      const cookieStr = useUserPrefsStore.getState().cookieStr
      if (!cookieStr) return

      setGlobalCookie(cookieStr)

      // 将持久化的 cookie 注入 document.cookie，让浏览器自动在同源请求中携带
      // （Vite proxy 依赖浏览器的 cookie jar，不能依赖 fetch 手动设置的 Cookie 头）
      try {
        const pairs = cookieStr.split(';')
        for (const pair of pairs) {
          const [key, ...rest] = pair.trim().split('=')
          const value = rest.join('=')
          if (key && value) {
            document.cookie = `${key}=${value}; path=/; SameSite=Lax`
          }
        }
      } catch { /* cookie 注入失败不影响主流程 */ }

      // 启动时验证 Cookie 是否过期
      useUserPrefsStore.getState().setCookieStatus('checking')
      const result = await validateCookie()

      if (result.valid && result.uname) {
        useUserPrefsStore.getState().setCookieStatus('valid')
        useUserPrefsStore.getState().setCookieUsername(result.uname)
      } else if (!result.valid) {
        // Cookie 已过期——尝试自动刷新
        const refreshResult = await refreshCookie()
        if (refreshResult.success && refreshResult.newCookie) {
          // 自动刷新成功
          setGlobalCookie(refreshResult.newCookie)
          useUserPrefsStore.getState().setCookieStatus('valid')

          // 重新验证以获取用户名
          const reResult = await validateCookie()
          if (reResult.uname) {
            useUserPrefsStore.getState().setCookieUsername(reResult.uname)
            useUserPrefsStore.getState().setLoginInfo(
              refreshResult.newCookie,
              reResult.uname,
              ''
            )
          } else {
            // 刷新后验证无用户名（网络容错），仍更新持久化 cookie
            useUserPrefsStore.getState().setLoginInfo(
              refreshResult.newCookie,
              '',
              ''
            )
          }
        } else {
          // 自动刷新失败，回退到提示过期
          useUserPrefsStore.getState().setCookieStatus('expired')
        }
      } else {
        // valid 但无 uname（可能是网络容错），保持原状态
        useUserPrefsStore.getState().setCookieStatus('valid')
      }
    }

    initCookie()
  }, [])

  /* ── Start/stop download manager ── */
  useEffect(() => {
    startDownloadManager()
    return () => stopDownloadManager()
  }, [])

  /* ── Check FFmpeg availability ── */
  useEffect(() => {
    useFfmpegStore.getState().checkFfmpeg()
  }, [])

  /* ── "加入下载队列" handler ── */
  const handleAddToQueue = async (video: ParsedVideo, quality: QualityOption) => {
    // 懒解析 cid（ml 收藏夹场景：有 bvid 但无 cid）
    let cid = video.cid
    if (cid == null && video.bvid) {
      const pages = await resolvePagesForBvid(video.bvid)
      if (pages.length === 0) {
        useToastStore.getState().error(`无法获取 ${video.title} 的视频信息，请重试`)
        return
      }

      // 多 P 视频：每 P 作为一个独立下载项加入队列
      if (pages.length > 1) {
        // 浏览器模式：弹一次窗选下载模式，应用到所有分P
        let downloadMode: DownloadItemData['downloadMode'] = undefined
        if (!window.electronAPI) {
          downloadMode = await showDownloadChoice({ title: video.title, isDash: true, hasVideo: true, hasAudio: true })
          if (!downloadMode) return
        }

        let added = 0
        let skipped = 0
        for (const page of pages) {
          const pageItem: DownloadItemData = {
            id: generateDownloadId(),
            title: `${video.title} — P${page.page} ${page.part}`.trim(),
            quality: quality.label,
            format: resolveFormatLabel(downloadMode),
            totalSize: quality.size,
            downloadedSize: '0MB',
            progress: 0,
            speed: '等待中',
            eta: '',
            status: 'queued',
            bvid: video.bvid,
            cid: page.cid,
            downloadMode,
          }
          const result = addItem(pageItem)
          if (result.duplicate) {
            skipped++
          } else {
            added++
          }
        }
        if (added > 0) {
          useToastStore.getState().success(`已添加 ${added} 个分P到下载队列`)
        }
        if (skipped > 0) {
          useToastStore.getState().warning(`${skipped} 个分P已在下载队列中，已跳过`)
        }
        return
      }

      // 单 P：直接取 cid
      cid = pages[0].cid
      if (cid == null) {
        useToastStore.getState().error(`无法获取 ${video.title} 的视频信息，请重试`)
        return
      }
    }

    // 浏览器模式：弹窗提前选择下载模式
    let downloadMode: DownloadItemData['downloadMode'] = undefined
    let qualityLabel = quality.label
    if (!window.electronAPI) {
      downloadMode = await showDownloadChoice({ title: video.title, isDash: true, hasVideo: true, hasAudio: true })
      if (!downloadMode) return
      if (downloadMode === 'audio-only') qualityLabel = '音频'
    }

    const item: DownloadItemData = {
      id: generateDownloadId(),
      title: video.title,
      quality: qualityLabel,
      format: resolveFormatLabel(downloadMode),
      totalSize: quality.size,
      downloadedSize: '0MB',
      progress: 0,
      speed: '等待中',
      eta: '',
      status: 'queued',
      bvid: video.bvid,
      cid,
      inputUrl: lastUrl,
      downloadMode,
    }
    const result = addItem(item)
    if (result.duplicate) {
      useToastStore.getState().warning('该视频已在下载队列中')
    }
  }

  /* ── "加入下载队列（内联模式）" handler ── */
  const handleAddToQueueWithMode = async (
    video: ParsedVideo,
    quality: QualityOption,
    mode: 'video-only' | 'audio-only' | 'separate' | 'merge'
  ) => {
    // 浏览器模式下选「合并」→ 弹窗确认
    if (mode === 'merge' && !window.electronAPI) {
      const confirmed = await showConfirm({
        title: '浏览器模式无法自动合并',
        message: '需要同时下载视频和音频两个文件，然后用 FFmpeg 手动合并。\n\n推荐使用桌面版 (Electron) 自动合成。\n\n是否下载两个文件？',
        confirmText: '下载两个文件',
        cancelText: '取消',
        variant: 'info',
      })
      if (!confirmed) return
      // 用户确认 → 按 separate 模式下载
      mode = 'separate'
    }
    // 懒解析 cid（ml 收藏夹场景：有 bvid 但无 cid）
    let cid = video.cid
    if (cid == null && video.bvid) {
      const pages = await resolvePagesForBvid(video.bvid)
      if (pages.length === 0) {
        useToastStore.getState().error(`无法获取 ${video.title} 的视频信息，请重试`)
        return
      }

      // 多 P 视频：每 P 作为一个独立下载项加入队列
      if (pages.length > 1) {
        let added = 0
        let skipped = 0
        for (const page of pages) {
          const pageItem: DownloadItemData = {
            id: generateDownloadId(),
            title: `${video.title} — P${page.page} ${page.part}`.trim(),
            quality: quality.label,
            format: resolveFormatLabel(mode),
            totalSize: quality.size,
            downloadedSize: '0MB',
            progress: 0,
            speed: '等待中',
            eta: '',
            status: 'queued',
            bvid: video.bvid,
            cid: page.cid,
            downloadMode: mode,
          }
          const result = addItem(pageItem)
          if (result.duplicate) {
            skipped++
          } else {
            added++
          }
        }
        if (added > 0) {
          useToastStore.getState().success(`已添加 ${added} 个分P到下载队列`)
        }
        if (skipped > 0) {
          useToastStore.getState().warning(`${skipped} 个分P已在下载队列中，已跳过`)
        }
        return
      }

      // 单 P：直接取 cid
      cid = pages[0].cid
      if (cid == null) {
        useToastStore.getState().error(`无法获取 ${video.title} 的视频信息，请重试`)
        return
      }
    }

    let qualityLabel = quality.label
    if (mode === 'audio-only') qualityLabel = '音频'

    const item: DownloadItemData = {
      id: generateDownloadId(),
      title: video.title,
      quality: qualityLabel,
      format: resolveFormatLabel(mode),
      totalSize: quality.size,
      downloadedSize: '0MB',
      progress: 0,
      speed: '等待中',
      eta: '',
      status: 'queued',
      bvid: video.bvid,
      cid,
      inputUrl: lastUrl,
      downloadMode: mode,
    }
    const result = addItem(item)
    if (result.duplicate) {
      useToastStore.getState().warning('该视频已在下载队列中')
    }
  }

  /* ── "批量加入下载队列" handler ── */
  const handleBatchAddToQueue = async (episodes: ParsedVideo[], quality: QualityOption) => {
    // 懒解析所有缺失的 cid（ml 收藏夹场景）
    // 多 P 视频在批量模式下跳过，提示用户单独添加
    const needCid = episodes.filter((ep) => ep.cid == null && ep.bvid)
    let multiPSkipped: string[] = []

    if (needCid.length > 0) {
      const results = await Promise.allSettled(
        needCid.map((ep) => resolvePagesForBvid(ep.bvid!))
      )
      // 将解析到的 cid 写回对应 episode，多 P 视频跳过
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.length === 1) {
          needCid[i].cid = r.value[0].cid
        } else if (r.status === 'fulfilled' && r.value.length > 1) {
          // 多 P 视频：批量模式跳过
          multiPSkipped.push(needCid[i].title)
        }
        // r.status === 'rejected' or 0 pages: cid stays null, will be skipped below
      })
    }

    let added = 0
    let skipped = 0

    // 浏览器模式：弹一次窗选下载模式，应用到所有批量项
    let downloadMode: DownloadItemData['downloadMode'] = undefined
    if (!window.electronAPI && episodes.length > 0) {
      downloadMode = await showDownloadChoice({ title: episodes[0].title, isDash: true, hasVideo: true, hasAudio: true })
      if (!downloadMode) return
    }

    for (const ep of episodes) {
      if (ep.cid == null && ep.bvid == null) {
        skipped++
        continue
      }
      // 有 bvid 但 cid 仍为 null（API 解析失败或已被多 P 跳过标记）
      if (ep.cid == null) {
        skipped++
        continue
      }

      const item: DownloadItemData = {
        id: generateDownloadId(),
        title: ep.title,
        quality: quality.label,
        format: resolveFormatLabel(downloadMode),
        totalSize: quality.size,
        downloadedSize: '0MB',
        progress: 0,
        speed: '等待中',
        eta: '',
        status: 'queued',
        bvid: ep.bvid,
        cid: ep.cid,
        downloadMode,
      }
      const result = addItem(item)
      if (result.duplicate) {
        skipped++
      } else {
        added++
      }
    }

    if (added > 0) {
      useToastStore.getState().success(`已添加 ${added} 个视频到下载队列`)
    }
    if (skipped > 0) {
      useToastStore.getState().warning(`${skipped} 个视频无法获取下载信息或已在队列中，已跳过`)
    }
    for (const title of multiPSkipped) {
      useToastStore.getState().warning(`${title} 包含多个分P，请单独添加`)
    }
  }

  /* ── "打开文件夹" handler ── */
  const handleOpenFolder = async (id: string) => {
    const item = downloadItems.find((d) => d.id === id)
    if (!item?.savedPath) return

    if (window.electronAPI) {
      await window.electronAPI.showItemInFolder(item.savedPath)
    } else {
      await navigator.clipboard.writeText(item.savedPath)
      useToastStore.getState().success(`已复制文件名: ${item.savedPath}`)
    }
  }

  /* ── "重新下载" handler（历史记录页）── */
  const handleReDownload = async (bvid: string) => {
    navigate('download')
    useParseStore.getState().setParsing()

    try {
      const result = await parseBilibiliUrl(bvid)
      if (result.length === 0) {
        useParseStore.getState().setError('未解析到任何视频，请检查 BV 号是否正确')
      } else {
        useParseStore.getState().setVideos(result)
        useToastStore.getState().success(`已找到: ${result[0]?.title ?? bvid}`)
      }
    } catch (err: any) {
      useParseStore.getState().setError(err.message || '解析失败')
      useToastStore.getState().error(err.message || '重新下载解析失败')
    }
  }

  return (
    <div
      data-theme={theme}
      className="flex flex-col h-full w-full"
      style={{ backgroundColor: 'var(--surface-root)' }}
    >
      {/* ── Title Bar ── */}
      <TitleBar />

      {/* ── Body: Sidebar + Main + Download Panel ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'download' && (
            <>
              {/* FFmpeg 缺失警告横幅 */}
              <FfmpegBanner />

              {/* Login hint + Input Bar */}
              <div className="px-8t pt-5t pb-4t">
                <LoginHint onLoginClick={() => setLoginPanelOpen(true)} />
                <div className="mt-2t">
                  <InputBar />
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-8t pb-8t">
                {/* ── 解析状态分发 ── */}
                {parseStatus === 'idle' && <EmptyParseState />}
                {parseStatus === 'parsing' && <ParsingState />}
                {parseStatus === 'success' && videos.length > 0 && (
                  <div className="flex flex-col gap-4t">
                    {/* 预设方案快捷切换 */}
                    <PresetQuickSwitch />
                    {/* Episode list mode: >3 episodes with episode numbering */}
                    {videos.length > 3 && videos[0].episodeIndex != null ? (
                      <EpisodeList
                        episodes={videos}
                        onAddToQueue={handleBatchAddToQueue}
                        hasMore={paginationHasMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={() => loadMoreMediaList().catch(() => {
                          /* error already shown via toast in loadMoreMediaList */
                        })}
                      />
                    ) : (
                      /* Single/multi-P card mode: individual VideoCards */
                      videos.map((video) => (
                        <VideoCard
                          key={video.id}
                          coverUrl={video.coverUrl}
                          title={video.title}
                          upName={video.upName}
                          views={video.views}
                          duration={video.duration}
                          date={video.date}
                          qualities={video.qualities.map((q) => ({ ...q }))}
                          bvid={video.bvid}
                          cid={video.cid}
                          downloadModeStyle={downloadModeStyle}
                          onAddToQueue={(quality) => handleAddToQueue(video, quality)}
                          onAddToQueueWithMode={(quality, mode) => handleAddToQueueWithMode(video, quality, mode)}
                          onNavigateToSettings={() => navigate('settings')}
                          showCoverImage={showCoverImage}
                        />
                      ))
                    )}
                  </div>
                )}
                {parseStatus === 'success' && videos.length === 0 && <EmptyParseState />}
                {/* error 状态由 InputBar 内部展示，这里不重复 */}
                {parseStatus === 'error' && <EmptyParseState />}
              </div>
            </>
          )}

          {currentView === 'settings' && <SettingsPage />}
          {currentView === 'history' && (
            <HistoryPage onReDownload={handleReDownload} />
          )}
          {currentView === 'about' && <AboutPage />}
        </main>

        {/* Download Panel — only on download view */}
        {currentView === 'download' && (
          <DownloadPanel
            items={downloadItems}
            collapsed={panelCollapsed}
            panelWidth={panelWidth}
            onPause={pauseItem}
            onResume={resumeItem}
            onCancel={cancelItem}
            onRetry={retryItem}
            onClearCompleted={clearCompleted}
            onClearFailed={clearFailed}
            onOpenFolder={window.electronAPI ? handleOpenFolder : undefined}
            onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
            onPanelWidthChange={setPanelWidth}
          />
        )}
      </div>

      {/* ── Status Bar ── */}
      <StatusBar onLoginClick={() => setLoginPanelOpen(true)} />

      {/* ── Login Panel (slide-in overlay) ── */}
      <LoginPanel open={loginPanelOpen} onClose={() => setLoginPanelOpen(false)} />

      {/* ── Toast notifications ── */}
      <ToastContainer />
    </div>
  )
}

/* ── Quick-toggle chip for download options ── */

function ToggleChip({ label, icon, active, onChange }: {
  label: string; icon: string; active: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: 'var(--radius-full, 999px)',
        fontSize: '12px',
        border: active ? '1px solid var(--color-accent)' : '1px solid var(--border-subtle)',
        background: active ? 'var(--color-accent-muted)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--text-tertiary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

/* ── Empty parse state ── */

function PresetQuickSwitch() {
  const presets = usePresetStore((s) => s.presets)
  const activePresetId = usePresetStore((s) => s.activePresetId)
  const applyPreset = usePresetStore((s) => s.applyPreset)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const activeName = activePresetId ? presets.find((p) => p.id === activePresetId)?.name ?? '默认' : '默认'

  const handleSync = () => {
    // 重新应用当前方案（或默认），强制下载页同步设置
    applyPreset(activePresetId)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
      {/* 预设选择下拉 */}
      <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          onClick={() => setOpen(!open)}
          title="选择下载方案（同步清晰度、格式、弹幕/字幕等设置）"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            height: '28px', padding: '0 10px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${open ? 'var(--color-accent)' : 'var(--border-subtle)'}`,
            backgroundColor: 'var(--surface-default)',
            color: 'var(--text-secondary)',
            fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          方案: <span style={{ color: activePresetId ? 'var(--color-accent)' : 'var(--text-secondary)', fontWeight: activePresetId ? 600 : 400 }}>{activeName}</span>
          <CaretDown size={10} weight="bold" style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: '4px',
            minWidth: '160px', padding: '4px',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)',
            backgroundColor: '#1a1a2e', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', gap: '1px',
          }}>
            <PresetQuickOption label="默认" isActive={!activePresetId} onClick={() => { applyPreset(null); setOpen(false) }} />
            {presets.map((p) => (
              <PresetQuickOption key={p.id} label={p.name} isActive={p.id === activePresetId} onClick={() => { applyPreset(p.id); setOpen(false) }} />
            ))}
          </div>
        )}
      </div>

      {/* 同步按钮 */}
      <button
        onClick={handleSync}
        title="同步设置：将当前方案的清晰度、格式、弹幕/字幕等设置应用到下载页"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          height: '28px', padding: '0 8px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-default)',
          color: 'var(--text-tertiary)',
          fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
      >
        🔄 同步
      </button>
    </div>
  )
}

function PresetQuickOption({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '30px', padding: '0 10px', borderRadius: '6px',
        border: 'none', backgroundColor: isActive ? 'var(--color-accent-muted)' : 'transparent',
        color: isActive ? 'var(--color-accent)' : '#e0e0e0',
        fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
        fontWeight: isActive ? 600 : 400,
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span>{label}</span>
      {isActive && <span style={{ fontSize: '10px', opacity: 0.6 }}>●</span>}
    </button>
  )
}

function EmptyParseState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6t mt-16t"
      style={{ color: 'var(--text-tertiary)' }}
    >
      <div className="flex flex-col items-center gap-4t">
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'var(--surface-default)',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <DownloadSimple size={32} weight="light" />
        </div>
        <div className="text-center">
          <p style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-secondary)', fontWeight: 500 }}>
            粘贴 B 站链接开始解析
          </p>
          <p className="mt-2t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
            支持 BV 号 · av 号 · ep/ss 番剧 · b23.tv 短链 · 收藏夹 · 合集批量导入
          </p>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="flex gap-3t">
        {[
          { icon: <MonitorPlay size={20} weight="regular" />, label: '高清下载', desc: '4K / 1080P60' },
          { icon: <Stack size={20} weight="regular" />, label: '多 P 拆分', desc: '每 P 独立下载' },
          { icon: <FilmSlate size={20} weight="regular" />, label: '批量队列', desc: '番剧 · 收藏夹' },
          { icon: <Subtitles size={20} weight="regular" />, label: '弹幕字幕', desc: '.xml + .srt' },
          { icon: <QrCode size={20} weight="regular" />, label: '扫码登录', desc: '解锁高清画质' },
        ].map((f) => (
          <div key={f.label}
            className="flex flex-col items-center gap-2t px-5t py-4t rounded-xl"
            style={{
              backgroundColor: 'var(--surface-default)',
              border: '1px solid var(--border-subtle)',
              minWidth: '140px',
            }}
          >
            <div style={{ color: 'var(--color-accent)', opacity: 0.7 }}>{f.icon}</div>
            <div className="text-center">
              <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>{f.label}</p>
              <p className="mt-0.5" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Parsing state ── */

function ParsingState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3t mt-16t"
      style={{ color: 'var(--text-tertiary)' }}
    >
      <Spinner size={28} weight="regular" className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>
        正在解析链接...
      </p>
    </div>
  )
}

/* ── Login hint above InputBar ── */

function LoginHint({ onLoginClick }: { onLoginClick: () => void }) {
  const loginName = useUserPrefsStore((s) => s.loginName)
  if (loginName) return null
  return (
    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', textAlign: 'right' }}>
      <span
        onClick={onLoginClick}
        role="button"
        style={{
          cursor: 'pointer',
          color: 'var(--color-accent)',
          fontWeight: 500,
        }}
      >
        登录
      </span>
      <span> 后解锁高清画质 · 未登录仅 480P</span>
    </div>
  )
}

