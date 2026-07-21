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
const PASSPORT_BASE = '/api/passport' // 登录 / 通行证 API 走 passport.bilibili.com

const UA_PC =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** 仅在开发模式下输出日志，避免生产环境轮询日志刷屏 */
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
function devLog(...args: any[]) {
  if (isDev) console.log(...args)
}

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
  captchaRequired?: boolean
  loginParams?: { username: string; encryptedPwd: string }
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
  const url = `${PASSPORT_BASE}/x/passport-login/web/qrcode/generate?source=main-fe`
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
  const url = `${PASSPORT_BASE}/x/passport-login/web/qrcode/poll?source=main-fe&qrcode_key=${qrcodeKey}`
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
  const dataCode = (json as any).data?.code
  const topCode = (json as any).code
  const code: number = dataCode ?? topCode

  // Debug: log poll response so we can diagnose login issues (dev only)
  devLog(`[QR poll] top.code=${topCode} data.code=${dataCode} resolved=${code}`)

  switch (code) {
    case 0: {
      // 扫码成功！提取 Set-Cookie
      const cookieStr = extractBiliCookies()
      devLog(`[QR poll] SUCCESS — cookie extracted: ${cookieStr ? 'YES' : 'NO'} (len=${cookieStr?.length ?? 0})`)
      return { status: 'success', cookieStr }
    }
    case 86038:
      devLog('[QR poll] EXPIRED')
      return { status: 'expired' }
    case 86090:
      devLog('[QR poll] SCANNED')
      return { status: 'scanned' }
    case 86101:
      devLog('[QR poll] WAITING (86101)')
      return { status: 'waiting' }
    default:
      devLog(`[QR poll] UNKNOWN code=${code} — treating as waiting`)
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
 *
 * @param username 手机号或邮箱
 * @param password 明文密码
 * @param captcha 可选 — 极验验证码 token（重试时传入）
 * @param encryptedPwd 可选 — 已加密的密码（重试时跳过 RSA 加密步骤）
 */
export async function loginWithPassword(
  username: string,
  password: string,
  captcha?: { challenge: string; validate: string; seccode: string },
  encryptedPwd?: string
): Promise<LoginResult> {
  try {
    let finalEncryptedPwd = encryptedPwd

    if (!finalEncryptedPwd) {
      // 1. 获取公钥
      const { hash, pubKey } = await getLoginKey()

      // 2. RSA 加密密码
      finalEncryptedPwd = await rsaEncrypt(hash + password, pubKey)
    }

    // 3. 提交登录
    const url = `${PASSPORT_BASE}/x/passport-login/web/login`
    const params = new URLSearchParams({
      username,
      password: finalEncryptedPwd,
      keep: '0',
      source: 'main_mini',
      token: '',
      go_url: 'https://www.bilibili.com',
      challenge: captcha?.challenge ?? '',
      validate: captcha?.validate ?? '',
      seccode: captcha?.seccode ?? '',
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
      // 需要验证码 — 返回验证码状态让调用方启动 GeeTest
      return {
        success: false,
        captchaRequired: true,
        loginParams: { username, encryptedPwd: finalEncryptedPwd },
      }
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

/**
 * 获取 GeeTest 极验验证码初始化参数。
 * 当密码登录返回 captchaRequired 时调用。
 * 调用 GET /x/passport-login/captcha?source=main_mini
 */
export async function getCaptchaData(): Promise<{
  gt: string
  challenge: string
  success: number
}> {
  const url = `${PASSPORT_BASE}/x/passport-login/captcha?source=main_mini`
  const res = await fetch(url, { headers: getLoginHeaders() })
  const json = await res.json()
  if (json.code !== 0 || !json.data) {
    throw new Error(json.message || '获取验证码数据失败')
  }
  const geetest = json.data.geetest ?? json.data
  return {
    gt: geetest.gt ?? '',
    challenge: geetest.challenge ?? '',
    success: geetest.success ?? 1,
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
