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
import { useToastStore } from '../stores/toastStore'
import { useHistoryStore } from '../stores/historyStore'
import { resolveDownloadUrl, QN_LABEL_MAP } from './bilibili-api'
import type { DownloadItemData } from '../components/DownloadItem'

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

/** 是否运行在 Electron 环境 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI
}

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
      title: 'BilibiliDown',
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

const QN_TO_LABEL: Record<number, string> = {
  127: '8K', 126: '杜比视界', 125: 'HDR', 120: '4K',
  116: '1080P60', 112: '1080P+', 80: '1080P', 74: '720P60',
  64: '720P', 32: '480P', 16: '360P', 6: '240P',
}

function qualityLabelToQn(label: string): number {
  for (const [qn, l] of Object.entries(QN_TO_LABEL)) {
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
 * 将完成的下载记录到历史。
 */
function recordToHistory(item: DownloadItemData, status: 'completed' | 'failed', errorMessage?: string): void {
  useHistoryStore.getState().addEntry({
    id: item.id,
    title: item.title,
    bvid: item.bvid,
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

/* ── 核心下载处理 ── */

/**
 * 处理单个下载任务。
 */
async function processDownload(item: DownloadItemData): Promise<void> {
  const store = useDownloadStore.getState()
  const id = item.id

  // 创建 AbortController
  const controller = new AbortController()
  activeDownloads.set(id, controller)

  try {
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
      speed: '解析链接中...',
      eta: '',
    })

    const urlResult = await resolveDownloadUrl(bvid, String(cid), qn)

    // 更新清晰度（实际获取到的可能不同）
    const actualQualityLabel = QN_TO_LABEL[urlResult.quality] ?? item.quality

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
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return
    }

    const errorMsg = err.message || '下载失败'
    store.updateItem(id, {
      status: 'failed',
      errorMessage: errorMsg,
      speed: '',
      eta: '',
    })

    useToastStore.getState().error(`下载失败: ${item.title} — ${errorMsg}`)
    console.error(`[DownloadManager] 失败: ${item.title}`, err)
    recordToHistory(item, 'failed', errorMsg)
  } finally {
    activeDownloads.delete(id)
  }
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
  const safeName = sanitizeFileName(item.title)
  const videoTempPath = `${tempDir}/${item.id}_video.m4s`
  const audioTempPath = `${tempDir}/${item.id}_audio.m4s`

  let videoDownloaded = false
  let audioDownloaded = false
  let videoSize = 0
  let audioSize = 0
  let totalSize = 0
  const speedHistory: number[] = []

  // Phase 1: 下载视频流
  if (urlResult.videoUrl) {
    store.updateItem(id, { speed: '下载视频流...' })

    const result = await api.saveToDisk({
      url: urlResult.videoUrl,
      filePath: videoTempPath,
      referer,
    })

    if (!result.success) {
      throw new Error(`视频流下载失败: ${result.error}`)
    }

    videoDownloaded = true
    videoSize = result.size

    store.updateItem(id, {
      progress: 50,
      downloadedSize: formatSize(result.size),
      totalSize: '获取中...',
      speed: '',
    })
  }

  // Phase 2: 下载音频流
  if (urlResult.audioUrl) {
    store.updateItem(id, { speed: '下载音频流...' })

    const result = await api.saveToDisk({
      url: urlResult.audioUrl,
      filePath: audioTempPath,
      referer,
    })

    if (!result.success) {
      throw new Error(`音频流下载失败: ${result.error}`)
    }

    audioDownloaded = true
    audioSize = result.size
    totalSize = videoSize + audioSize

    store.updateItem(id, {
      progress: 70,
      downloadedSize: formatSize(totalSize),
      speed: '',
    })
  } else {
    // 无分离音频（如 FLV）
    totalSize = videoSize
  }

  // Phase 3: FFmpeg 合并（如果需要）
  if (videoDownloaded && audioDownloaded) {
    store.updateItem(id, { speed: '合并音视频...' })

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
    store.updateItem(id, {
      status: 'completed',
      progress: 100,
      speed: '',
      eta: '',
      downloadedSize: formatSize(totalSize),
      totalSize: formatSize(totalSize),
    })
    useToastStore.getState().success(`下载完成: ${item.title}`)
    recordToHistory(item, 'completed')
  } else if (videoDownloaded) {
    // 只有视频（如 FLV），直接保存到用户选择的位置
    const outputPath = await api.showSaveDialog(
      `${safeName}_${urlResult.quality}P.mp4`
    )

    if (!outputPath) {
      store.updateItem(id, { status: 'paused', speed: '', eta: '' })
      return
    }

    // 将 temp 文件移动到用户选择的最终路径
    await api.moveFile({ from: videoTempPath, to: outputPath })

    store.updateItem(id, {
      status: 'completed',
      progress: 100,
      speed: '',
      eta: '',
      downloadedSize: formatSize(totalSize),
      totalSize: formatSize(totalSize),
    })
    useToastStore.getState().success(`下载完成: ${item.title}`)
    recordToHistory(item, 'completed')
  }

  console.log(`[DownloadManager] Electron 完成: ${item.title}`)
}

