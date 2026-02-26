const CACHE_NAME = 'bihunters-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const PRECACHE_FONTS = [
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
          console.log('[SW] Cached:', asset);
        } catch (err) {
          console.warn('[SW] Failed to cache:', asset);
        }
      }

      for (const url of PRECACHE_FONTS) {
        try {
          const response = await fetch(new Request(url, { mode: 'no-cors' }));
          await cache.put(url, response);
          console.log('[SW] Cached font:', url);
        } catch {
          console.warn('[SW] Font unavailable offline:', url);
        }
      }

      await self.skipWaiting();
    })()
  );
});


self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;

  const url = new URL(request.url);

  const isLocal = url.origin === self.location.origin;
  const isFont  = url.hostname === 'fonts.googleapis.com' ||
                  url.hostname === 'fonts.gstatic.com';

  if (isLocal || isFont) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(
      `<!DOCTYPE html>
       <html>
       <head><meta charset="UTF-8"><title>BiHunters — Offline</title></head>
       <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
                    background:#060709;font-family:monospace;color:#c8a84b;text-align:center;">
         <div>
           <div style="font-size:3rem;margin-bottom:1rem;">◈</div>
           <h1 style="letter-spacing:.2em;margin:0">BIHUNTERS</h1>
           <p style="color:#4a5560;letter-spacing:.15em;margin-top:.5rem">YOU ARE OFFLINE</p>
           <p style="color:#4a5560;font-size:.75rem;margin-top:2rem">Reconnect to browse lobbies</p>
         </div>
       </body>
       </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-party-join') {
    event.waitUntil(
      console.log('[SW] Background sync: retrying queued party joins')
    );
  }
});

self.addEventListener('push', event => {
  const data    = event.data?.json() ?? {};
  const title   = data.title || 'BiHunters';
  const options = {
    body:    data.body || 'A new party is waiting for you.',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    vibrate: [100, 50, 100],
    data:    { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});