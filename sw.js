// sw.js — Service Worker for viadecide.com
// Cache-busting strategy: Network-first with versioned cache

const CACHE_VERSION = 'vd-v' + Date.now(); // Dynamic version on each SW install
const STATIC_CACHE = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

// Files to precache (adjust paths as needed)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
];

// Install: cache core assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Force activate immediately
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: delete ALL old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // Take control of all pages immediately
  );
});

// Fetch: Network-first strategy (always try network, fallback to cache)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin analytics, chrome-extension
  if (request.method !== 'GET') return;
  if (url.hostname.includes('vercel') && url.pathname.includes('insights')) return;
  if (url.protocol === 'chrome-extension:') return;

  // HTML pages: always network-first, no caching (always fresh)
  if (request.headers.get('Accept')?.includes('text/html') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JS/CSS: Network-first with short cache
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets (fonts, images): Cache-first (they rarely change)
  if (url.pathname.match(/\.(woff2?|ttf|eot|png|jpg|jpeg|webp|svg|ico|gltf|glb)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: Network-first
  event.respondWith(
    fetch(request, { cache: 'no-cache' }).catch(() => caches.match(request))
  );
});

// Listen for SKIP_WAITING message from app
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
