/**
 * BilibiliDown — B 站 API 服务层
 *
 * 基于原始 Java 版 BilibiliDown 的 API 调用逻辑重写。
 * 原始代码参考: src/nicelee/bilibili/parsers/impl/AbstractBaseParser.java
 *              src/nicelee/bilibili/API.java
 *
 * 支持的输入格式:
 *   BV号   : BV1xx411c7mD 或包含 BV 的 URL
 *   av号   : av170001 或包含 av 的 URL
 *   ep号   : ep123456 (番剧单集)
 *   ss号   : ss12345 (番剧整季)
 *   md号   : md134912 (番剧 media，自动转为 ss)
 *   b23.tv : 短链接，跟随重定向
 */

import type { ParsedVideo } from '../stores/parseStore'
import type { QualityOption } from '../components/QualityChip'
import { getPersistedCookieString, refreshCookie } from './cookie-manager'
import { encWbi } from './wbi-sign'

/* ── 常量 ── */

/** API 前缀：开发模式走 Vite 代理，生产模式需配合 Electron IPC 或 webSecurity 配置 */
const API_BASE = '/api/bilibili'

/** 标准 PC User-Agent */
const UA_PC =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/* ── Cookie 管理 ── */

/** 全局 Cookie 字符串（登录态），由 LoginPanel 登录成功后设置 */
let globalCookie: string = getPersistedCookieString()

/**
 * 设置全局 Cookie（登录成功后调用）。
 * 同时持久化到 localStorage。
 */
export function setGlobalCookie(cookie: string): void {
  globalCookie = cookie
}

/**
 * 获取当前全局 Cookie 字符串。
 */
export function getGlobalCookie(): string {
  return globalCookie
}

export { refreshCookie }

/**
 * 检查是否有登录 Cookie。
 */
export function hasAuthCookie(): boolean {
  return globalCookie.includes('SESSDATA')
}

/**
 * 轻量验证 Cookie 是否有效。
 *
 * 调用 B 站 /x/web-interface/nav 接口（极轻量，仅返回用户基本信息）。
 * 若返回 code === 0 且有 isLogin === true，则 Cookie 有效。
 * 若返回 -101（未登录），则 Cookie 已过期。
 * 网络错误不视为过期，返回 valid: true 保留现有状态不做误判。
 */
export async function validateCookie(): Promise<{ valid: boolean; uid?: string; uname?: string }> {
  if (!globalCookie || !globalCookie.includes('SESSDATA')) {
    return { valid: false }
  }

  try {
    const res = await fetch(`${API_BASE}/x/web-interface/nav`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'User-Agent': UA_PC,
        'Referer': 'https://www.bilibili.com',
        'Origin': 'https://www.bilibili.com',
        'Cookie': globalCookie,
      },
    })

    if (!res.ok) {
      // 网络错误，不误判为过期
      console.warn('[validateCookie] 网络请求失败，跳过验证')
      return { valid: true }
    }

    const json = await res.json()

    if (json.code === -101) {
      // B 站明确返回"未登录"——调用方应先尝试 refreshCookie() 自动续期
      return { valid: false }
    }

    if (json.data?.isLogin === true) {
      return {
        valid: true,
        uid: String(json.data.mid ?? ''),
        uname: json.data.uname ?? '',
      }
    }

    // 其他情况（如 code !== 0 但也不是 -101），保守处理
    return { valid: true }
  } catch {
    // 网络错误，不误判
    console.warn('[validateCookie] 网络异常，跳过验证')
    return { valid: true }
  }
}

/** 清晰度代码 → 标签 */
const QN_LABELS: Record<number, string> = {
  127: '8K',
  126: '杜比视界',
  125: 'HDR',
  120: '4K',
  116: '1080P60',
  112: '1080P+',
  80: '1080P',
  74: '720P60',
  64: '720P',
  32: '480P',
  16: '360P',
  6: '240P',
}

/** 清晰度代码 → 近似码率 (Mbps)，用于估算文件大小 */
const QN_BITRATES: Record<number, number> = {
  127: 50,
  126: 25,
  125: 20,
  120: 20,
  116: 8,
  112: 6,
  80: 5,
  74: 3.5,
  64: 2.5,
  32: 1,
  16: 0.5,
  6: 0.3,
}

