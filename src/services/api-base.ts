/**
 * 统一 API base URL 入口。
 *
 * 生产 Electron（file:// 协议）需要完整绝对 URL，
 * 开发模式（无论浏览器还是 Electron）走 Vite 代理。
 */

import { isElectron } from '../utils/env'

// B 站 API 真实域名
const BILIBILI_API = 'https://api.bilibili.com'
const BILIBILI_PASSPORT = 'https://passport.bilibili.com'

/** B 站主 API base：生产 Electron 用绝对 URL，其他环境走 Vite 代理 */
export const API_BASE = (isElectron() && !import.meta.env.DEV) ? BILIBILI_API : '/api/bilibili'

/** B 站通行证 API base：生产 Electron 用绝对 URL，其他环境走 Vite 代理 */
export const PASSPORT_BASE = (isElectron() && !import.meta.env.DEV) ? BILIBILI_PASSPORT : '/api/passport'
