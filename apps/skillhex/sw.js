/* ═══ SkillHex Service Worker — UPG-01 ═══════════════════════════
   Cache strategy: Cache-first for static shell, network-first for
   Firebase API calls. TWA (Play Store) requires SW for reliable
   offline splash and pass-through behaviour.
 ════════════════════════════════════════════════════════════════ */

const CACHE_NAME   = 'skillhex-v3';
const OFFLINE_URL  = 'index.html';

/* Assets to pre-cache on install */
const PRECACHE = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  /* Google Fonts — cached on first fetch via runtime strategy below */
];

/* ── Install: pre-cache shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())   /* activate immediately */
  );
});

/* ── Activate: delete stale caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  /* take control without reload */
  );
});

/* ── Fetch: routing strategy ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* 1. Firebase / Firestore / Auth — always network, never cache */
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  /* 2. Google Fonts — stale-while-revalidate (fast load + fresh copy) */
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            cache.put(request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  /* 3. Same-origin GET — cache-first, fall back to network, then offline page */
  if (request.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => {
            /* Cache successful same-origin responses */
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
          })
          .catch(() =>
            /* Offline fallback — serve the app shell */
            caches.match(OFFLINE_URL)
          );
      })
    );
    return;
  }

  /* 4. Everything else — network only */
  event.respondWith(fetch(request));
});
