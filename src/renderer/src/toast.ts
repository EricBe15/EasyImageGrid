export interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

let _toastId = 0
let _toastListener: ((toast: ToastMessage) => void) | null = null

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) {
  const toast: ToastMessage = { id: ++_toastId, message, type, duration }
  _toastListener?.(toast)
}

export function setToastListener(listener: ((toast: ToastMessage) => void) | null) {
  _toastListener = listener
}
