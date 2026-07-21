/**
 * CookieManager — B 站登录态管理
 *
 * 参考: src/nicelee/bilibili/util/HttpCookies.java
 *       src/nicelee/bilibili/INeedLogin.java
 *
 * 负责:
 *   1. 解析 Cookie 字符串为 key-value Map
 *   2. 提取关键 Cookie（SESSDATA, bili_jct, DedeUserID 等）
 *   3. 验证登录状态（调用 /x/web-interface/nav）
 *   4. 提供 CSRF token（bili_jct）
 */

const API_BASE = '/api/bilibili'
const PASSPORT_BASE = '/api/passport'

const UA_PC =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/* ── Types ── */

export interface BiliUserInfo {
  uid: number
  name: string
  face: string
  level: number
  isVip: boolean
}

export interface CookieInfo {
  raw: string
  parsed: Record<string, string>
  /** Whether the cookie is valid (logged in) */
  isValid: boolean
  /** Last validation timestamp */
  validatedAt: number
}

/* ── Cookie 解析 ── */

/**
 * 解析 Cookie 字符串为 key-value Map。
 * 参考: HttpCookies.convertCookies()
 */
export function parseCookieString(raw: string): Record<string, string> {
  const map: Record<string, string> = {}
  if (!raw) return map

  // 处理不同分隔符：; 或换行
  const parts = raw.split(/[;\n]/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (key && value) {
      map[key] = value
    }
  }
  return map
}

/**
 * 将 key-value Map 序列化为 Cookie 字符串。
 */
export function serializeCookieMap(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

/* ── 关键 Cookie 提取 ── */

/**
 * 获取 CSRF token（bili_jct 值）。
 * 参考: HttpCookies.getCsrf()
 */
export function getCsrf(parsed: Record<string, string>): string {
  return parsed['bili_jct'] ?? ''
}

/**
 * 获取 SESSDATA（登录态核心 cookie）。
 */
export function getSessdata(parsed: Record<string, string>): string {
  return parsed['SESSDATA'] ?? ''
}

/**
 * 检查是否包含登录所需的关键 cookie。
 */
export function hasLoginCookies(parsed: Record<string, string>): boolean {
  return !!(parsed['SESSDATA'] && parsed['DedeUserID'])
}

/* ── 登录状态验证 ── */

/**
 * 通过 B 站 API 验证当前 Cookie 是否处于登录态。
 * 参考: INeedLogin.getLoginStatus()
 *
 * @returns 用户信息，如果未登录返回 null
 */
export async function validateLoginStatus(
  cookieStr: string
): Promise<{ user: BiliUserInfo | null; isValid: boolean }> {
  try {
    const url = `${API_BASE}/x/web-interface/nav?build=0&mobi_app=web`
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA_PC,
        Referer: 'https://www.bilibili.com',
        Origin: 'https://www.bilibili.com',
        Cookie: cookieStr,
      },
    })
    const json = await res.json()
    if (json.code !== 0) {
      return { user: null, isValid: false }
    }
    const data = json.data
    const isLogin = data?.isLogin === true
    if (!isLogin) {
      return { user: null, isValid: false }
    }

    // B站 API 可能返回 http:// 头像链接，强制 https 避免浏览器混合内容拦截
    let faceUrl = data.face ?? ''
    if (faceUrl.startsWith('http://')) {
      faceUrl = faceUrl.replace('http://', 'https://')
    }
    return {
      isValid: true,
      user: {
        uid: data.wallet?.mid ?? data.mid ?? 0,
        name: data.uname ?? '',
        face: faceUrl,
        level: data.level_info?.current_level ?? 0,
        isVip: data.vip?.status === 1,
      },
    }
  } catch {
    return { user: null, isValid: false }
  }
}

/**
 * 从 cookie 字符串中获取完整的 CookieInfo。
 */
export function getCookieInfo(raw: string): CookieInfo {
  const parsed = parseCookieString(raw)
  return {
    raw,
    parsed,
    isValid: hasLoginCookies(parsed),
    validatedAt: 0,
  }
}

/**
 * 获取用于 API 请求的 Cookie 字符串。
 * 如果有存储的 cookie，返回；否则返回空字符串。
 */