/** 默认清晰度列表（未登录可见的全部选项） */
const DEFAULT_QUALITY_OPTIONS: QualityOption[] = [
  { label: '8K', size: '', available: false },
  { label: '4K', size: '', available: false },
  { label: '1080P60', size: '', available: true },
  { label: '1080P', size: '', available: true },
  { label: '720P', size: '', available: true },
  { label: '480P', size: '', available: true },
  { label: '360P', size: '', available: true },
  { label: '仅音频', size: '', available: true },
]

/* ── 工具函数 ── */

function headersForApi(refererAvId: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'User-Agent': UA_PC,
    Referer: `https://www.bilibili.com/video/${refererAvId}`,
    Origin: 'https://www.bilibili.com',
  }
  // 注入登录 Cookie（解锁高清画质）
  if (globalCookie) {
    h['Cookie'] = globalCookie
  }
  return h
}

function headersForPgc(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'User-Agent': UA_PC,
    Referer: 'https://www.bilibili.com',
    Origin: 'https://www.bilibili.com',
  }
  // 注入登录 Cookie
  if (globalCookie) {
    h['Cookie'] = globalCookie
  }
  return h
}

async function apiGet(path: string, headers: Record<string, string>): Promise<any> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  const json = await res.json()
  if (json.code !== 0) {
    throw new Error(json.message || `API 返回错误码 ${json.code}`)
  }
  return json.data ?? json.result
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

function estimateSize(durationSec: number, qn: number): string {
  const mbps = QN_BITRATES[qn] ?? 3
  const sizeMB = (mbps * durationSec) / 8
  if (sizeMB >= 1000) return `约 ${(sizeMB / 1000).toFixed(1)}GB`
  if (sizeMB >= 1) return `约 ${Math.round(sizeMB)}MB`
  return `< 1MB`
}

/* ── ID 识别 ── */

type IdType = 'bv' | 'av' | 'ep' | 'ss' | 'md' | 'ml'
interface IdInfo {
  type: IdType
  id: string
}

/**
 * 从一个可能是完整 URL 也可能是短 ID 的字符串中提取出 B 站视频标识。
 * 参考: InputParser.selectParser() 中的各个 parser 的 matches() 方法。
 */
export function identifyInput(input: string): IdInfo | null {
  const s = input.trim()

  // b23.tv 短链接
  if (/^https?:\/\/b23\.tv\/\S+$/i.test(s)) {
    // b23 短链需要先跟随重定向，不能在此同步返回
    // 返回特殊标记，由调用方处理
    return null // 由 parseB23Url 单独处理
  }

  // 完整 URL 中的 BV 号
  let m = s.match(/bilibili\.com\/video\/(BV[A-Za-z0-9]+)/)
  if (m) return { type: 'bv', id: m[1] }

  // 完整 URL 中的 av 号
  m = s.match(/bilibili\.com\/video\/av(\d+)/i)
  if (m) return { type: 'av', id: m[1] }

  // 番剧 ep URL
  m = s.match(/bilibili\.com\/bangumi\/play\/ep(\d+)/)
  if (m) return { type: 'ep', id: m[1] }

  // 番剧 ss URL
  m = s.match(/bilibili\.com\/bangumi\/play\/ss(\d+)/)
  if (m) return { type: 'ss', id: m[1] }

  // 课程 ep URL（cheese）
  m = s.match(/bilibili\.com\/cheese\/play\/ep(\d+)/)
  if (m) return { type: 'ep', id: m[1] }

  // 课程 ss URL
  m = s.match(/bilibili\.com\/cheese\/play\/ss(\d+)/)
  if (m) return { type: 'ss', id: m[1] }

  // bangumi media URL
  m = s.match(/bilibili\.com\/bangumi\/media\/md(\d+)/)
  if (m) return { type: 'md', id: m[1] }

  // 收藏夹 URL (ml)
  m = s.match(/bilibili\.com\/medialist\/detail\/ml(\d+)/)
  if (m) return { type: 'ml', id: m[1] }

  // 短 ID
  if (/^BV[A-Za-z0-9]+$/.test(s)) return { type: 'bv', id: s }
  if (/^av\d+$/i.test(s)) return { type: 'av', id: s.replace(/^av/i, '') }
  if (/^ep\d+$/i.test(s)) return { type: 'ep', id: s.replace(/^ep/i, '') }
  if (/^ss\d+$/i.test(s)) return { type: 'ss', id: s.replace(/^ss/i, '') }
  if (/^md\d+$/i.test(s)) return { type: 'md', id: s.replace(/^md/i, '') }
  if (/^ml\d+$/i.test(s)) return { type: 'ml', id: s.replace(/^ml/i, '') }

  return null
}

