/**
 * DownloadManager — 下载引擎
 *
 * 负责：
 *   1. 监听 downloadStore 中的 queued 项
 *   2. 解析真实下载链接（调用 resolveDownloadUrl）
 *   3. 流式下载并实时更新进度
 *   4. 管理并发下载数（受 userPrefsStore.maxConcurrent 控制）
 *   5. Electron 模式: IPC 文件写入 + FFmpeg 合并
 *   6. 浏览器模式: Blob + <a>.click() 兜底
 *
 * 参考: nicelee.ui.thread.DownloadRunnable + DownloadExecutors
 */

import { useDownloadStore } from '../stores/downloadStore'
import { useUserPrefsStore } from '../stores/userPrefsStore'
import { useParseStore } from '../stores/parseStore'
import { useToastStore } from '../stores/toastStore'
import { useHistoryStore } from '../stores/historyStore'
import { resolveDownloadUrl, QN_LABEL_MAP, fetchDanmaku, fetchSubtitle } from './bilibili-api'
import { showDownloadChoice } from './dialog-service'
import type { DownloadItemData } from '../components/DownloadItem'

/* ── Augment ElectronAPI for features not yet in electron.d.ts ── */
declare global {
  interface ElectronAPI {
    /** Save plain text content to a file on disk. */
    saveTextFile(path: string, content: string): Promise<{ success: boolean; error?: string }>
  }
}

/* ── 内部状态 ── */

/** 正在下载的任务 Map: downloadItem.id → AbortController */
const activeDownloads = new Map<string, AbortController>()

/** 是否正在运行 */
let isRunning = false

/** polling 定时器 */
let pollTimer: ReturnType<typeof setInterval> | null = null

/** store 订阅清理函数 */
let unsubStore: (() => void) | null = null

/* ── 平台检测 ── */

import { isElectron } from '../utils/env'

/* ── 托盘状态更新 ── */

/** 上一次的下载状态快照，用于检测"全部完成"事件 */
let prevDownloadSnapshot = { active: 0, completed: 0, total: 0, allDone: false }

/**
 * 从 downloadStore 读取当前状态并推送到系统托盘。
 */
function updateTrayFromStore(): void {
  if (!isElectron()) return

  const items = useDownloadStore.getState().items
  const stats = {
    active: items.filter((d) => d.status === 'downloading' || d.status === 'queued').length,
    completed: items.filter((d) => d.status === 'completed').length,
    total: items.length,
  }

  window.electronAPI!.updateTrayStats(stats)

  // 检测"全部完成"——之前有活跃任务，现在全部完成
  const justFinished = prevDownloadSnapshot.active > 0 && stats.active === 0 && stats.total > 0
  if (justFinished && !prevDownloadSnapshot.allDone) {
    const failed = items.filter((d) => d.status === 'failed').length
    const body = failed > 0
      ? `${stats.completed} 个完成, ${failed} 个失败`
      : `全部 ${stats.completed} 个视频下载完成`
    window.electronAPI!.sendTrayNotification({
      title: 'BibiliDown',
      body,
    })
  }

  prevDownloadSnapshot = { ...stats, allDone: justFinished || prevDownloadSnapshot.allDone }

  // 如果队列清空（所有 task 被清除），重置快照
  if (stats.total === 0) {
    prevDownloadSnapshot = { active: 0, completed: 0, total: 0, allDone: false }
  }
}

/* ── 工具 ── */

function qualityLabelToQn(label: string): number {
  for (const [qn, l] of Object.entries(QN_LABEL_MAP)) {
    if (l === label) return Number(qn)
  }
  return 80 // 默认 1080P
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`
  return `${bytes} B`
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`
  if (bytesPerSec >= 1e3) return `${(bytesPerSec / 1e3).toFixed(0)} KB/s`
  return `${bytesPerSec} B/s`
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return ''
  if (seconds >= 3600) return `剩余 ${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`
  if (seconds >= 60) return `剩余 ${Math.floor(seconds / 60)}m${seconds % 60}s`
  return `剩余 ${seconds}s`
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_')
}

