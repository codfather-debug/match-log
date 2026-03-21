const CACHE = 'match-log-v1'

// Static Next.js chunks — cache forever (they're content-hashed)
const isStaticAsset = (url) => url.pathname.startsWith('/_next/static/')

// Skip these entirely (auth, supabase, external APIs)
const isSkippable = (url) =>
  url.pathname.startsWith('/api/') ||
  url.hostname !== self.location.hostname

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (isSkippable(url)) return

  if (isStaticAsset(url)) {
    // Cache-first: static chunks never change
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
            return res
          })
      )
    )
    return
  }

  // Network-first for pages: fresh when online, cached when not, /offline as last resort
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
        }
        return res
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached ?? caches.match('/offline'))
      )
  )
})