/* ── B23 短链接 ── */

/**
 * 跟随 b23.tv 短链接重定向，提取 BV 号。
 * 参考: B23Parser.java
 */
async function resolveB23Url(shortUrl: string): Promise<IdInfo | null> {
  // b23.tv 重定向 → 完整 bilibili URL → 再次识别
  const res = await fetch(shortUrl, {
    method: 'HEAD',
    redirect: 'manual',
    headers: { 'User-Agent': UA_PC },
  })
  const location = res.headers.get('location') || res.headers.get('Location')
  if (!location) return null
  return identifyInput(location)
}

/* ── 清晰度列表 ── */

/**
 * 查询一个视频（BV + cid）实际可用的清晰度列表。
 * 参考: AbstractBaseParser.getVideoQNList_TryNormalTypeFirst()
 */
async function fetchAvailableQNs(bvid: string, cid: string, aid?: number): Promise<number[]> {
  // 先尝试普通类型
  try {
    const url = `/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=32&type=&otype=json&fnver=0&fnval=4048&fourk=1`
    const data = await apiGet(url, headersForApi(bvid))
    if (data?.accept_quality) {
      return data.accept_quality as number[]
    }
  } catch {
    // 可能不是普通视频，尝试 PGC 接口
  }

  // PGC 内容
  if (aid) {
    try {
      const url = `/pgc/player/web/playurl?fnval=4048&fnver=0&fourk=1&otype=json&avid=${aid}&cid=${cid}&qn=32`
      const data = await apiGet(url, headersForPgc())
      if (data?.accept_quality) {
        return data.accept_quality as number[]
      }
    } catch {
      // fall through
    }
  }

  // 返回默认清晰度列表
  return [120, 116, 112, 80, 74, 64, 32, 16]
}

function buildQualityOptions(availableQNs: number[], durationSec: number): QualityOption[] {
  // 构建可用的清晰度芯片
  const availableSet = new Set(availableQNs)

  const options: QualityOption[] = []

  // 按清晰度降序排列
  const orderedQNs = [127, 126, 125, 120, 116, 112, 80, 74, 64, 32, 16, 6]

  for (const qn of orderedQNs) {
    const label = QN_LABELS[qn]
    if (!label) continue

    options.push({
      label,
      size: estimateSize(durationSec, qn),
      available: availableSet.has(qn),
    })
  }

  // 仅音频选项
  options.push({
    label: '仅音频',
    size: estimateSize(durationSec, 0.3 as any),
    available: true,
  })

  // 默认选中 1080P60 或第一个可用的
  const preferred = options.find((o) => o.label === '1080P60' && o.available)
    ?? options.find((o) => o.available)
  if (preferred) {
    preferred.selected = true
  }

  return options
}

/* ── 核心解析函数 ── */

/**
 * 解析单个 BV 号对应的视频信息。
 *
 * 调用链（参考 AbstractBaseParser.getAVDetail）:
 *   1. GET /x/player/pagelist?bvid= → 获取分 P 列表
 *   2. GET /x/web-interface/view?bvid= → 获取视频详情
 *   3. GET /x/player/playurl?bvid=&cid= → 获取可用清晰度
 *
 * 多 P 视频返回多个 ParsedVideo。
 */