/**
 * 根据用户设定的文件名模板生成文件名。
 *
 * 支持的占位符:
 *   {title}   — 视频标题
 *   {bvid}    — BV 号
 *   {quality} — 清晰度标签
 *   {up}      — UP主名称（从 parseStore 中匹配）
 *   {date}    — 当前日期 YYYY-MM-DD
 *   {time}    — 当前时间 HHMMSS
 *   {format}  — 输出格式（MP4 / M4A 等）
 *   {mode}    — 下载模式（仅视频 / 仅音频 / 合并 等）
 *
 * @param template 用户设定的模板字符串（如 "{title}_{quality}"）
 * @param item     当前下载项数据
 * @returns 替换占位符后的文件名（未 sanitize）
 */
function applyFilenameTemplate(template: string, item: DownloadItemData): string {
  if (!template || typeof template !== 'string' || template.trim().length === 0) {
    return `${item.title}_${item.quality}`
  }

  // 查找 UP 主名称：从 parseStore 中匹配 bvid
  let upName = ''
  if (item.bvid) {
    const videos = useParseStore.getState().videos
    const matched = videos.find((v) => v.bvid === item.bvid || v.id === item.id)
    upName = matched?.upName ?? ''
  }

  // 当前日期 YYYY-MM-DD
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 下载模式中文标签
  const modeLabels: Record<string, string> = {
    'video-only': '仅视频', 'audio-only': '仅音频', 'separate': '分别下载', 'merge': '合并', 'auto': '自动',
  }
  const modeLabel = modeLabels[item.downloadMode ?? ''] ?? ''

  // 时间 HHmmss
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

  let result = template
    .replace(/\{title\}/g, item.title)
    .replace(/\{bvid\}/g, item.bvid ?? '')
    .replace(/\{quality\}/g, item.quality)
    .replace(/\{up\}/g, upName)
    .replace(/\{date\}/g, dateStr)
    .replace(/\{time\}/g, timeStr)
    .replace(/\{format\}/g, item.format ?? '')
    .replace(/\{mode\}/g, modeLabel)

  // 如果模板替换后结果为空或与模板相同（没有任何占位符被替换），回退
  if (!result.trim() || result === template) {
    return `${item.title}_${item.quality}`
  }

  return result
}

/**
 * 将完成的下载记录到历史。
 */
function recordToHistory(item: DownloadItemData, status: 'completed' | 'failed', errorMessage?: string): void {
  useHistoryStore.getState().addEntry({
    id: item.id,
    title: item.title,
    bvid: item.bvid,
    inputUrl: item.inputUrl,
    quality: item.quality,
    format: item.format,
    size: item.totalSize,
    downloadedAt: Date.now(),
    status,
    errorMessage,
  })
}

/* ── 浏览器模式: 流式下载到 Blob ── */

/**
 * 用 fetch + ReadableStream 下载文件，并通过回调报告进度。
 * 返回 Blob。
 */
