import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ── Types ── */

interface UserPrefsStore {
  /** UI theme — dark is default for a download tool (nighttime usage). */
  theme: 'light' | 'dark'
  /** Default download directory path. */
  downloadPath: string
  /** Preferred video quality for new downloads. */
  preferredQuality: string
  /** Preferred file format. */
  preferredFormat: string
  /** Auto-start downloads when items are queued. */
  autoStart: boolean
  /** Max concurrent downloads. */
  maxConcurrent: number
  /** B站登录 Cookie 字符串（SESSDATA 等） */
  cookieStr: string
  /** 登录用户名（空 = 未登录） */
  loginName: string
  /** 登录用户头像 URL */
  loginFace: string
  /** Cookie 有效性状态（非持久化，仅运行时） */
  cookieStatus: 'unknown' | 'valid' | 'expired' | 'checking'
  /** Cookie 验证返回的用户名（用于过期提示） */
  cookieUsername: string | null

  /* Actions */
  setTheme: (theme: 'light' | 'dark') => void
  setDownloadPath: (path: string) => void
  setPreferredQuality: (quality: string) => void
  setPreferredFormat: (format: string) => void
  setAutoStart: (v: boolean) => void
  setMaxConcurrent: (n: number) => void
  setLoginInfo: (cookieStr: string, name: string, face: string) => void
  clearLoginInfo: () => void
  setCookieStatus: (status: UserPrefsStore['cookieStatus']) => void
  setCookieUsername: (name: string | null) => void
}

/* ── Store ── */

export const useUserPrefsStore = create<UserPrefsStore>()(
  persist(
    (set) => ({
      /* Defaults */
      theme: 'dark',
      downloadPath: '',
      preferredQuality: '1080P60',
      preferredFormat: 'mp4',
      autoStart: true,
      maxConcurrent: 3,
      cookieStr: '',
      loginName: '',
      loginFace: '',
      cookieStatus: 'unknown',
      cookieUsername: null,

      /* Actions */
      setTheme: (theme) => set({ theme }),
      setDownloadPath: (downloadPath) => set({ downloadPath }),
      setPreferredQuality: (preferredQuality) => set({ preferredQuality }),
      setPreferredFormat: (preferredFormat) => set({ preferredFormat }),
      setAutoStart: (autoStart) => set({ autoStart }),
      setMaxConcurrent: (maxConcurrent) => set({ maxConcurrent }),
      setLoginInfo: (cookieStr, loginName, loginFace) =>
        set({ cookieStr, loginName, loginFace }),
      clearLoginInfo: () => set({ cookieStr: '', loginName: '', loginFace: '' }),
      setCookieStatus: (cookieStatus) => set({ cookieStatus }),
      setCookieUsername: (cookieUsername) => set({ cookieUsername }),
    }),
    {
      name: 'bilibilidown-prefs',
      /* Only persist these keys */
      partialize: (state) => ({
        theme: state.theme,
        downloadPath: state.downloadPath,
        preferredQuality: state.preferredQuality,
        preferredFormat: state.preferredFormat,
        autoStart: state.autoStart,
        maxConcurrent: state.maxConcurrent,
        cookieStr: state.cookieStr,
        loginName: state.loginName,
        loginFace: state.loginFace,
      }),
    }
  )
)
