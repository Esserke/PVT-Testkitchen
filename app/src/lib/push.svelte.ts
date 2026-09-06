// Web push: ask the browser, subscribe, and tell the notify function about it.
import { supabase } from './supabase'

export const push = $state<{ supported: boolean; permission: NotificationPermission; subscribed: boolean; busy: boolean; error: string | null }>({
  supported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  subscribed: false,
  busy: false,
  error: null,
})

function urlBase64ToBytes(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Notifications need the online version of the app.')
  const { data, error } = await supabase.functions.invoke('notify', { body: { action, ...body } })
  if (error) {
    let msg = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') msg = (await ctx.json()).error ?? msg
    } catch { /* keep msg */ }
    throw new Error(msg)
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data as T
}

export async function refreshPush(): Promise<void> {
  if (!push.supported) return
  push.permission = Notification.permission
  try {
    const reg = await navigator.serviceWorker.ready
    push.subscribed = !!(await reg.pushManager.getSubscription())
  } catch {
    push.subscribed = false
  }
}

export async function enablePush(label: string): Promise<boolean> {
  if (!push.supported) {
    push.error = 'This browser cannot show notifications.'
    return false
  }
  push.busy = true
  push.error = null
  try {
    const permission = await Notification.requestPermission()
    push.permission = permission
    if (permission !== 'granted') {
      push.error = permission === 'denied' ? 'Notifications are blocked for this site in the browser settings.' : 'Notifications were not allowed.'
      return false
    }
    const { public_key } = await call<{ public_key: string }>('public_key')
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(public_key) }))
    await call('subscribe', { subscription: sub.toJSON(), label })
    push.subscribed = true
    return true
  } catch (e) {
    push.error = e instanceof Error ? e.message : String(e)
    return false
  } finally {
    push.busy = false
  }
}

export async function disablePush(): Promise<void> {
  push.busy = true
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await call('unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined)
      await sub.unsubscribe()
    }
    push.subscribed = false
  } finally {
    push.busy = false
  }
}

export const testPush = () => call<{ sent: number }>('test')
