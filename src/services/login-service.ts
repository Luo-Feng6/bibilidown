/**
 * LoginService — B 站登录服务
 *
 * 参考: src/nicelee/bilibili/INeedLogin.java
 *
 * 支持三种登录方式:
 *   1. 二维码登录 (QR Code) — 推荐
 *   2. 密码登录 (RSA 加密)
 *   3. 短信登录
 *
 * 登录流程:
 *   QR:  generateQrCode() → pollQrStatus() → 成功 → 提取 Cookie
 *   PWD: getLoginKey() → RSA 加密 → login() → 成功 → 提取 Cookie
 *   SMS: sendSmsCode() → loginWithSms() → 成功 → 提取 Cookie
 */

import JSEncrypt from 'jsencrypt'

import {
  getPersistedCookieString,
  persistCookie,
  clearPersistedCookie,
  validateLoginStatus,
  parseCookieString,
} from './cookie-manager'

import type { BiliUserInfo } from './cookie-manager'

/* ── 常量 ── */

const API_BASE = '/api/bilibili'
const PASSPORT_BASE = '/api/bilibili' // 登录 API 也在 api.bilibili.com（passport 子域也用代理）

const UA_PC =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/* ── Types ── */

export type LoginTab = 'qr' | 'password' | 'sms'

export interface QrCodeResult {
  url: string
  qrcodeKey: string
}

export interface LoginResult {
  success: boolean
  error?: string
  user?: BiliUserInfo
  cookieStr?: string
}

/* ── 通用工具 ── */

function getLoginHeaders(): Record<string, string> {
  return {
    'User-Agent': UA_PC,
    Referer: 'https://passport.bilibili.com',
    Origin: 'https://passport.bilibili.com',
    'Content-Type': 'application/x-www-form-urlencoded',
  }
}

/* ── QR 码登录 ── */

/**
 * 生成登录 QR 码。
 * 参考: INeedLogin.getAuthKey()
 *
 * @returns { url, qrcodeKey } — url 为 QR 码内容，qrcodeKey 用于轮询状态
 */
export async function generateQrCode(): Promise<QrCodeResult> {
  const url = `${API_BASE}/x/passport-login/web/qrcode/generate?source=main-web`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA_PC,
      Referer: 'https://www.bilibili.com',
      Origin: 'https://www.bilibili.com',
    },
  })
  const json = await res.json()
  if (json.code !== 0) {
    throw new Error(json.message || '生成二维码失败')
  }
  return {
    url: json.data.url,
    qrcodeKey: json.data.qrcode_key,
  }
}

/**
 * 轮询 QR 码扫描状态。
 * 参考: INeedLogin.getAuthStatus()
 *
 * @returns LoginResult — success=true 表示扫码成功并已确认
 */
