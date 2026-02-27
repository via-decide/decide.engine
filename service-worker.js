  ─── /service-worker.js ──────────────────────────────────────────
  /**
   * ViaDecide Service Worker
   * Strategy: Cache-first for static assets, network-first for HTML.
   * Update the CACHE_VERSION string whenever you deploy new assets.
   */
  const CACHE_VERSION = "viadecide-v1";
  const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
  ];

  // Install: pre-cache critical static assets
  self.addEventListener("install", event => {
    self.skipWaiting();
    event.waitUntil(
      caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
    );
  });

  // Activate: remove old caches
  self.addEventListener("activate", event => {
    event.waitUntil(
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
        )
      ).then(() => self.clients.claim())
    );
  });

  // Fetch: network-first for HTML, cache-first for everything else
  self.addEventListener("fetch", event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) return;

    // HTML pages → network-first (fresh content > offline fallback)
    if (request.headers.get("accept")?.includes("text/html")) {
      event.respondWith(
        fetch(request)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(request, clone));
            return res;
          })
          .catch(() => caches.match(request).then(r => r || caches.match("/")))
      );
      return;
    }

    // Static assets → cache-first
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (!res || res.status !== 200 || res.type === "opaque") return res;
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(request, clone));
          return res;
        });
      })
    );
  });
-->
