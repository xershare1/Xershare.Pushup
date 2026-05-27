/// <reference lib="webworker" />

import { clientsClaim, skipWaiting } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'

/** Injected in vite.config.ts (must match `public/models/pose/pose-cache-manifest.json`). */
declare const __POSE_MODEL_CACHE_NAME__: string

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null | undefined })[] }

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

const POSE_CACHE_PREFIX = 'pushup-pros-pose-model-'
const POSE_CACHE_NAME: string = __POSE_MODEL_CACHE_NAME__

registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    url.pathname.startsWith('/models/pose/') &&
    request.method === 'GET',
  async ({ request }) => {
    const cache = await caches.open(POSE_CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
    }
    return response
  },
)

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(POSE_CACHE_PREFIX) && key !== POSE_CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
})

skipWaiting()
clientsClaim()