async function downloadWithProgress(
  url: string,
  referer: string,
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  const res = await fetch(url, {
    headers: {
      Referer: referer,
      Origin: 'https://www.bilibili.com',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal,
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const contentLength = Number(res.headers.get('content-length') ?? '0')
  const reader = res.body?.getReader()
  if (!reader) {
    onProgress(contentLength, contentLength)
    return res.blob()
  }

  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress(loaded, contentLength || loaded)
  }

  return new Blob(chunks as BlobPart[])
}

/* ── 浏览器模式: 保存到磁盘 ── */

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(downloadUrl)
}

/**
 * 通过 Blob + <a download> 触发文本文件下载。
 * 用于浏览器模式下的弹幕 (XML) 和字幕 (SRT) 下载。
 */
function triggerTextDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── 核心下载处理 ── */

/**
 * 处理单个下载任务。
 */
async function processDownload(item: DownloadItemData): Promise<void> {
  const store = useDownloadStore.getState()
  const id = item.id
  const maxRetries = useUserPrefsStore.getState().maxRetries || 3

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 创建 AbortController（每次尝试新建）
    const controller = new AbortController()
    activeDownloads.set(id, controller)

    try {
      // 非首次尝试：显示重试状态
      if (attempt > 0) {
        store.updateItem(id, {
          speed: `重试中 (${attempt + 1}/${maxRetries})...`,
        })
      }

      const qn = qualityLabelToQn(item.quality)
      const bvid = item.bvid
      const cid = item.cid

      if (!bvid || !cid) {
        store.updateItem(id, {
          status: 'failed',
          errorMessage: '缺少视频标识（bvid/cid），无法下载。请重新解析视频。',
        })
        return
      }

      // Step 1: 标记 downloading + 解析链接
      store.updateItem(id, {
        status: 'downloading',
        progress: 0,
        speed: attempt > 0 ? `重试中 (${attempt + 1}/${maxRetries})...` : '解析链接中...',
        eta: '',
      })

      const urlResult = await resolveDownloadUrl(bvid, String(cid), qn)

      // 更新清晰度（实际获取到的可能不同）
      const actualQualityLabel = QN_LABEL_MAP[urlResult.quality] ?? item.quality

      store.updateItem(id, {
        quality: actualQualityLabel,
        totalSize: '获取中...',
        speed: '下载中...',
        eta: '',
      })

      const referer = `https://www.bilibili.com/video/${bvid}`

      if (isElectron()) {
        // ═══ Electron 模式: IPC 写入磁盘 + FFmpeg 合并 ═══
        await processDownloadElectron(item, urlResult, bvid, cid, referer, controller)
      } else {
        // ═══ 浏览器模式: Blob + <a>.click() ═══
        await processDownloadBrowser(item, urlResult, referer, controller)
      }

      // 成功 — 退出函数
      return
    } catch (err: any) {
      lastError = err

      // 用户取消 — 不重试
      if (err.name === 'AbortError') {
        return
      }

      const msg = err.message || ''

      // 鉴权错误 (401/403) — 不重试
      if (msg.includes('401') || msg.includes('403')) {
        break
      }

      // 只重试网络错误，不重试其他错误（如 FFmpeg 合并失败）
      const isNetworkError =
        err instanceof TypeError ||
        msg.includes('fetch failed') ||
        msg.includes('NetworkError') ||
        msg.includes('Failed to fetch')

      if (!isNetworkError) {
        break
      }

      // 还剩重试次数：等待后继续
      if (attempt < maxRetries - 1) {
        store.updateItem(id, {
          speed: `重试中 (${attempt + 1}/${maxRetries})...`,
        })
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      // 最后一次尝试也失败了
      break
    } finally {
      activeDownloads.delete(id)
    }
  }

  // 所有重试已耗尽
  const errorMsg = lastError?.message || '下载失败'
  store.updateItem(id, {
    status: 'failed',
    errorMessage: errorMsg,
    speed: '',
    eta: '',
  })

  useToastStore.getState().error(`下载失败: ${item.title} — ${errorMsg}`)
  console.error(`[DownloadManager] 失败: ${item.title}`, lastError)
  recordToHistory(item, 'failed', errorMsg)
}

/**
 * Electron 模式下载流程:
 *   1. 下载视频流 → temp .m4s
 *   2. 下载音频流 → temp .m4s
 *   3. 显示保存对话框
 *   4. FFmpeg 合并 → 最终 .mp4
 */
async function processDownloadElectron(
  item: DownloadItemData,
  urlResult: Awaited<ReturnType<typeof resolveDownloadUrl>>,
  bvid: string,
  cid: number,
  referer: string,
  controller: AbortController
): Promise<void> {
  const store = useDownloadStore.getState()
  const id = item.id
  const api = window.electronAPI!

  // 获取 temp 目录
  const tempDir = await api.getTempDir()
  const fileNameTemplate = useUserPrefsStore.getState().filenameTemplate
  const safeName = sanitizeFileName(applyFilenameTemplate(fileNameTemplate, item))
  const prefs = useUserPrefsStore.getState()
  const videoExt = prefs.preferredFormat === 'm4s' ? 'm4s' : 'mp4'
  const audioFormat = prefs.preferredAudioFormat || 'm4a'
  const audioExt = audioFormat === 'm4s' ? 'm4s' : audioFormat === 'mp3' ? 'mp3' : 'm4a'
  const videoTempPath = `${tempDir}/${item.id}_video.m4s`
  const audioTempPath = `${tempDir}/${item.id}_audio.m4s`

  // 跟踪两个流的下载进度
  let videoProgress = { downloaded: 0, total: 0, speed: 0 }
  let audioProgress = { downloaded: 0, total: 0, speed: 0 }
  const speedHistory: number[] = []
  let lastProgressUpdate = 0

  // 注册进度监听器（在任何下载开始之前）
  // 消费主进程发出的 download:progress 事件，实时更新进度条、速度和 speedHistory
  const cleanupProgress = api.onDownloadProgress((data) => {
    if (data.filePath === videoTempPath) {
      videoProgress = { downloaded: data.downloadedSize, total: data.totalSize, speed: data.speed }
    } else if (data.filePath === audioTempPath) {
      audioProgress = { downloaded: data.downloadedSize, total: data.totalSize, speed: data.speed }
    }

    const combinedDownloaded = videoProgress.downloaded + audioProgress.downloaded
    const combinedTotal = videoProgress.total + audioProgress.total
    const combinedSpeed = videoProgress.speed + audioProgress.speed

    // 限制 store 更新频率（~200ms），避免并行双流时过度刷新
    const now = Date.now()
    if (now - lastProgressUpdate < 200) return
    lastProgressUpdate = now

    if (combinedTotal > 0) {
      speedHistory.push(combinedSpeed / 1e6)
      if (speedHistory.length > 20) speedHistory.shift()

      const progress = Math.round((combinedDownloaded / combinedTotal) * 100)
      const eta = combinedSpeed > 0 ? formatEta(Math.round((combinedTotal - combinedDownloaded) / combinedSpeed)) : ''

      store.updateItem(id, {
        progress: Math.min(progress, 99),
        downloadedSize: formatSize(combinedDownloaded),
        totalSize: formatSize(combinedTotal),
        speed: combinedSpeed > 0 ? formatSpeed(combinedSpeed) : '下载中...',
        eta,
        speedHistory: [...speedHistory],
      })
    }
  })

  try {
    let videoResult: SaveToDiskResult | null = null
    let audioResult: SaveToDiskResult | null = null

    // Phase 1+2: 根据下载模式决定下载哪些流
    const mode = item.downloadMode || 'auto'
    const wantVideo = mode !== 'audio-only' && !!urlResult.videoUrl
    const wantAudio = (mode === 'auto' || mode === 'separate' || mode === 'merge') && !!urlResult.audioUrl
    // 'auto'/'merge' 模式下有音频就合并，否则只下载视频

    type DownloadTask = Promise<{ type: 'video' | 'audio'; result: SaveToDiskResult }>
    const downloads: DownloadTask[] = []

    if (wantVideo) {
      downloads.push(
        api.saveToDisk({
          url: urlResult.videoUrl!,
          filePath: videoTempPath,
          referer,
          headers: { Cookie: (useUserPrefsStore.getState().cookieStr) },
        }).then((result) => ({ type: 'video' as const, result }))
      )
    }

    if (wantAudio) {
      downloads.push(
        api.saveToDisk({
          url: urlResult.audioUrl!,
          filePath: audioTempPath,
          referer,
          headers: { Cookie: (useUserPrefsStore.getState().cookieStr) },
        }).then((result) => ({ type: 'audio' as const, result }))
      )
    }

    store.updateItem(id, { speed: '下载中...' })

    // 等待所有流并行下载完成
    const results = await Promise.all(downloads)

    for (const { type, result } of results) {
      if (type === 'video') {
        videoResult = result
      } else {
        audioResult = result
      }

      if (!result.success) {
        throw new Error(`${type === 'video' ? '视频' : '音频'}流下载失败: ${result.error}`)
      }
    }

    const videoDownloaded = videoResult !== null
    const audioDownloaded = audioResult !== null
    const videoSize = videoResult?.size ?? 0
    const audioSize = audioResult?.size ?? 0
    const totalSize = videoSize + audioSize

    const mergeMode = item.downloadMode || 'auto'
    let finalOutputPath: string | null = null

    // Phase 3: FFmpeg 合并（auto / merge 模式且双流都下载了）
    if (videoDownloaded && audioDownloaded && (mergeMode === 'auto' || mergeMode === 'merge')) {
      store.updateItem(id, {
        progress: 70,
        downloadedSize: formatSize(totalSize),
        totalSize: formatSize(totalSize),
        speed: '合并音视频...',
      })

      // 让用户选择保存路径
      const outputPath = await api.showSaveDialog(
        `${safeName}_${urlResult.quality}P.mp4`
      )

      if (!outputPath) {
        // 用户取消了保存对话框
        store.updateItem(id, {
          status: 'paused',
          speed: '',
          eta: '',
        })
        return
      }

      const mergeResult = await api.mergeWithFfmpeg({
        videoPath: videoTempPath,
        audioPath: audioTempPath,
        outputPath,
      })

      if (!mergeResult.success) {
        throw new Error(mergeResult.error || 'FFmpeg 合并失败')
      }

      // 成功
      finalOutputPath = outputPath
      store.updateItem(id, {
        status: 'completed',
        progress: 100,
        speed: '',
        eta: '',
        downloadedSize: formatSize(totalSize),
        totalSize: formatSize(totalSize),
        savedPath: finalOutputPath,
      })
      useToastStore.getState().success(`下载完成: ${item.title}`)
      recordToHistory(item, 'completed')
    } else if (videoDownloaded) {
      // 只有视频（如 FLV），直接保存到用户选择的位置
      store.updateItem(id, {
        progress: 70,
        downloadedSize: formatSize(totalSize),
        totalSize: formatSize(totalSize),
        speed: '',
      })

      const outputPath = await api.showSaveDialog(
        `${safeName}_${urlResult.quality}P.mp4`
      )

      if (!outputPath) {
        store.updateItem(id, { status: 'paused', speed: '', eta: '' })
        return
      }

      // 将 temp 文件移动到用户选择的最终路径
      await api.moveFile({ from: videoTempPath, to: outputPath })
      finalOutputPath = outputPath

      store.updateItem(id, {
        status: 'completed',
        progress: 100,
        speed: '',
        eta: '',
        downloadedSize: formatSize(totalSize),
        totalSize: formatSize(totalSize),
        savedPath: finalOutputPath,
      })
      useToastStore.getState().success(`下载完成: ${item.title}`)
      recordToHistory(item, 'completed')
    } else if (videoDownloaded && audioDownloaded) {
      // 'separate' 模式：双流分别保存，不合并
      const videoOut = await api.showSaveDialog(`${safeName}_视频.${videoExt}`)
      if (videoOut) await api.moveFile({ from: videoTempPath, to: videoOut })
      const audioOut = await api.showSaveDialog(`${safeName}_音频.${audioExt}`)
      if (audioOut) await api.moveFile({ from: audioTempPath, to: audioOut })
      finalOutputPath = videoOut || audioOut

      store.updateItem(id, {
        status: 'completed', progress: 100, speed: '', eta: '',
        downloadedSize: formatSize(totalSize), totalSize: formatSize(totalSize),
        errorMessage: '音视频分别保存。下次选「自动合并」可合并为一个文件。',
        savedPath: finalOutputPath || undefined,
      })
      useToastStore.getState().success(`下载完成 (视频+音频): ${item.title}`)
      recordToHistory(item, 'completed', '视频+音频(分别)')
    } else if (audioDownloaded && !videoDownloaded) {
      // 'audio-only' 模式：仅音频
      const outputPath = await api.showSaveDialog(`${safeName}.${audioExt}`)
      if (!outputPath) { store.updateItem(id, { status: 'paused', speed: '', eta: '' }); return }
      await api.moveFile({ from: audioTempPath, to: outputPath })
      finalOutputPath = outputPath

      store.updateItem(id, {
        status: 'completed', progress: 100, speed: '', eta: '',
        downloadedSize: formatSize(totalSize), totalSize: formatSize(totalSize),
        savedPath: finalOutputPath,
      })
      useToastStore.getState().success(`下载完成 (仅音频): ${item.title}`)
      recordToHistory(item, 'completed', '仅音频')
    } else {
      // 没下载到任何流
      throw new Error('未获取到任何可下载的流')
    }

    // Post-download: danmaku, subtitle, notify, open folder
    if (finalOutputPath) {
      await handlePostDownloadTasksElectron(item, bvid, cid, finalOutputPath)
    }

    console.log(`[DownloadManager] Electron 完成 (${mergeMode}): ${item.title}`)
  } finally {
    // 确保无论成功失败都清理进度监听器
    cleanupProgress()
  }
}

/**
 * Electron 模式下载后处理：弹幕、字幕、通知、打开文件夹。
 */
async function handlePostDownloadTasksElectron(
  item: DownloadItemData,
  bvid: string,
  cid: number,
  outputPath: string
): Promise<void> {
  const prefs = useUserPrefsStore.getState()
  const api = window.electronAPI!

  // 从输出路径中推导基础路径（去除扩展名）
  const basePath = outputPath.replace(/\.(mp4|m4a|m4s|flv|mkv)$/i, '')

  // 弹幕
  if (prefs.downloadDanmaku) {
    try {
      const xml = await fetchDanmaku(cid)
      if (xml) {
        const danmakuPath = `${basePath}_danmaku.xml`
        await api.saveTextFile(danmakuPath, xml)
        console.log(`[DownloadManager] 弹幕已保存: ${danmakuPath}`)
      }
    } catch (e) {
      console.warn('[DownloadManager] 弹幕下载失败:', e)
    }
  }

  // 字幕
  if (prefs.downloadSubtitle) {
    try {
      const srt = await fetchSubtitle(bvid, cid)
      if (srt) {
        const subtitlePath = `${basePath}_subtitle.srt`
        await api.saveTextFile(subtitlePath, srt)
        console.log(`[DownloadManager] 字幕已保存: ${subtitlePath}`)
      }
    } catch (e) {
      console.warn('[DownloadManager] 字幕下载失败:', e)
    }
  }

  // 下载完成通知
  if (prefs.downloadNotify) {
    try {
      await api.sendTrayNotification({
        title: 'BibiliDown',
        body: `下载完成: ${item.title}`,
      })
    } catch {
      // 通知失败不影响主流程
    }
  }

  // 下载完成后打开文件夹
  if (prefs.openFolderAfterDownload) {
    try {
      const folderPath = outputPath.replace(/[/\\][^/\\]+$/, '')
      await api.openPath(folderPath)
    } catch {
      // 打开文件夹失败不影响主流程
    }
  }
}

/**
 * 浏览器模式下载流程。
 * 浏览器无 FFmpeg，DASH 音视频分离流需要用户选择下载方式。
 * FLV 单流视频也会弹窗让用户确认（避免静默下载的困惑）。
 */
async function processDownloadBrowser(
  item: DownloadItemData,
  urlResult: Awaited<ReturnType<typeof resolveDownloadUrl>>,
  referer: string,
  controller: AbortController
): Promise<void> {
  const store = useDownloadStore.getState()
  const id = item.id
  const fileNameTemplate = useUserPrefsStore.getState().filenameTemplate
  const safeName = sanitizeFileName(applyFilenameTemplate(fileNameTemplate, item))
  const hasVideo = !!urlResult.videoUrl
  const hasAudio = !!urlResult.audioUrl
  const isDash = urlResult.format === 'dash'

  // 如果加入队列时已选好模式，跳过弹窗
  let mode: 'video-only' | 'audio-only' | 'separate' | 'merge' | undefined
  if (item.downloadMode && item.downloadMode !== 'auto') {
    mode = item.downloadMode
  } else {
    mode = await showDownloadChoice({ title: item.title, isDash, hasVideo, hasAudio })
  }
  if (!mode) {
    // 用户取消了弹窗
    store.updateItem(id, { status: 'paused', speed: '已取消', eta: '' })
    return
  }
  store.updateItem(id, { downloadMode: mode })

  // 浏览器模式：'merge' 实际按 'separate' 处理（无法真正合并）
  const effectiveMode = mode === 'merge' ? 'separate' : mode

  // 根据选择决定下载哪些流
  const wantVideo = effectiveMode !== 'audio-only' && hasVideo
  const wantAudio = effectiveMode === 'audio-only' || effectiveMode === 'separate' ? hasAudio : false

  // 使用 downloadWithProgress（ReadableStream 分段读取 + 实时进度）
  const tryDownloadWithFallback = async (primaryUrl: string, backups: string[], filename: string): Promise<Blob | null> => {
    const urls = [primaryUrl, ...backups].filter(Boolean)
    let lastError: any = null

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      try {
        const startTime = Date.now()
        let lastLoaded = 0
        let lastTime = startTime

        if (i > 0) store.updateItem(id, { speed: `切换备用链接 (${i + 1}/${urls.length})...` })
        else store.updateItem(id, { speed: '下载中...' })

        const blob = await downloadWithProgress(
          url,
          referer,
          (loaded, total) => {
            const now = Date.now()
            if (now - lastTime < 200) return

            const elapsed = (now - startTime) / 1000
            const displaySpeed = elapsed > 0 ? loaded / elapsed : 0

            const progress = total > 0 ? Math.round((loaded / total) * 100) : 0
            const eta = displaySpeed > 0 && total > 0
              ? formatEta(Math.round((total - loaded) / displaySpeed))
              : ''

            store.updateItem(id, {
              progress: Math.min(progress, 99),
              speed: formatSpeed(displaySpeed),
              eta,
              downloadedSize: formatSize(loaded),
              totalSize: total > 0 ? formatSize(total) : '获取中...',
            })

            lastLoaded = loaded
            lastTime = now
          },
          controller.signal
        )

        return blob
      } catch (err: any) {
        if (err.name === 'AbortError') throw err
        lastError = err
        console.warn(`[DownloadManager] URL ${i + 1}/${urls.length} 失败: ${filename}`, err.message)
      }
    }

    // 所有 URL 都失败，降级为直接下载
    console.warn(`[DownloadManager] 全部 URL 失败，降级为直接下载: ${filename}`, lastError?.message)
    triggerBrowserDownloadDirect(primaryUrl, filename)
    return null
  }

  // 下载选中流
  let videoBlob: Blob | null = null
  let audioBlob: Blob | null = null

  const videoBackups = urlResult.videoBackups ?? []
  const audioBackups = urlResult.audioBackups ?? []

  const dl: Promise<{ type: string; blob: Blob | null }>[] = []
  if (wantVideo) {
    dl.push(tryDownloadWithFallback(urlResult.videoUrl!, videoBackups, `${safeName}.mp4`).then(b => ({ type: 'video', blob: b })))
  }
  if (wantAudio) {
    dl.push(tryDownloadWithFallback(urlResult.audioUrl!, audioBackups, `${safeName}_audio.m4s`).then(b => ({ type: 'audio', blob: b })))
  }

  const results = await Promise.all(dl)
  videoBlob = results.find(r => r.type === 'video')?.blob ?? null
  audioBlob = results.find(r => r.type === 'audio')?.blob ?? null

  // 输出格式：从设置读取视频/音频格式偏好
  const prefs = useUserPrefsStore.getState()
  const outputFormat = prefs.preferredFormat || 'mp4'
  const videoExt = outputFormat === 'm4s' ? 'm4s' : 'mp4'
  const audioFormat = prefs.preferredAudioFormat || 'm4a'
  const audioExt = audioFormat === 'm4s' ? 'm4s' : audioFormat === 'mp3' ? 'mp3' : 'm4a'

  // 触发浏览器本地保存
  if (videoBlob) {
    triggerBrowserDownload(videoBlob, `${safeName}.${videoExt}`)
  }
  if (audioBlob) {
    triggerBrowserDownload(audioBlob, `${safeName}.${audioExt}`)
  }

  // 状态更新
  const gotAnyBlob = !!(videoBlob || audioBlob)
  store.updateItem(id, {
    status: 'completed',
    progress: 100,
    speed: gotAnyBlob ? '' : '已触发下载',
    eta: '',
    errorMessage: mode === 'separate'
      ? '音视频分别下载。用桌面版可自动合并。'
      : mode === 'merge'
        ? `音视频已分别下载。使用 FFmpeg 合并: ffmpeg -i video.${videoExt} -i audio.${audioExt} -c copy output.mp4`
        : undefined,
    savedPath: `${safeName}.${mode === 'audio-only' ? audioExt : videoExt}`,
  })

  const labelMap: Record<string, string> = { 'video-only': '仅视频', 'audio-only': '仅音频', 'separate': '视频+音频', 'merge': '视频+音频(合并)' }
  const label = labelMap[mode] || '视频'
  if (gotAnyBlob) {
    useToastStore.getState().success(`下载完成 (${label}): ${item.title}`)
  } else {
    useToastStore.getState().info(`已触发下载 (${label}): ${item.title}`)
  }
  console.log(`[DownloadManager] 浏览器完成 (${mode}): ${item.title}`)
  recordToHistory(item, 'completed', mode !== 'video-only' ? label : undefined)

  // Post-download: danmaku & subtitle (browser mode — no system notify or open folder)
  const bvid = item.bvid!
  const cid = item.cid!
  if (prefs.downloadDanmaku) {
    try {
      const xml = await fetchDanmaku(cid)
      if (xml) {
        triggerTextDownload(xml, `${safeName}_danmaku.xml`)
      }
    } catch (e) {
      console.warn('[DownloadManager] 弹幕下载失败:', e)
    }
  }
  if (prefs.downloadSubtitle) {
    try {
      const srt = await fetchSubtitle(bvid, cid)
      if (srt) {
        triggerTextDownload(srt, `${safeName}_subtitle.srt`)
      }
    } catch (e) {
      console.warn('[DownloadManager] 字幕下载失败:', e)
    }
  }
}