async function parseBvVideo(bvid: string): Promise<ParsedVideo[]> {
  // 1. 获取分 P 列表
  const pagelistUrl = `/x/player/pagelist?bvid=${bvid}&jsonp=jsonp`
  let pages: any[]
  try {
    pages = await apiGet(pagelistUrl, headersForApi(bvid))
  } catch {
    throw new Error('获取视频分 P 列表失败，请检查 BV 号是否正确')
  }
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('该视频没有可用的分 P 数据')
  }

  // 2. 获取视频详情
  let detail: any
  try {
    // 使用简单 view API（无需 WBI 签名）
    const viewUrl = `/x/web-interface/view?bvid=${bvid}`
    detail = await apiGet(viewUrl, headersForApi(bvid))
  } catch {
    // fallback: 使用 WBI 签名的 wbi/view API（可获取更完整信息）
    try {
      const rawPath = `/x/web-interface/wbi/view?bvid=${bvid}`
      const signedPath = await encWbi(rawPath)
      detail = await apiGet(signedPath, headersForApi(bvid))
    } catch {
      throw new Error('获取视频详情失败，可能该视频受到限制或不存在')
    }
  }

  // 提取公共信息
  const videoTitle: string = detail.title ?? ''
  const authorName: string = detail.owner?.name ?? ''
  const authorId: string = String(detail.owner?.mid ?? '')
  const coverUrl: string = detail.pic ?? ''
  const stat = detail.stat ?? {}
  const pubdate: number = detail.pubdate ?? detail.ctime ?? 0
  const aid: number = detail.aid ?? 0

  // 3. 为每个分 P 创建 ParsedVideo
  const results: ParsedVideo[] = []

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const cid: number = page.cid
    const pageDuration: number = page.duration ?? detail.duration ?? 0

    // 获取该分 P 的实际可用清晰度
    const availableQNs = await fetchAvailableQNs(bvid, String(cid), aid).catch(
      () => [120, 116, 112, 80, 74, 64, 32, 16]
    )

    const qualities = buildQualityOptions(availableQNs, pageDuration)

    const isMultiPage = pages.length > 1
    const title = isMultiPage
      ? `${videoTitle} — P${page.page} ${page.part}`
      : videoTitle

    results.push({
      id: isMultiPage ? `${bvid}_p${page.page}` : bvid,
      bvid,
      cid,
      coverUrl,
      title,
      upName: authorName,
      views: formatCount(stat.view ?? 0),
      duration: formatDuration(pageDuration),
      date: pubdate ? formatDate(pubdate) : '',
      qualities,
      episodeIndex: isMultiPage ? page.page : undefined,
      episodeTitle: isMultiPage ? page.part : undefined,
    })
  }

  return results
}

/**
 * 通过 av 号解析视频（av 号先转 BV，再复用 BV 解析逻辑）。
 * 参考: AVParser.java
 */
async function parseAvVideo(avId: string): Promise<ParsedVideo[]> {
  // av 号 → 先通过 B 站页面获取 BV 号
  // 参考 ConvertUtil.Av2Bv，但实际上直接调 B 站 API 更可靠
  try {
    const url = `/x/web-interface/view?aid=${avId}`
    const detail = await apiGet(url, headersForApi(`av${avId}`))
    if (detail?.bvid) {
      return parseBvVideo(detail.bvid)
    }
  } catch {
    // fallback: 通过 oid 转换
  }
  throw new Error('无法将 av 号转换为 BV 号，请直接使用 BV 号')
}

/**
 * 通过 ep 号解析番剧单集。
 * 先找到对应 BV 号，再复用 BV 解析逻辑。
 * 参考: EPParser.java
 */
async function parseEpisode(epId: string): Promise<ParsedVideo[]> {
  const url = `/pgc/view/web/season?ep_id=${epId}`
  const data = await apiGet(url, headersForPgc())

  const episodes = data?.episodes
  if (!Array.isArray(episodes)) {
    throw new Error('获取番剧信息失败')
  }

  // 找到对应的 ep
  const ep = episodes.find((e: any) => String(e.id) === epId || `ep${e.id}` === epId)
  if (!ep) {
    throw new Error(`未找到 ep${epId} 对应的剧集`)
  }

  const bvid = ep.bvid
  if (!bvid) {
    throw new Error('该剧集没有关联的 BV 号')
  }

  // 复用 BV 解析
  const results = await parseBvVideo(bvid)

  // 补充番剧元信息
  const seasonTitle = data?.title ?? ''
  for (const r of results) {
    if (seasonTitle) {
      r.upName = seasonTitle
    }
    if (ep.long_title) {
      r.title = `${seasonTitle} — ${ep.long_title}`
    } else if (ep.title) {
      r.title = `${seasonTitle} — ${ep.title}`
    }
    if (ep.cover) {
      r.coverUrl = ep.cover
    }
  }

  return results
}