/**
 * 浏览器模式下载流程。
 * 使用 Blob + <a>.click() 触发浏览器下载。
 */
async function processDownloadBrowser(
  item: DownloadItemData,
  urlResult: Awaited<ReturnType<typeof resolveDownloadUrl>>,
  referer: string,
  controller: AbortController
): Promise<void> {
  const store = useDownloadStore.getState()
  const id = item.id
  const safeName = sanitizeFileName(item.title)

  let lastLoaded = 0
  let lastTime = Date.now()
  const speedHistory: number[] = []

  // 下载视频流
  if (urlResult.videoUrl) {
    const videoBlob = await downloadWithProgress(
      urlResult.videoUrl,
      referer,
      (loaded, total) => {
        const now = Date.now()
        const elapsed = (now - lastTime) / 1000
        if (elapsed >= 0.5) {
          const speed = (loaded - lastLoaded) / elapsed
          lastLoaded = loaded
          lastTime = now
          speedHistory.push(speed / 1e6)
          if (speedHistory.length > 20) speedHistory.shift()

          const progress = total > 0 ? Math.round((loaded / total) * 100) : 0
          const eta = speed > 0 ? formatEta(Math.round((total - loaded) / speed)) : ''

          store.updateItem(id, {
            progress: Math.min(progress, 99),
            downloadedSize: formatSize(loaded),
            totalSize: formatSize(total),
            speed: formatSpeed(speed),
            eta,
            speedHistory: [...speedHistory],
          })
        }
      },
      controller.signal
    )

    // 触发浏览器下载
    if (urlResult.format === 'flv') {
      triggerBrowserDownload(videoBlob, `${safeName}.flv`)
    } else {
      triggerBrowserDownload(videoBlob, `${safeName}_video.m4s`)
    }
  }

  // 下载音频流（如果有）
  if (urlResult.audioUrl && urlResult.format === 'dash') {
    try {
      const audioBlob = await downloadWithProgress(
        urlResult.audioUrl,
        referer,
        () => {},
        controller.signal
      )
      triggerBrowserDownload(audioBlob, `${safeName}_audio.m4s`)

      // 提示用户需要手动合并
      store.updateItem(id, {
        status: 'completed',
        progress: 100,
        speed: '需手动合并',
        eta: '',
        errorMessage: '浏览器模式下音视频分离。请使用 Electron 版自动合并，或手动用 FFmpeg/格式工厂合并。',
      })
      recordToHistory(item, 'completed', '浏览器模式下音视频分离')
      return
    } catch {
      // 音频下载失败不阻塞视频完成
    }
  }

  // 标记完成
  store.updateItem(id, {
    status: 'completed',
    progress: 100,
    speed: '',
    eta: '',
  })

  useToastStore.getState().success(`下载完成: ${item.title}`)
  console.log(`[DownloadManager] 浏览器完成: ${item.title}`)
  recordToHistory(item, 'completed')
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

  // 立即检查一次
  processQueue()

  // 每秒轮询
  pollTimer = setInterval(() => {
    processQueue()
  }, 1000)

  // 监听 store 变化：当有新 queued 项时立即处理，同时更新托盘状态
  unsubStore = useDownloadStore.subscribe((state, prev) => {
    const newQueued = state.items.filter(
      (d) => d.status === 'queued' && !prev.items.find((p) => p.id === d.id && p.status === 'queued')
    )
    if (newQueued.length > 0) {
      processQueue()
    }

    // 检查是否有 paused 项转为 queued（恢复下载）
    const resumed = state.items.filter(
      (d) => d.status === 'queued' && prev.items.find((p) => p.id === d.id && p.status === 'paused')
    )
    if (resumed.length > 0) {
      processQueue()
    }

    // 推送统计到系统托盘
    updateTrayFromStore()
  })

  console.log('[DownloadManager] 已启动')

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
