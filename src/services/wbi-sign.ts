/**
 * WBI 签名 — B 站 WBI 鉴权参数生成
 *
 * 参考: src/nicelee/bilibili/API.java  encWbi() + getMixinKey()
 *       B 站前端 bili-header.umd.js 中的 getMixinKey 实现
 *
 * WBI 签名用于需要鉴权的 API（如 wbi/view、wbi/playurl）。
 * 算法：
 *   1. 从 /x/web-interface/nav 获取 wbi_img.img_url + sub_url
 *   2. 提取文件名（不含扩展名），拼接得到 wbiImg
 *   3. 用固定的 MixinKey 数组从 wbiImg 中抽取 32 字符 → mixinKey
 *   4. 对 URL 参数排序 + URLEncode → MD5(paramStr + mixinKey) → w_rid
 *   5. 追加 w_rid=<md5>&wts=<timestamp> 到 URL
 */

import { md5 } from './md5'

/* ── 常量 ── */

/**
 * Mixin 索引数组（来自 B 站前端 bili-header.umd.js）。
 * 从 64 字符的 imgKey+subKey 中按此索引抽取 32 字符。
 */
const MIXIN_INDICES = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

const API_BASE = '/api/bilibili'

/* ── 内部状态 ── */

/** 缓存的 wbiImg 字符串（img_key + sub_key） */
let cachedWbiImg: string | null = null

/** 缓存过期时间 */
let cacheExpiry: number = 0

/** 缓存 TTL：1 小时 */
const CACHE_TTL = 60 * 60 * 1000

/* ── 工具函数 ── */

/**
 * 从 img_key 和 sub_key 字符串中提取 mixinKey。
 * 参考: API.getMixinKey()
 */
function getMixinKey(wbiImg: string): string {
  let key = ''
  for (let i = 0; i < 32; i++) {
    key += wbiImg.charAt(MIXIN_INDICES[i])
  }
  return key
}

/**
 * URL 安全的参数编码（与 Java encodeURL 行为一致）。
 * 空格编码为 %20 而非 +。
 */
function encodeURL(s: string): string {
  return encodeURIComponent(s).replace(/%20/g, '%20')
}

/* ── WBI 密钥获取 ── */

/**
 * 从 B 站 nav 接口获取 wbi_img 密钥。
 * 结果缓存 1 小时。
 *
 * 参考: API.getWbiUrl()
 */
async function fetchWbiKeys(): Promise<string> {
  // 检查缓存
  if (cachedWbiImg && Date.now() < cacheExpiry) {
    return cachedWbiImg
  }

  try {
    const url = `${API_BASE}/x/web-interface/nav`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.bilibili.com',
        Origin: 'https://www.bilibili.com',
      },
    })
    const json = await res.json()
    const wbi = json?.data?.wbi_img
    if (!wbi || !wbi.img_url || !wbi.sub_url) {
      throw new Error('wbi_img 数据不可用')
    }

    // 提取文件名（不含扩展名）
    const imgUrl: string = wbi.img_url
    const subUrl: string = wbi.sub_url

    const imgStart = imgUrl.lastIndexOf('/') + 1
    const imgEnd = imgUrl.indexOf('.', imgStart)
    const imgKey = imgUrl.substring(imgStart, imgEnd)

    const subStart = subUrl.lastIndexOf('/') + 1
    const subEnd = subUrl.indexOf('.', subStart)
    const subKey = subUrl.substring(subStart, subEnd)

    cachedWbiImg = imgKey + subKey
    cacheExpiry = Date.now() + CACHE_TTL

    return cachedWbiImg
  } catch {
    // 如果获取失败但有旧缓存，继续使用旧缓存
    if (cachedWbiImg) {
      cacheExpiry = Date.now() + 5 * 60 * 1000 // 延长 5 分钟
      return cachedWbiImg
    }
    throw new Error('无法获取 WBI 密钥')
  }
}

/* ── 公开 API ── */

/**
 * 对 URL 进行 WBI 签名，返回追加了 w_rid 和 wts 参数的完整 URL。
 *
 * 参考: API.encWbi()
 *
 * @param urlOrPath 可以是完整 URL（含 ? 参数）或路径（无参数）
 * @returns 追加了 w_rid=md5&wts=timestamp 的 URL
 */
export async function encWbi(urlOrPath: string): Promise<string> {
  // 获取 wbi 密钥
  const wbiImg = await fetchWbiKeys()
  const mixinKey = getMixinKey(wbiImg)

  const wts = String(Math.floor(Date.now() / 1000))

  // 解析 URL
  const questionIdx = urlOrPath.indexOf('?')
  const baseUrl = questionIdx >= 0 ? urlOrPath.substring(0, questionIdx) : urlOrPath
  const rawQuery = questionIdx >= 0 ? urlOrPath.substring(questionIdx + 1) : ''

  // 收集所有参数
  const paramPairs: [string, string][] = []

  if (rawQuery) {
    for (const pair of rawQuery.split('&')) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx >= 0) {
        const key = decodeURIComponent(pair.substring(0, eqIdx))
        const val = pair.substring(eqIdx + 1)
        paramPairs.push([key, val])
      }
    }
  }

  // 添加 wts
  paramPairs.push(['wts', wts])

  // URL 编码并排序
  const encodedParams = paramPairs
    .map(([k, v]) => `${encodeURL(k)}=${encodeURL(v)}`)
    .sort()
    .join('&')

  // 计算 w_rid
  const wRid = md5(encodedParams + mixinKey)

  // 构建最终 URL
  const sep = rawQuery ? '&' : '?'
  return `${baseUrl}?${encodedParams}&w_rid=${wRid}`
}

/**
 * 清除 WBI 缓存（用于登录/登出后的刷新）。
 */
export function clearWbiCache(): void {
  cachedWbiImg = null
  cacheExpiry = 0
}