/**
 * 通过 ss 号解析整季番剧。
 * 返回该季所有剧集的 ParsedVideo 列表。
 * 参考: SSParser.java
 */
async function parseSeason(ssId: string): Promise<ParsedVideo[]> {
  const url = `/pgc/view/web/season?season_id=${ssId}`
  const data = await apiGet(url, headersForPgc())

  const seasonTitle: string = data?.title ?? '番剧'
  const episodes = data?.episodes
  if (!Array.isArray(episodes) || episodes.length === 0) {
    throw new Error('该番剧没有剧集数据')
  }

  const results: ParsedVideo[] = []

  // 大量剧集时使用默认清晰度列表（参考原 Java: SSParser 中 > 20 集时用默认 QN 列表）
  const useDefaultQNs = episodes.length > 20
  const defaultQNList = [120, 116, 112, 80, 74, 64, 32, 16]

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i]
    const bvid = ep.bvid
    const cid: number = ep.cid
    const durationMs: number = ep.duration ?? 0 // B站番剧 API 返回毫秒
    const durationSec = Math.round(durationMs / 1000)

    if (!bvid) continue

    // 获取清晰度（大量剧集时跳过 API 查询，直接用默认列表）
    const availableQNs = useDefaultQNs
      ? defaultQNList
      : await fetchAvailableQNs(bvid, String(cid)).catch(() => defaultQNList)
    const qualities = buildQualityOptions(availableQNs, durationSec)

    const epTitle = ep.long_title || ep.title || `第${i + 1}集`

    results.push({
      id: `${ssId}_ep${ep.id}`,
      bvid: ep.bvid,
      cid: ep.cid,
      coverUrl: ep.cover ?? data?.cover ?? '',
      title: `${seasonTitle} — ${epTitle}`,
      upName: seasonTitle,
      views: ep.stat?.play ? formatCount(ep.stat.play) : '',
      duration: formatDuration(durationSec),
      date: ep.pub_time ?? '',
      qualities,
      episodeIndex: i + 1,
      episodeTitle: epTitle,
    })
  }

  return results
}

/**
 * 通过 md 号解析（media → 找到 season_id → 复用 ss 解析）。
 * 参考: MdParser.java
 */
async function parseMedia(mdId: string): Promise<ParsedVideo[]> {
  const url = `/pgc/review/user?media_id=${mdId}`
  const data = await apiGet(url, headersForPgc())

  const seasonId = data?.media?.season_id
  if (!seasonId) {
    throw new Error('无法从 media ID 找到对应的 season')
  }

  return parseSeason(String(seasonId))
}

/** 收藏夹每页条数 */
const ML_PAGE_SIZE = 20

/**
 * 构建收藏夹请求头。
 */
function mlHeaders(mlId: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'User-Agent': UA_PC,
    Referer: `https://www.bilibili.com/medialist/detail/ml${mlId}`,
    Origin: 'https://www.bilibili.com',
  }
  if (globalCookie) {
    h['Cookie'] = globalCookie
  }
  return h
}

/**
 * 将 medialist API 返回的 media 对象数组转换为 ParsedVideo[]。
 */
