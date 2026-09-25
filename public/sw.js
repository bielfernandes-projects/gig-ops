self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Offline read: network first; the last successful copy of these pages is the fallback with no signal.
const CACHE = 'gg-pages-v1';
const OFFLINE_PATHS = /^\/(dashboard|agenda|gigs\/[^/]+|repertorio(\/.*)?)$/;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  if (!OFFLINE_PATHS.test(new URL(req.url).pathname)) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || new Response('Sem conexão e esta página ainda não foi aberta neste aparelho.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
  );
});

// Warms the offline cache with pages the user hasn't opened yet (e.g. upcoming shows), so they're
// readable offline even on the first visit. Sent by the client via navigator.serviceWorker.controller.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PREFETCH' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        event.data.urls.map((url) =>
          fetch(url)
            .then((res) => res.ok && cache.put(url, res))
            .catch(() => {})
        )
      )
    )
  );
});

self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nova Gig!';
  const options = {
    body: data.body || 'Você foi escalado para um novo show.',
    icon: '/icon-192x192.png',
    badge: '/badge-icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
