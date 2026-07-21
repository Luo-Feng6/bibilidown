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
import { useFfmpegStore } from './stores/ffmpegStore'
import FfmpegBanner from './components/FfmpegBanner'
import { Info, DownloadSimple, Spinner } from '@phosphor-icons/react'
import { useNavigationStore } from './stores/navigationStore'
import { useToastStore } from './stores/toastStore'
import { startDownloadManager, stopDownloadManager } from './services/download-manager'
import { setGlobalCookie, refreshCookie, loadMoreMediaList, resolveCidForBvid, parseBilibiliUrl, validateCookie } from './services/bilibili-api'

function generateDownloadId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const theme = useUserPrefsStore((s) => s.theme)
  const { currentView, navigate } = useNavigationStore()
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)

  /* ── Download store ── */
  const downloadItems = useDownloadStore((s) => s.items)
  const {
    addItem,
    pauseItem,
    resumeItem,
    cancelItem,
    retryItem,
    clearCompleted,
  } = useDownloadStore((s) => ({
    addItem: s.addItem,
    pauseItem: s.pauseItem,
    resumeItem: s.resumeItem,
    cancelItem: s.cancelItem,
    retryItem: s.retryItem,
    clearCompleted: s.clearCompleted,
  }))

  /* ── Parse store ── */
  const { videos, status: parseStatus, mlId, mlTotalCount, isLoadingMore } = useParseStore()

  /* ── ml 分页状态 ── */
  const mlHasMore = mlId != null && videos.length < mlTotalCount

  /* Download items now come from real parse + "加入下载队列" flow.
   * No more demo seed data — empty panel shows guidance. */

  /* ── Initialize cookie from persisted store ── */
  useEffect(() => {
    async function initCookie() {
      const cookieStr = useUserPrefsStore.getState().cookieStr
      if (!cookieStr) return

      setGlobalCookie(cookieStr)

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
      cid = await resolveCidForBvid(video.bvid)
      if (cid == null) {
        useToastStore.getState().error(`无法获取 ${video.title} 的视频信息，请重试`)
        return
      }
    }

    const item: DownloadItemData = {
      id: generateDownloadId(),
      title: video.title,
      quality: quality.label,
      format: 'mp4',
      totalSize: quality.size,
      downloadedSize: '0MB',
      progress: 0,
      speed: '等待中',
      eta: '',
      status: 'queued',
      bvid: video.bvid,
      cid,
    }
    addItem(item)
  }

  /* ── "批量加入下载队列" handler ── */
  const handleBatchAddToQueue = async (episodes: ParsedVideo[], quality: QualityOption) => {
    // 懒解析所有缺失的 cid（ml 收藏夹场景）
    const needCid = episodes.filter((ep) => ep.cid == null && ep.bvid)
    if (needCid.length > 0) {
      const results = await Promise.allSettled(
        needCid.map((ep) => resolveCidForBvid(ep.bvid!))
      )
      // 将解析到的 cid 写回对应 episode
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value != null) {
          needCid[i].cid = r.value
        }
      })
    }

    let added = 0
    let skipped = 0

    for (const ep of episodes) {
      if (ep.cid == null && ep.bvid == null) {
        skipped++
        continue
      }
      // 有 bvid 但 cid 仍为 null（API 解析失败）
      if (ep.cid == null) {
        skipped++
        continue
      }

      const item: DownloadItemData = {
        id: generateDownloadId(),
        title: ep.title,
        quality: quality.label,
        format: 'mp4',
        totalSize: quality.size,
        downloadedSize: '0MB',
        progress: 0,
        speed: '等待中',
        eta: '',
        status: 'queued',
        bvid: ep.bvid,
        cid: ep.cid,
      }
      addItem(item)
      added++
    }

    if (added > 0) {
      useToastStore.getState().success(`已添加 ${added} 个视频到下载队列`)
    }
    if (skipped > 0) {
      useToastStore.getState().warning(`${skipped} 个视频无法获取下载信息，已跳过`)
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

              {/* Input Bar */}
              <div className="px-8t pt-6t pb-4t">
                <InputBar />
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
                        hasMore={mlHasMore}
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
                          onAddToQueue={(quality) => handleAddToQueue(video, quality)}
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
            onPause={pauseItem}
            onResume={resumeItem}
            onCancel={cancelItem}
            onRetry={retryItem}
            onClearCompleted={clearCompleted}
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

/* ── Empty parse state ── */

function EmptyParseState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4t mt-16t"
      style={{ color: 'var(--text-tertiary)' }}
    >
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
        <p className="mt-2t" style={{ fontSize: 'var(--text-caption)', lineHeight: 'var(--text-caption-lh)' }}>
          支持: BV号 · av号 · ep/ss番剧 · b23.tv短链
        </p>
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

/* ── About page (inline, simple) ── */

function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto px-8t py-6t">
      <div className="flex items-center gap-3t mb-6t">
        <Info size={24} weight="regular" style={{ color: 'var(--color-accent)' }} />
        <h1
          className="font-display"
          style={{
            fontSize: 'var(--text-heading)',
            lineHeight: 'var(--text-heading-lh)',
            color: 'var(--text-primary)',
          }}
        >
          关于
        </h1>
      </div>

      <div
        className="p-4t"
        style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-default)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg mb-3t"
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--brand-pink)',
            color: '#fff',
            fontSize: '28px',
            fontWeight: 700,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          B
        </div>
        <p style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)', fontWeight: 600 }}>
          BilibiliDown v7.0.0
        </p>
        <p className="mt-2t" style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--text-body-sm-lh)' }}>
          B 站视频下载工具 · 基于 Electron + React + TypeScript + Tailwind CSS
        </p>
        <p className="mt-1t" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
          图标: Phosphor Icons · 字体: Segoe UI Variable · 设计: Windows 11 Fluent Design
        </p>
      </div>
    </div>
  )
}
