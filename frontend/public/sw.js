// POS Offline Service Worker
const CACHE_NAME = 'pos-shell-v1';

// ─── Install: cache nothing upfront; pages get cached on first visit ──────────
self.addEventListener('install', () => self.skipWaiting());

// ─── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first for navigation; cache-first for static assets ───────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages): network-first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // JS / CSS / fonts / images: cache-first
  if (
    request.destination === 'script' ||
    request.destination === 'style'  ||
    request.destination === 'font'   ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
          return res;
        });
      })
    );
  }
});

// ─── Background Sync: notify clients to drain the sales queue ─────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sales-sync') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_SALES' }));
      })
    );
  }
});
