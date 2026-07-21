/**
 * Toast notification store.
 * Manages a queue of toast notifications with auto-dismiss.
 */

import { create } from 'zustand'

/* ── Types ── */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  /** Auto-dismiss duration in ms. 0 = sticky (manual dismiss). */
  duration: number
  /** Timestamp when created */
  createdAt: number
}

interface ToastStore {
  toasts: Toast[]

  /* Actions */
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  clearAll: () => void

  /* Convenience methods */
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

/* ── Store ── */

let toastCounter = 0

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (type, message, duration = 4000) => {
    const id = `toast_${Date.now()}_${++toastCounter}`
    const toast: Toast = { id, type, message, duration, createdAt: Date.now() }
    set((s) => ({ toasts: [...s.toasts, toast] }))

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  clearAll: () => set({ toasts: [] }),

  success: (message, duration) => get().addToast('success', message, duration),
  error: (message, duration) => get().addToast('error', message, duration ?? 6000),
  warning: (message, duration) => get().addToast('warning', message, duration ?? 5000),
  info: (message, duration) => get().addToast('info', message, duration),
}))
