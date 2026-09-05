export const toast = $state<{ message: string | null; undo: (() => Promise<void> | void) | null }>({ message: null, undo: null })
let timer: ReturnType<typeof setTimeout> | undefined

export function showToast(message: string, undo: (() => Promise<void> | void) | null = null, ms = 5000): void {
  toast.message = message
  toast.undo = undo
  clearTimeout(timer)
  timer = setTimeout(hideToast, ms)
}

export function hideToast(): void {
  toast.message = null
  toast.undo = null
}
