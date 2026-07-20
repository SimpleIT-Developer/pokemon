// Bump this to invalidate every cache on the next deploy.
const VERSION = 'v1'

const SHELL_CACHE = `shell-${VERSION}`
const ASSET_CACHE = `assets-${VERSION}`
const SPRITE_CACHE = `sprites-${VERSION}`

const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add(OFFLINE_URL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const keep = [SHELL_CACHE, ASSET_CACHE, SPRITE_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// Serve from cache, and refresh the entry in the background for next time.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)

  return cached ?? network
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Never touch server actions, API writes, or anything non-GET.
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Pokémon sprites are immutable, so cache them permanently.
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(cacheFirst(request, SPRITE_CACHE))
    return
  }

  if (url.origin !== self.location.origin) return

  // Build output is content-hashed, so a cache hit is always correct.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE))
    return
  }

  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE))
    return
  }

  // Pages render the user's collection, so they must always come from the
  // network. Fall back to the offline page only when the request fails.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE)
        return (await cache.match(OFFLINE_URL)) ?? Response.error()
      })
    )
  }
})