/** 通过 <a download> 直接下载 URL（绕过 CORS，无进度） */
function triggerBrowserDownloadDirect(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => document.body.removeChild(a), 1000)
}

/**
 * 检查队列，启动新的下载。
 */
function processQueue(): void {
  const store = useDownloadStore.getState()
  const prefs = useUserPrefsStore.getState()

  const maxConcurrent = prefs.maxConcurrent ?? 3

  // 统计活跃下载数
  const activeCount = store.items.filter(
    (d) => d.status === 'downloading'
  ).length

  // 如果已达上限，跳过
  if (activeCount >= maxConcurrent) return

  // 找第一个 queued 项
  const queued = store.items.find((d) => d.status === 'queued')
  if (!queued) return

  // 启动下载（异步，非阻塞）
  processDownload(queued)
}

/**
 * 启动下载管理器。
 * 开始 polling 队列并自动处理 queued 项。
 */
export function startDownloadManager(): void {
  if (isRunning) return
  isRunning = true

  // 检查 autoStart 设置：如果关闭，不启动下载循环，但 manager 保持初始化
  const autoStart = useUserPrefsStore.getState().autoStart

  if (autoStart) {
    // 立即检查一次
    processQueue()

    // 每秒轮询
    pollTimer = setInterval(() => {
      processQueue()
    }, 1000)
  }

  // 监听 store 变化：当有新 queued 项时，仅 autoStart 开启时才自动处理
  // 始终推送统计到系统托盘
  unsubStore = useDownloadStore.subscribe((state, prev) => {
    const shouldAutoProcess = useUserPrefsStore.getState().autoStart

    const newQueued = state.items.filter(
      (d) => d.status === 'queued' && !prev.items.find((p) => p.id === d.id && p.status === 'queued')
    )
    if (newQueued.length > 0 && shouldAutoProcess) {
      processQueue()
    }

    // 检查是否有 paused 项转为 queued（恢复下载）—— 仅 autoStart 时自动恢复
    const resumed = state.items.filter(
      (d) => d.status === 'queued' && prev.items.find((p) => p.id === d.id && p.status === 'paused')
    )
    if (resumed.length > 0 && shouldAutoProcess) {
      processQueue()
    }

    // 检查是否有下载完成/失败项（释放队列槽位），立即启动下一个
    const justFinished = prev.items.filter(
      (d) => d.status === 'downloading' && !state.items.find((s) => s.id === d.id && s.status === 'downloading')
    )
    if (justFinished.length > 0 && shouldAutoProcess) {
      processQueue()
    }

    // 推送统计到系统托盘
    updateTrayFromStore()
  })

  console.log(`[DownloadManager] 已启动 (autoStart: ${autoStart})`)

  // Initialize tray with current download state
  updateTrayFromStore()
}

/**
 * 停止下载管理器。
 */
export function stopDownloadManager(): void {
  isRunning = false

  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }

  if (unsubStore) {
    unsubStore()
    unsubStore = null
  }

  // 取消所有进行中的下载
  for (const [id, controller] of activeDownloads) {
    controller.abort()
  }
  activeDownloads.clear()

  console.log('[DownloadManager] 已停止')
}

/**
 * 暂停单个下载。
 */
export function pauseDownload(id: string): void {
  const controller = activeDownloads.get(id)
  if (controller) {
    controller.abort()
    activeDownloads.delete(id)
  }
}

/**
 * 取消单个下载。
 */
export function cancelDownload(id: string): void {
  pauseDownload(id)
}