export function getAuthCookieString(): string {
  try {
    const stored = localStorage.getItem('bibilidown-cookies')
    if (stored) {
      const data = JSON.parse(stored)
      if (data?.raw && data?.isValid) {
        return data.raw
      }
    }
  } catch {
    // ignore
  }
  return ''
}

/**
 * 持久化 Cookie 到 localStorage。
 */
export function persistCookie(raw: string, isValid: boolean): void {
  try {
    localStorage.setItem(
      'bibilidown-cookies',
      JSON.stringify({
        raw,
        isValid,
        savedAt: Date.now(),
      })
    )
  } catch {
    // ignore
  }
}

/**
 * 清除持久化的 Cookie。
 */
export function clearPersistedCookie(): void {
  try {
    localStorage.removeItem('bibilidown-cookies')
  } catch {
    // ignore
  }
}

/**
 * 获取持久化的 Cookie 字符串（仅 raw string）。
 */
export function getPersistedCookieString(): string {
  try {
    const stored = localStorage.getItem('bibilidown-cookies')
    if (stored) {
      const data = JSON.parse(stored)
      return data?.raw ?? ''
    }
  } catch {
    // ignore
  }
  return ''
}

/* ── Cookie 自动刷新 ── */

/**
 * 从 document.cookie 中提取关键 B 站 Cookie。
 * 在 refresh 请求后，Vite 代理 / 浏览器会将 Set-Cookie 响应头中的
 * 新 cookie 写入 document.cookie。
 */
function extractRefreshedCookies(): string {
  const allCookies = document.cookie
  if (!allCookies) return ''

  const keyNames = [
    'SESSDATA',
    'bili_jct',
    'DedeUserID',
    'DedeUserID__ckMd5',
    'buvid3',
    'buvid4',
    'b_nut',
    '_uuid',
    'b_lsid',
    'sid',
  ]

  const parsed = parseCookieString(allCookies)
  const pairs: string[] = []
  for (const key of keyNames) {
    if (parsed[key]) pairs.push(`${key}=${parsed[key]}`)
  }
  return pairs.join('; ')
}

/**
 * 尝试自动刷新过期的 B 站登录 Cookie。
 *
 * 调用 B 站 passport 刷新接口:
 *   POST /x/passport-login/web/cookie/refresh
 *
 * 需要 CSRF token（bili_jct）。成功后从 document.cookie 提取新 cookie，
 * 验证有效性后持久化到 localStorage。
 *
 * 这是一个 best-effort 操作：失败时返回 success: false，
 * 调用方应回退到提示用户手动登录。
 */
export async function refreshCookie(): Promise<{
  success: boolean
  newCookie?: string
  error?: string
}> {
  try {
    const currentCookie = getPersistedCookieString()
    if (!currentCookie) return { success: false, error: '没有已保存的 Cookie' }

    const parsed = parseCookieString(currentCookie)
    const csrf = parsed['bili_jct'] || ''
    if (!csrf) return { success: false, error: '缺少 CSRF token' }

    const url = `${PASSPORT_BASE}/x/passport-login/web/cookie/refresh`
    const body = new URLSearchParams({
      csrf,
      refresh_csrf: csrf,
      source: 'main_web',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA_PC,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://www.bilibili.com',
        Origin: 'https://www.bilibili.com',
        Cookie: currentCookie,
      },
      body: body.toString(),
      credentials: 'include',
    })

    const json = await res.json()
    if (json.code !== 0) {
      return { success: false, error: json.message || '刷新失败' }
    }

    // 刷新成功后，从 document.cookie 提取新的 cookie
    const newCookie = extractRefreshedCookies()
    if (!newCookie || newCookie === currentCookie) {
      // 无法提取新 cookie，保留旧 cookie（可能仍然有效）
      return { success: false, error: '无法获取刷新后的 Cookie' }
    }

    // 验证新 cookie 是否有效
    const { isValid } = await validateLoginStatus(newCookie)
    if (isValid) {
      persistCookie(newCookie, true)
      return { success: true, newCookie }
    }

    return { success: false, error: '刷新后的 Cookie 仍然无效' }
  } catch (err: any) {
    return { success: false, error: err.message || '网络错误' }
  }
}