export async function pollQrStatus(
  qrcodeKey: string
): Promise<{ status: 'waiting' | 'scanned' | 'expired' | 'success'; cookieStr?: string }> {
  const url = `${API_BASE}/x/passport-login/web/qrcode/poll?source=main-web&qrcode_key=${qrcodeKey}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA_PC,
      Referer: 'https://www.bilibili.com',
      Origin: 'https://www.bilibili.com',
    },
    // 重要: credentials: 'include' 让浏览器自动管理 Set-Cookie
    credentials: 'include',
  })
  const json = await res.json()
  const code = json.data?.code ?? json.code

  switch (code) {
    case 0: {
      // 扫码成功！提取 Set-Cookie
      // 浏览器已自动存储了 cookie，我们需要从 document.cookie 或请求响应中提取
      // 由于 Vite 代理，cookie 被设置在 localhost 域下
      const cookieStr = extractBiliCookies()
      return { status: 'success', cookieStr }
    }
    case 86038:
      return { status: 'expired' }
    case 86090:
      return { status: 'scanned' }
    case 86101:
    default:
      return { status: 'waiting' }
  }
}

/**
 * 从 document.cookie 中提取 B 站相关 cookie。
 * 登录成功后，B 站 API 通过 Vite 代理返回的 Set-Cookie 会被浏览器存储。
 */
function extractBiliCookies(): string {
  // 浏览器存储的 cookie 在 localhost 域下
  const allCookies = document.cookie
  if (!allCookies) return ''

  // 提取关键 cookie
  const keyNames = [
    'SESSDATA',
    'bili_jct',
    'DedeUserID',
    'DedeUserID__ckMd5',
    'buvid3',
    'buvid4',
    'buvid_fp',
    'b_nut',
    '_uuid',
    'b_lsid',
    'sid',
  ]

  const pairs: string[] = []
  const parsed = parseCookieString(allCookies)
  for (const key of keyNames) {
    if (parsed[key]) {
      pairs.push(`${key}=${parsed[key]}`)
    }
  }

  return pairs.join('; ')
}

/* ── 密码登录 ── */

/**
 * 获取 RSA 加密公钥。
 * 参考: INeedLogin.login() 第一步
 */
async function getLoginKey(): Promise<{ hash: string; pubKey: string }> {
  const url = `${PASSPORT_BASE}/x/passport-login/web/key?_=${Date.now()}`
  const res = await fetch(url, { headers: getLoginHeaders() })
  const json = await res.json()
  if (json.code !== 0 || !json.data) {
    throw new Error('获取登录密钥失败')
  }
  return {
    hash: json.data.hash,
    pubKey: json.data.key,
  }
}

/**
 * RSA 加密密码（浏览器端）。
 * 使用 JSEncrypt 库（支持 PKCS1v1.5 padding，与 B 站 Java 后端兼容）。
 * 参考: INeedLogin.encrypt()
 */
function rsaEncrypt(plaintext: string, publicKeyPem: string): string {
  const encrypt = new JSEncrypt()
  encrypt.setPublicKey(publicKeyPem)
  const result = encrypt.encrypt(plaintext)
  if (!result) {
    throw new Error('RSA 加密失败')
  }
  return result
}

/**
 * 密码登录。
 * 参考: INeedLogin.login()
 */
export async function loginWithPassword(
  username: string,
  password: string
): Promise<LoginResult> {
  try {
    // 1. 获取公钥
    const { hash, pubKey } = await getLoginKey()

    // 2. RSA 加密密码
    const encryptedPwd = await rsaEncrypt(hash + password, pubKey)

    // 3. 提交登录
    const url = `${PASSPORT_BASE}/x/passport-login/web/login`
    const params = new URLSearchParams({
      username,
      password: encryptedPwd,
      keep: '0',
      source: 'main_mini',
      token: '',
      go_url: 'https://www.bilibili.com',
      challenge: '',
      validate: '',
      seccode: '',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...getLoginHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      credentials: 'include',
    })

    const json = await res.json()

    if (json.code !== 0) {
      return { success: false, error: json.message || '登录失败' }
    }

    const data = json.data
    if (data?.status === 2) {
      // 需要验证码
      return { success: false, error: data.message || '需要验证码，请使用二维码登录' }
    }

    // 提取 cookie
    if (data?.status === 0 || json.code === 0) {
      const cookieStr = extractBiliCookies()
      if (!cookieStr) {
        // 尝试从 Set-Cookie 响应头获取
        // 由于 CORS 限制，无法直接读取响应头
        return { success: false, error: '登录成功但无法获取 Cookie，请尝试二维码登录' }
      }

      // 验证登录状态
      const { user, isValid } = await validateLoginStatus(cookieStr)
      if (isValid) {
        persistCookie(cookieStr, true)
        return { success: true, user: user ?? undefined, cookieStr }
      }

      return { success: false, error: 'Cookie 无效' }
    }

    return { success: false, error: data?.message || '未知错误' }
  } catch (err: any) {
    return { success: false, error: err.message || '网络错误' }
  }
}

/* ── 短信登录 ── */

/**
 * 发送短信验证码。
 * 参考: INeedLogin.sendSMS()
 */
export async function sendSmsCode(
  phoneNumber: string,
  countryCode: string = '86'
): Promise<{ success: boolean; captchaKey?: string; error?: string }> {
  try {
    const url = `${PASSPORT_BASE}/x/passport-login/web/sms/send`
    const params = new URLSearchParams({
      cid: countryCode,
      tel: phoneNumber,
      source: 'main_mini',
      token: '',
      challenge: '',
      validate: '',
      seccode: '',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...getLoginHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      credentials: 'include',
    })

    const json = await res.json()
    if (json.code !== 0) {
      return { success: false, error: json.message || '发送验证码失败' }
    }
    return { success: true, captchaKey: json.data?.captcha_key }
  } catch (err: any) {
    return { success: false, error: err.message || '网络错误' }
  }
}

/**
 * 短信验证码登录。
 * 参考: INeedLogin.loginSMS()
 */
export async function loginWithSms(
  phoneNumber: string,
  code: string,
  captchaKey: string,
  countryCode: string = '86'
): Promise<LoginResult> {
  try {
    const url = `${PASSPORT_BASE}/x/passport-login/web/login/sms`
    const params = new URLSearchParams({
      cid: countryCode,
      tel: phoneNumber,
      code,
      captcha_key: captchaKey,
      source: 'main_mini',
      go_url: '',
      keep: 'true',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...getLoginHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      credentials: 'include',
    })

    const json = await res.json()
    if (json.code !== 0) {
      return { success: false, error: json.message || '登录失败' }
    }

    const cookieStr = extractBiliCookies()
    if (!cookieStr) {
      return { success: false, error: '登录成功但无法获取 Cookie' }
    }

    const { user, isValid } = await validateLoginStatus(cookieStr)
    if (isValid) {
      persistCookie(cookieStr, true)
      return { success: true, user: user ?? undefined, cookieStr }
    }

    return { success: false, error: 'Cookie 无效' }
  } catch (err: any) {
    return { success: false, error: err.message || '网络错误' }
  }
}

/* ── 登录状态管理 ── */

/**
 * 检查当前是否已登录。
 * 从 localStorage 读取持久化的 Cookie 并验证。
 */
export async function checkLoginState(): Promise<{
  isLoggedIn: boolean
  user: BiliUserInfo | null
  cookieStr: string
}> {
  const cookieStr = getPersistedCookieString()
  if (!cookieStr) {
    return { isLoggedIn: false, user: null, cookieStr: '' }
  }

  const { user, isValid } = await validateLoginStatus(cookieStr)
  if (isValid) {
    return { isLoggedIn: true, user, cookieStr }
  }

  // Cookie 已过期
  clearPersistedCookie()
  return { isLoggedIn: false, user: null, cookieStr: '' }
}

/**
 * 登出：清除所有持久化的 Cookie。
 */
export function logout(): void {
  clearPersistedCookie()
  // 清除浏览器 cookie
  const keyNames = ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5']
  for (const key of keyNames) {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  }
}
