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
  /** Preferred video file format. */
  preferredFormat: string
  /** Preferred audio file format. */
  preferredAudioFormat: 'm4a' | 'm4s' | 'mp3'
  /** Auto-start downloads when items are queued. */
  autoStart: boolean
  /** Max concurrent downloads. */
  maxConcurrent: number
  /** Show system notification when download completes. */
  downloadNotify: boolean
  /** Auto-open folder after download completes. */
  openFolderAfterDownload: boolean
  /** Max retry count for failed downloads. */
  maxRetries: number
  /** Download danmaku (barrage) alongside video. */
  downloadDanmaku: boolean
  /** Download subtitles alongside video. */
  downloadSubtitle: boolean
  /** Custom filename template. */
  filenameTemplate: string
  /** Minimize to system tray on app launch. */
  minimizeToTray: boolean
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
  /** UI 主题色 */
  accentColor: string
  /** 下载面板宽度 (px)，用户可拖拽调整 */
  panelWidth: number
  /** 下载面板是否收起 */
  panelCollapsed: boolean
  /** 下载模式选择方式：弹窗 / 内联 */
  downloadModeStyle: 'popup' | 'inline'
  /** 解析结果是否显示视频封面图 */
  showCoverImage: boolean

  /* Actions */
  setTheme: (theme: 'light' | 'dark') => void
  setDownloadPath: (path: string) => void
  setPreferredQuality: (quality: string) => void
  setPreferredFormat: (format: string) => void
  setPreferredAudioFormat: (format: 'm4a' | 'm4s' | 'mp3') => void
  setAutoStart: (v: boolean) => void
  setMaxConcurrent: (n: number) => void
  setDownloadNotify: (v: boolean) => void
  setOpenFolderAfterDownload: (v: boolean) => void
  setMaxRetries: (n: number) => void
  setDownloadDanmaku: (v: boolean) => void
  setDownloadSubtitle: (v: boolean) => void
  setFilenameTemplate: (t: string) => void
  setMinimizeToTray: (v: boolean) => void
  setLoginInfo: (cookieStr: string, name: string, face: string) => void
  clearLoginInfo: () => void
  setCookieStatus: (status: UserPrefsStore['cookieStatus']) => void
  setCookieUsername: (name: string | null) => void
  setAccentColor: (color: string) => void
  setPanelWidth: (w: number) => void
  setPanelCollapsed: (v: boolean) => void
  setDownloadModeStyle: (v: 'popup' | 'inline') => void
  setShowCoverImage: (v: boolean) => void
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
      preferredAudioFormat: 'm4a',
      autoStart: true,
      maxConcurrent: 3,
      downloadNotify: true,
      openFolderAfterDownload: false,
      maxRetries: 3,
      downloadDanmaku: false,
      downloadSubtitle: false,
      filenameTemplate: '{title}_{quality}',
      minimizeToTray: false,
      cookieStr: '',
      loginName: '',
      loginFace: '',
      cookieStatus: 'unknown',
      cookieUsername: null,
      accentColor: 'blue',
      panelWidth: 320,
      panelCollapsed: false,
      downloadModeStyle: 'popup',
      showCoverImage: true,

      /* Actions */
      setTheme: (theme) => set({ theme }),
      setDownloadPath: (downloadPath) => set({ downloadPath }),
      setPreferredQuality: (preferredQuality) => set({ preferredQuality }),
      setPreferredFormat: (preferredFormat) => set({ preferredFormat }),
      setPreferredAudioFormat: (preferredAudioFormat) => set({ preferredAudioFormat }),
      setAutoStart: (autoStart) => set({ autoStart }),
      setMaxConcurrent: (maxConcurrent) => set({ maxConcurrent }),
      setDownloadNotify: (downloadNotify) => set({ downloadNotify }),
      setOpenFolderAfterDownload: (openFolderAfterDownload) => set({ openFolderAfterDownload }),
      setMaxRetries: (maxRetries) => set({ maxRetries }),
      setDownloadDanmaku: (downloadDanmaku) => set({ downloadDanmaku }),
      setDownloadSubtitle: (downloadSubtitle) => set({ downloadSubtitle }),
      setFilenameTemplate: (filenameTemplate) => set({ filenameTemplate }),
      setMinimizeToTray: (minimizeToTray) => set({ minimizeToTray }),
      setLoginInfo: (cookieStr, loginName, loginFace) =>
        set({ cookieStr, loginName, loginFace }),
      clearLoginInfo: () => set({ cookieStr: '', loginName: '', loginFace: '' }),
      setCookieStatus: (cookieStatus) => set({ cookieStatus }),
      setCookieUsername: (cookieUsername) => set({ cookieUsername }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setPanelWidth: (panelWidth) => set({ panelWidth }),
      setPanelCollapsed: (panelCollapsed) => set({ panelCollapsed }),
      setDownloadModeStyle: (downloadModeStyle) => set({ downloadModeStyle }),
      setShowCoverImage: (showCoverImage) => set({ showCoverImage }),
    }),
    {
      name: 'bibilidown-prefs',
      /** Opt out of automatic hydration — we manually call rehydrate() in App.tsx
       *  to avoid the zustand v5 persist infinite re-render cycle. */
      skipHydration: true,
      /* Only persist these keys */
      partialize: (state) => ({
        theme: state.theme,
        downloadPath: state.downloadPath,
        preferredQuality: state.preferredQuality,
        preferredFormat: state.preferredFormat,
        preferredAudioFormat: state.preferredAudioFormat,
        autoStart: state.autoStart,
        maxConcurrent: state.maxConcurrent,
        downloadNotify: state.downloadNotify,
        openFolderAfterDownload: state.openFolderAfterDownload,
        maxRetries: state.maxRetries,
        downloadDanmaku: state.downloadDanmaku,
        downloadSubtitle: state.downloadSubtitle,
        filenameTemplate: state.filenameTemplate,
        minimizeToTray: state.minimizeToTray,
        cookieStr: state.cookieStr,
        loginName: state.loginName,
        loginFace: state.loginFace,
        accentColor: state.accentColor,
        panelWidth: state.panelWidth,
        panelCollapsed: state.panelCollapsed,
        downloadModeStyle: state.downloadModeStyle,
        showCoverImage: state.showCoverImage,
      }),
    }
  )
)