function mediasToVideos(
  medias: any[],
  mlId: string,
  collectionTitle: string,
  startIndex: number
): ParsedVideo[] {
  const defaultQNList = [120, 116, 112, 80, 74, 64, 32, 16]
  const results: ParsedVideo[] = []

  for (let i = 0; i < medias.length; i++) {
    const m = medias[i]
    const bvid: string = m.bvid
    if (!bvid) continue

    const title = m.title ?? ''
    const cover = m.cover ?? ''
    const upName = m.upper?.name ?? ''
    const playCount = m.cnt_info?.play ?? 0
    const durationSec: number = m.duration ?? 0
    const pageCount: number = m.page ?? 1
    const qualities = buildQualityOptions(defaultQNList, durationSec)

    results.push({
      id: `ml${mlId}_${m.id}`,
      bvid,
      cid: undefined, // 需要进一步调用 pagelist 获取
      coverUrl: cover,
      title: pageCount > 1 ? `${title} (${pageCount}P)` : title,
      upName: upName || collectionTitle,
      views: playCount > 0 ? formatCount(playCount) : '',
      duration: formatDuration(durationSec),
      date: '',
      qualities,
      episodeIndex: startIndex + i + 1,
      episodeTitle: title,
    })
  }

  // 覆盖 upName 为收藏夹名
  if (collectionTitle) {
    for (const r of results) {
      r.upName = collectionTitle
    }
  }

  return results
}

/**
 * 通过 ml 号解析收藏夹/合集。
 * 参考: MLParser.java
 *
 * API: GET /medialist/gateway/base/detail?media_id=<id>&pn=<page>&ps=20
 *
 * 注意：此 API 需要登录 Cookie（SESSDATA），否则返回 -101 未登录。
 * 首次解析加载首页 20 条，并存储分页元信息到 parseStore 供后续"加载更多"使用。
 */
async function parseMediaList(mlId: string): Promise<ParsedVideo[]> {
  const url = `/medialist/gateway/base/detail?media_id=${mlId}&pn=1&ps=${ML_PAGE_SIZE}`
  const data = await apiGet(url, mlHeaders(mlId))

  const info = data?.info
  const medias = data?.medias

  if (!Array.isArray(medias) || medias.length === 0) {
    throw new Error('该收藏夹没有视频，或需要登录后查看')
  }

  const collectionTitle: string = info?.title ?? '收藏夹'
  const totalCount: number = info?.media_count ?? medias.length
  const hasMore = data?.has_more ?? (medias.length >= ML_PAGE_SIZE && totalCount > medias.length)

  // 存储分页元信息到 parseStore（供 loadMoreMediaList 使用）
  if (hasMore) {
    // 动态 import 避免循环依赖，parseStore 引用 bilibili-api 仅通过类型
    const { useParseStore } = await import('../stores/parseStore')
    useParseStore.getState().setMlPagination(mlId, 1, totalCount)
    console.log(`[parseMediaList] 收藏夹共 ${totalCount} 个视频，已加载首页 ${medias.length} 个`)
  } else {
    // 单页就装下了（≤20 条），清空分页状态
    const { useParseStore } = await import('../stores/parseStore')
    useParseStore.getState().setMlPagination(null, 0, 0)
  }

  return mediasToVideos(medias, mlId, collectionTitle, 0)
}

/**
 * 加载收藏夹的下一页视频。
 *
 * 从 parseStore 读取当前的 mlId 和页码，请求下一页，
 * 成功后通过 appendVideos 追加到列表，并更新分页状态。
 *
 * 仅当 parseStore.mlId 非 null 时有效（即上次解析的是 ml 类型且有更多页）。
 *
 * @throws Error 当没有更多页或请求失败时
 */
