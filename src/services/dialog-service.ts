/**
 * DialogService — programmatic confirm / alert dialogs.
 *
 * Uses ReactDOM.createRoot to render dialogs imperatively.
 *
 * Usage:
 *   const ok = await showConfirm({ title: '确认', message: '确定要删除吗？' })
 *   await showAlert({ message: '操作完成' })
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import ConfirmDialog from '../components/ConfirmDialog'
import type { ConfirmDialogProps } from '../components/ConfirmDialog'
import DownloadChoiceDialog from '../components/DownloadChoiceDialog'
import type { DownloadChoice } from '../components/DownloadChoiceDialog'

/* ── Types ── */

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  /** 'warning' = red confirm button (destructive action), 'info' = accent confirm. */
  variant?: 'warning' | 'info'
}

export interface AlertOptions {
  title?: string
  message: string
  confirmText?: string
  variant?: 'warning' | 'info'
}

/* ── Shared helper ── */

function renderDialog(
  props: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>
): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = () => {
      root.unmount()
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    }

    const handleConfirm = () => {
      cleanup()
      resolve(true)
    }

    const handleCancel = () => {
      cleanup()
      resolve(false)
    }

    root.render(
      React.createElement(ConfirmDialog, {
        ...props,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      })
    )
  })
}

/* ── Public API ── */

/**
 * Show a confirmation dialog. Returns true if user clicks confirm, false if cancel/dismiss.
 */
export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return renderDialog({
    title: options.title,
    message: options.message,
    confirmText: options.confirmText,
    cancelText: options.cancelText,
    showCancel: true,
    variant: options.variant ?? 'warning',
  })
}

/**
 * Show an alert dialog (confirm button only). Resolves when user clicks the button.
 */
export function showAlert(options: AlertOptions): Promise<void> {
  return renderDialog({
    title: options.title,
    message: options.message,
    confirmText: options.confirmText,
    showCancel: false,
    variant: options.variant ?? 'info',
  }).then(() => { /* void */ })
}

/* ── Download choice dialog ── */

export interface DownloadChoiceOptions {
  title: string
  isDash: boolean
  hasVideo: boolean
  hasAudio: boolean
}

/**
 * Show the download-mode selection dialog.
 *
 * - If only audio is available (!hasVideo && hasAudio): resolves 'audio-only' immediately (no UI).
 * - Otherwise renders DownloadChoiceDialog using the same createRoot + React.createElement pattern.
 *
 * Returns the selected mode, or undefined if the user dismissed the dialog.
 */
export function showDownloadChoice(options: DownloadChoiceOptions): Promise<DownloadChoice | undefined> {
  const { title, isDash, hasVideo, hasAudio } = options

  // Pure audio stream → no dialog needed
  if (!hasVideo && hasAudio) {
    return Promise.resolve('audio-only')
  }

  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = () => {
      root.unmount()
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    }

    const handleSelect = (mode: DownloadChoice) => {
      cleanup()
      resolve(mode)
    }

    const handleCancel = () => {
      cleanup()
      resolve(undefined)
    }

    root.render(
      React.createElement(DownloadChoiceDialog, {
        title,
        isDash,
        hasVideo,
        hasAudio,
        onSelect: handleSelect,
        onCancel: handleCancel,
      })
    )
  })
}
