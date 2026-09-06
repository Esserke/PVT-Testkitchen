/// <reference lib="webworker" />
// Service worker: offline precache plus push notifications.
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

interface Push {
  title: string
  body: string
  tag?: string
  path?: string
}

self.addEventListener('push', (event) => {
  let data: Push = { title: 'Larder', body: 'Something needs a look.' }
  try {
    if (event.data) data = { ...data, ...(event.data.json() as Push) }
  } catch {
    if (event.data) data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag ?? 'larder',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { path: data.path ?? '#/today' },
    }),
  )
})

// Focus an open tab if there is one, otherwise open the app at the right screen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = (event.notification.data?.path as string) ?? '#/today'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const scope = self.registration.scope
      for (const client of all) {
        if (client.url.startsWith(scope)) {
          await client.focus()
          if ('navigate' in client) await client.navigate(scope + path).catch(() => undefined)
          return
        }
      }
      await self.clients.openWindow(scope + path)
    })(),
  )
})