export async function loadMoreMediaList(): Promise<void> {
  const { useParseStore } = await import('../stores/parseStore')
  const store = useParseStore.getState()

  if (!store.mlId || store.isLoadingMore) return

  const nextPage = store.mlPage + 1
  const maxPage = Math.ceil(store.mlTotalCount / ML_PAGE_SIZE)

  if (nextPage > maxPage) return

  store.setLoadingMore(true)

  try {
    const url = `/medialist/gateway/base/detail?media_id=${store.mlId}&pn=${nextPage}&ps=${ML_PAGE_SIZE}`
    const data = await apiGet(url, mlHeaders(store.mlId))

    const medias = data?.medias
    if (!Array.isArray(medias) || medias.length === 0) {
      // 没有更多数据了
      useParseStore.getState().setMlPagination(null, 0, 0)
      return
    }

    const info = data?.info
    const collectionTitle: string = info?.title ?? '收藏夹'
    const hasMore = data?.has_more ?? (
      medias.length >= ML_PAGE_SIZE &&
      store.mlTotalCount > nextPage * ML_PAGE_SIZE
    )

    const currentCount = useParseStore.getState().videos.length
    const newVideos = mediasToVideos(medias, store.mlId, collectionTitle, currentCount)

    if (hasMore) {
      useParseStore.getState().setMlPagination(store.mlId, nextPage, store.mlTotalCount)
    } else {
      // 最后一页
      useParseStore.getState().setMlPagination(null, 0, 0)
    }

    useParseStore.getState().appendVideos(newVideos)

    const { useToastStore } = await import('../stores/toastStore')
    useToastStore.getState().info(
      `已加载 ${currentCount + newVideos.length} / ${store.mlTotalCount} 个视频`
    )
  } catch (err: any) {
    const { useToastStore } = await import('../stores/toastStore')
    useToastStore.getState().error(err.message || '加载更多失败，请重试')
    throw err
  } finally {
    useParseStore.getState().setLoadingMore(false)
  }
}

/**
 * 懒解析 cid：通过 BV 号获取对应视频的默认 cid。
 *
 * 用于 ml 收藏夹场景：medialist API 只返回 bvid 不含 cid，
 * 在用户加入下载队列时调此函数补齐 cid。
 *
 * 调用 /x/player/pagelist?bvid= 获取分 P 列表，返回第一 P 的 cid。
 * 后续可扩展为返回全部 page 信息支持多 P 选择。
 *
 * @param bvid BV 号
 * @returns 第一个 cid，或 undefined（API 失败/无数据时）
 */
export async function resolveCidForBvid(bvid: string): Promise<number | undefined> {
  try {
    const url = `/x/player/pagelist?bvid=${bvid}&jsonp=jsonp`
    const pages = await apiGet(url, headersForApi(bvid))
    if (Array.isArray(pages) && pages.length > 0) {
      return pages[0].cid as number
    }
  } catch {
    console.warn(`[resolveCidForBvid] 无法获取 ${bvid} 的 pagelist`)
  }
  return undefined
}

/* ── 公开 API ── */

/**
 * 主入口：解析用户输入的 B 站链接/ID，返回 ParsedVideo 列表。
 *
 * @throws Error 当输入格式无法识别或 API 调用失败时
 */
export async function parseBilibiliUrl(input: string): Promise<ParsedVideo[]> {
  const s = input.trim()
  if (!s) throw new Error('请输入 B 站链接或 BV/av/ep/ss/md 号')

  // b23.tv 短链接
  if (/^https?:\/\/b23\.tv\/\S+$/i.test(s)) {
    const resolved = await resolveB23Url(s)
    if (!resolved) throw new Error('无法解析 b23.tv 短链接，请直接使用 BV 号')
    return dispatchParsed(resolved)
  }

  const idInfo = identifyInput(s)
  if (!idInfo) {
    throw new Error(
      '不支持的链接格式。请粘贴 B 站视频链接，或直接输入 BV/av/ep/ss/md 号'
    )
  }

  return dispatchParsed(idInfo)
}

async function dispatchParsed(info: IdInfo): Promise<ParsedVideo[]> {
  switch (info.type) {
    case 'bv':
      return parseBvVideo(info.id)
    case 'av':
      return parseAvVideo(info.id)
    case 'ep':
      return parseEpisode(info.id)
    case 'ss':
      return parseSeason(info.id)
    case 'md':
      return parseMedia(info.id)
    case 'ml':
      return parseMediaList(info.id)
    default:
      throw new Error(`不支持的类型: ${info.type}`)
  }
}

/* ── 下载链接解析 ── */

/** 下载格式：DASH (音视频分离) 或 FLV (直接链接) */
export type DownloadFormat = 'dash' | 'flv'

/** QN 代码 → 标签映射（导出给下载器使用） */
export const QN_LABEL_MAP: Record<number, string> = QN_LABELS

