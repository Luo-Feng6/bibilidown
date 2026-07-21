import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserPrefsStore } from './userPrefsStore'

/* ── Types ── */

/** 下载方案 — 保存一组下载相关的设置 */
export interface DownloadPreset {
  id: string
  name: string
  preferredQuality: string
  preferredFormat: string
  preferredAudioFormat: 'm4a' | 'm4s' | 'mp3'
  downloadDanmaku: boolean
  downloadSubtitle: boolean
  filenameTemplate: string
  downloadModeStyle: 'popup' | 'inline'
}

/** 下载方案中各字段的默认值（与 userPrefsStore 保持一致） */
export const PRESET_DEFAULTS: Omit<DownloadPreset, 'id' | 'name'> = {
  preferredQuality: '1080P60',
  preferredFormat: 'mp4',
  preferredAudioFormat: 'm4a',
  downloadDanmaku: false,
  downloadSubtitle: false,
  filenameTemplate: '{title}_{quality}',
  downloadModeStyle: 'popup',
}

interface PresetStore {
  presets: DownloadPreset[]
  activePresetId: string | null

  /** 从当前 userPrefs 快照保存为新方案，返回新方案 id */
  saveCurrentAsPreset: (name: string) => string
  /** 删除方案 */
  deletePreset: (id: string) => void
  /** 应用方案 → 写入 userPrefsStore；id 为 null 则恢复默认 */
  applyPreset: (id: string | null) => void
  /** 重命名方案 */
  renamePreset: (id: string, name: string) => void
}

/* ── Helpers ── */

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 从 userPrefsStore 读取当前的 7 个下载相关设置 */
function snapshotCurrentPrefs(): Omit<DownloadPreset, 'id' | 'name'> {
  const s = useUserPrefsStore.getState()
  return {
    preferredQuality: s.preferredQuality,
    preferredFormat: s.preferredFormat,
    preferredAudioFormat: s.preferredAudioFormat,
    downloadDanmaku: s.downloadDanmaku,
    downloadSubtitle: s.downloadSubtitle,
    filenameTemplate: s.filenameTemplate,
    downloadModeStyle: s.downloadModeStyle,
  }
}

/* ── Store ── */

export const usePresetStore = create<PresetStore>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      saveCurrentAsPreset: (name) => {
        const id = generateId()
        const preset: DownloadPreset = {
          id,
          name: name.trim(),
          ...snapshotCurrentPrefs(),
        }
        set((s) => ({ presets: [...s.presets, preset], activePresetId: id }))
        return id
      },

      deletePreset: (id) => {
        set((s) => {
          const next = s.presets.filter((p) => p.id !== id)
          return {
            presets: next,
            activePresetId: s.activePresetId === id ? null : s.activePresetId,
          }
        })
      },

      applyPreset: (id) => {
        set({ activePresetId: id })

        const prefs = useUserPrefsStore.getState()
        if (id === null) {
          // 恢复默认
          prefs.setPreferredQuality(PRESET_DEFAULTS.preferredQuality)
          prefs.setPreferredFormat(PRESET_DEFAULTS.preferredFormat)
          prefs.setPreferredAudioFormat(PRESET_DEFAULTS.preferredAudioFormat)
          prefs.setDownloadDanmaku(PRESET_DEFAULTS.downloadDanmaku)
          prefs.setDownloadSubtitle(PRESET_DEFAULTS.downloadSubtitle)
          prefs.setFilenameTemplate(PRESET_DEFAULTS.filenameTemplate)
          prefs.setDownloadModeStyle(PRESET_DEFAULTS.downloadModeStyle)
          return
        }

        const preset = get().presets.find((p) => p.id === id)
        if (!preset) return

        prefs.setPreferredQuality(preset.preferredQuality)
        prefs.setPreferredFormat(preset.preferredFormat)
        prefs.setPreferredAudioFormat(preset.preferredAudioFormat)
        prefs.setDownloadDanmaku(preset.downloadDanmaku)
        prefs.setDownloadSubtitle(preset.downloadSubtitle)
        prefs.setFilenameTemplate(preset.filenameTemplate)
        prefs.setDownloadModeStyle(preset.downloadModeStyle)
      },

      renamePreset: (id, name) => {
        set((s) => ({
          presets: s.presets.map((p) =>
            p.id === id ? { ...p, name: name.trim() } : p
          ),
        }))
      },
    }),
    {
      name: 'bibilidown-presets',
      skipHydration: true,
    }
  )
)
