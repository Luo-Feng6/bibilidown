import { useToastStore } from '../stores/toastStore'

/** 复制文本到剪贴板并弹出 toast 提示 */
export async function copyText(text: string, label?: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    useToastStore.getState().success(label ? `已复制${label}` : '已复制到剪贴板')
  } catch {
    // 降级：fallback for older browsers or non-HTTPS
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    useToastStore.getState().success(label ? `已复制${label}` : '已复制到剪贴板')
  }
}