export interface DownloadUrlResult {
  /** 实际获取到的清晰度代码 */
  quality: number
  /** 视频流 URL（DASH）或 FLV URL */
  videoUrl: string
  /** 音频流 URL（仅 DASH 格式，FLV 为 ''） */
  audioUrl: string
  /** 实际格式 */
  format: DownloadFormat
}

/**
 * 解析视频/音频的实际下载链接。
 *
 * 参考: AbstractBaseParser.getVideoLinkByFormat()
 *
 * @param bvid   BV 号
 * @param cid    分 P 的 cid
 * @param qn     目标清晰度（如 80=1080P, 116=1080P60）
 * @param format 下载格式：'dash' (音视频分离, fnval=4048) 或 'flv' (fnval=2)
 * @returns       包含视频/音频流 URL 的结果
 */
export async function resolveDownloadUrl(
  bvid: string,
  cid: string,
  qn: number,
  format: DownloadFormat = 'dash'
): Promise<DownloadUrlResult> {
  const fnval = format === 'dash' ? '4048' : '2'

  // 先判断视频类型（普通 vs PGC）
  let isNormalType = true
  let aid = 0

  try {
    const viewUrl = `/x/web-interface/view?bvid=${bvid}`
    const detail = await apiGet(viewUrl, headersForApi(bvid))
    aid = detail?.aid ?? 0
    isNormalType = !detail?.redirect_url
  } catch {
    // 获取失败，假设是普通类型
  }

  let data: any

  if (isNormalType) {
    // 普通视频：使用 playurl API
    const url =
      `/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}` +
      `&type=&otype=json&fnver=0&fnval=${fnval}&fourk=1` +
      `&gaia_source=&from_client=BROWSER&session=&voice_balance=1&web_location=1315873`

    data = await apiGet(url, headersForApi(bvid))
  } else {
    // PGC 内容
    const url =
      `/pgc/player/web/playurl?fnver=0&fourk=1&otype=json` +
      `&avid=${aid}&cid=${cid}&qn=${qn}&fnval=${fnval}`

    data = await apiGet(url, headersForPgc())
  }

  const realQn: number = data?.quality ?? qn

  if (format === 'dash' && data?.dash) {
    const dash = data.dash

    // 从 video 数组中选最佳编码的视频流
    const videos: any[] = dash.video ?? []
    // 选择匹配清晰度的视频流（优先 H.264/AVC codecid=7）
    const matchedVideos = videos.filter((v: any) => v.id === realQn)
    const bestVideo =
      matchedVideos.find((v: any) => v.codecid === 7) ?? // AVC
      matchedVideos.find((v: any) => v.codecid === 12) ?? // HEVC
      matchedVideos[0] ??
      videos[0]

    const videoUrl = bestVideo?.base_url ?? bestVideo?.baseUrl ?? ''
    // 优先用 backup_url 中第一个可用的
    const videoBackups = bestVideo?.backup_url ?? bestVideo?.backupUrl ?? []
    const finalVideoUrl = videoUrl || videoBackups[0] || ''

    // 音频流：优先选择高质量音频
    let audios: any[] = dash.audio ?? []
    // 也可能在 flac 中
    const flacAudio = dash.flac?.audio
    if (flacAudio) audios = [flacAudio, ...audios]

    const bestAudio = audios[0]
    const audioUrl = bestAudio?.base_url ?? bestAudio?.baseUrl ?? ''
    const audioBackups = bestAudio?.backup_url ?? bestAudio?.backupUrl ?? []
    const finalAudioUrl = audioUrl || audioBackups[0] || ''

    if (!finalVideoUrl && !finalAudioUrl) {
      throw new Error('未找到可用的下载链接，可能需要登录')
    }

    return {
      quality: realQn,
      videoUrl: finalVideoUrl,
      audioUrl: finalAudioUrl,
      format: 'dash',
    }
  }

  // FLV 格式
  if (data?.durl && data.durl.length > 0) {
    return {
      quality: realQn,
      videoUrl: data.durl[0].url,
      audioUrl: '',
      format: 'flv',
    }
  }

  throw new Error('无法解析下载链接，清晰度可能不可用')
}
