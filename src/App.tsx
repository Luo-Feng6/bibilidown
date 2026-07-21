import { useEffect, useState } from 'react'
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
import { type DownloadItemData } from './components/DownloadItem'
import type { QualityOption } from './components/QualityChip'
import { useDownloadStore } from './stores/downloadStore'
import { useParseStore, type ParsedVideo } from './stores/parseStore'
import { useUserPrefsStore } from './stores/userPrefsStore'
import { useHistoryStore } from './stores/historyStore'
import { useFfmpegStore } from './stores/ffmpegStore'
import FfmpegBanner from './components/FfmpegBanner'
import { Info, DownloadSimple, Spinner, GithubLogo, Heart, Warning, FilmSlate, Stack, MonitorPlay, Download, Subtitles, QrCode, GearFine, Palette, ClockCounterClockwise } from '@phosphor-icons/react'
import { useNavigationStore } from './stores/navigationStore'
import { useToastStore } from './stores/toastStore'
import { startDownloadManager, stopDownloadManager, showDownloadChoiceDialog } from './services/download-manager'
import { showConfirm } from './services/dialog-service'
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
          const safeName = video.title.replace(/[<>:"/\\|?*]/g, '_')
          downloadMode = await showDownloadChoiceDialog(safeName, true, true, true, video.title)
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
      const safeName = video.title.replace(/[<>:"/\\|?*]/g, '_')
      downloadMode = await showDownloadChoiceDialog(safeName, true, true, true, video.title)
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
      const safeName = episodes[0].title.replace(/[<>:"/\\|?*]/g, '_')
      downloadMode = await showDownloadChoiceDialog(safeName, true, true, true, episodes[0].title)
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
            支持 BV 号 · av 号 · ep/ss 番剧 · b23.tv 短链 · 收藏夹批量导入
          </p>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="flex gap-3t">
        {[
          { icon: <MonitorPlay size={20} weight="regular" />, label: '高清下载', desc: '4K / 1080P60' },
          { icon: <Stack size={20} weight="regular" />, label: '多 P 拆分', desc: '每 P 独立下载' },
          { icon: <FilmSlate size={20} weight="regular" />, label: '批量队列', desc: '番剧 · 收藏夹' },
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

/* ── About page ── */

function AboutPage() {
  const electronVersion = navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1]
  const chromeVersion = navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1]
  const isElectron = !!electronVersion

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-8t pt-10t pb-8t text-center"
        style={{
          background: `linear-gradient(180deg, var(--color-accent-muted) 0%, transparent 100%)`,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
        {/* App icon */}
        <div className="flex justify-center mb-5t">
          <img src="/favicon.svg" alt="BibiliDown"
            style={{
              width: '80px', height: '80px',
              filter: 'drop-shadow(0 8px 32px rgba(251,114,153,0.35))',
            }} />
        </div>

        <h1 className="flex items-center justify-center gap-3t" style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          BibiliDown
          <span className="font-mono" style={{
            fontSize: 'var(--text-body-sm)',
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-accent-text)',
            fontWeight: 600,
          }}>v7.2.0</span>
        </h1>

        {isElectron && (
          <p className="mt-1t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
            Electron {electronVersion}
          </p>
        )}

        <p className="mt-3t" style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '8px auto 0' }}>
          B 站视频下载工具 · 支持高清下载、多 P 拆分、FFmpeg 合并、弹幕字幕、批量队列、扫码登录、暗色主题
        </p>

        {/* Tech stack pills */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-5t">
          {['Electron', 'React 18', 'TypeScript', 'Tailwind', 'Zustand 5', 'Vite 5'].map((t) => (
            <span key={t} style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-default)', color: 'var(--text-tertiary)',
              border: '1px solid var(--border-subtle)', fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div className="px-8t py-6t mx-auto" style={{ maxWidth: '600px' }}>
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
          <FeatureCard icon={<ClockCounterClockwise size={18} />} label="历史记录" desc="自动记录，支持导入 / 导出" />
        </div>

        {/* ── Changelog (collapsible) ── */}
        <CollapsibleCard title="更新日志" icon={<Info size={14} />} defaultOpen={false}>
          <div style={{ position: 'relative', padding: '12px 16px 8px 44px' }}>
            <div style={{ position: 'absolute', left: '21px', top: '20px', bottom: '20px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />
            <TimelineEntry version="v7.2.0" date="2026-07-22" latest>
              暗色主题全面修复 · 5 色主题选择器 · Electron 双流并行 · 历史导入导出 · 设置页改版
            </TimelineEntry>
            <TimelineEntry version="v7.1.0" date="2026-07-15">
              FFmpeg 自动下载与检测 · 极验验证码 · 多 P 视频拆分 · 分页 API 泛型化
            </TimelineEntry>
            <TimelineEntry version="v7.0.0" date="2026-07-01">
              Java Swing → Electron + React + TS 全面重写 · Fluent Design · 三种登录方式 · 批量下载
            </TimelineEntry>
          </div>
        </CollapsibleCard>

        {/* ── System & Credits (collapsible) ── */}
        <CollapsibleCard title="系统 & 致谢" icon={<GithubLogo size={14} />} defaultOpen={false}>
          <div className="px-4t py-3t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
            {isElectron ? (
              <div className="flex flex-wrap gap-x-5t gap-y-1t mb-2t">
                <span>Electron {electronVersion}</span>
                {chromeVersion && <span>Chromium {chromeVersion}</span>}
                <span>{navigator.platform}</span>
              </div>
            ) : (
              <p className="mb-2t">浏览器开发模式</p>
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
              提交 Issue 时请附上版本号、系统信息和错误日志，会更快定位问题。
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

/* ── About sub-components ── */

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2t mb-3t" style={{ color: 'var(--text-tertiary)' }}>
      {icon}
      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{text}</span>
    </div>
  )
}

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

function TimelineEntry({ version, date, children, latest }: { version: string; date: string; children: React.ReactNode; latest?: boolean }) {
  return (
    <div className="pb-4t" style={{ position: 'relative' }}>
      {/* Dot */}
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

function CollapsibleCard({ title, icon, defaultOpen, children }: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-default)', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4t py-3t transition-colors duration-fast"
        style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-overlay)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <div className="flex items-center gap-2.5t" style={{ color: 'var(--text-secondary)' }}>
          {icon}
          <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 500 }}>{title}</span>
        </div>
        <span style={{
          fontSize: '11px', color: 'var(--text-tertiary)',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 150ms var(--ease-out)',
        }}>▶</span>
      </button>
      {open && <div style={{ borderTop: '1px solid var(--border-subtle)' }}>{children}</div>}
    </div>
  )
}
