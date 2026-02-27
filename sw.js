// sw.js
'use strict';

const VERSION = 'v1.0.0';
const CACHE_NAME = `viadecide-${VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './router.js',

  // Subpages (same folder as index.html)
  './StudentResearch.html',
  './SwipeOS.html',
  './Brief.html',
  './DecisionBrief.html',
  './PromptAlchemy.html',
  './alchemist.html',
  './ONDC-demo.html',
  './engine-license.html',

  // Assets (DO NOT append affiliate params anywhere)
  './assets/viadecide-3d.gltf',
  './assets/viadecide-3d.bin',
  './assets/product-3d-poster.jpg',
  './assets/product-engine-pro.jpg',
  './assets/product-ondc.jpg',
  './assets/product-promptalchemy.jpg',
  './assets/product-alchemist.jpg',

  // External model-viewer is served from CDN; it will be runtime-cached via fetch handler if allowed
];

function isSameOrigin(url) {
  try { return new URL(url, self.location.href).origin === self.location.origin; }
  catch (e) { return false; }
}

function isNavigationRequest(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));
}

function stripAffiliate(url) {
  try {
    const u = new URL(url, self.location.href);
    u.searchParams.delete('tag');
    u.searchParams.delete('aff');
    return u.href;
  } catch (e) {
    return url;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? Promise.resolve() : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignore chrome-extension and other non-http(s)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Treat same-origin requests: cache-first for static assets, network-first for html navigations
  if (isSameOrigin(req.url)) {
    if (isNavigationRequest(req)) {
      event.respondWith((async () => {
        try {
          // Network-first for latest HTML, but cache for offline
          const net = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(stripAffiliate(req.url), net.clone());
          return net;
        } catch (e) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(stripAffiliate(req.url), { ignoreSearch: true });
          if (cached) return cached;
          return cache.match('./index.html', { ignoreSearch: true });
        }
      })());
      return;
    }

    // Cache-first for same-origin non-navigation (assets)
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const key = stripAffiliate(req.url);
      const cached = await cache.match(key, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const net = await fetch(req);
        // Only cache successful basic/cors responses
        if (net && (net.status === 200 || net.type === 'opaque')) {
          cache.put(key, net.clone());
        }
        return net;
      } catch (e) {
        // Best-effort fallback to cache
        const fallback = await cache.match(key, { ignoreSearch: true });
        if (fallback) return fallback;
        throw e;
      }
    })());
    return;
  }

  // Cross-origin: runtime cache (best effort), but don't break if opaque
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const net = await fetch(req);
      if (net && (net.status === 200 || net.type === 'opaque')) {
        cache.put(req, net.clone());
      }
      return net;
    } catch (e) {
      if (cached) return cached;
      throw e;
    }
  })());
});
