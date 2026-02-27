/**
 * ═══════════════════════════════════════════════════════════════
 *  ViaDecide — Service Worker
 *  File: /service-worker.js   (MUST be at server root)
 *
 *  STRATEGY:
 *   • HTML pages   → Network-first  (always fresh, fallback to cache)
 *   • Static assets → Cache-first   (fast, update in background)
 *   • External URLs → Network-only  (CDN, APIs — never cached here)
 *
 *  HOW TO UPDATE:
 *   Bump CACHE_VERSION when you deploy new assets.
 *   Old caches are deleted automatically on activate.
 * ═══════════════════════════════════════════════════════════════
 */

const CACHE_VERSION = "viadecide-v1";

/**
 * PRECACHE LIST
 * These files are downloaded and cached during SW install.
 * Add any new pages or assets here.
 *
 * ⚠️  Every file in this list MUST exist and return HTTP 200.
 *     A single 404 will abort the SW install entirely.
 */
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

/* ─────────────────────────────────────────────────────────────
   INSTALL
   Pre-cache the critical shell assets.
   skipWaiting() activates the new SW immediately without waiting
   for existing tabs to close.
───────────────────────────────────────────────────────────── */
self.addEventListener("install", event => {
  console.log("[ViaDecide SW] Installing version:", CACHE_VERSION);

  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => {
        console.log("[ViaDecide SW] Pre-caching assets...");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log("[ViaDecide SW] Pre-cache complete.");
        // Activate immediately — don't wait for old tabs to close
        return self.skipWaiting();
      })
      .catch(err => {
        console.error("[ViaDecide SW] Pre-cache FAILED:", err);
        // If a file in PRECACHE_ASSETS returns 404, you'll see it here.
        // Fix the path or remove it from the list.
      })
  );
});

/* ─────────────────────────────────────────────────────────────
   ACTIVATE
   Delete all caches that don't match CACHE_VERSION.
   This cleans up old versioned caches automatically.
───────────────────────────────────────────────────────────── */
self.addEventListener("activate", event => {
  console.log("[ViaDecide SW] Activating version:", CACHE_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_VERSION)
            .map(name => {
              console.log("[ViaDecide SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        )
      )
      .then(() => {
        console.log("[ViaDecide SW] Activated. Claiming clients...");
        // Take control of all open tabs immediately
        return self.clients.claim();
      })
  );
});

/* ─────────────────────────────────────────────────────────────
   FETCH
   Intercepts every network request from the page.
───────────────────────────────────────────────────────────── */
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // ── 1) Only handle GET requests ──────────────────────────
  if (request.method !== "GET") return;

  // ── 2) Skip external origins (CDN, APIs, analytics) ──────
  //    These are handled by the browser normally.
  if (url.origin !== self.location.origin) return;

  // ── 3) Skip browser extension requests ───────────────────
  if (url.protocol === "chrome-extension:") return;

  // ── 4) HTML pages → Network-first ────────────────────────
  //    Try the network first for freshness.
  //    If offline, fall back to cache.
  //    Last resort: serve the root index page.
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // ── 5) Static assets → Cache-first ───────────────────────
  //    Serve from cache instantly, update cache in background.
  event.respondWith(cacheFirstAsset(request));
});

/* ─────────────────────────────────────────────────────────────
   STRATEGY: Network-first (for HTML pages)
───────────────────────────────────────────────────────────── */
async function networkFirstHTML(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache a fresh copy on success
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (err) {
    // Offline — try cache
    console.warn("[ViaDecide SW] Network failed for HTML, trying cache:", request.url);
    const cached = await caches.match(request);
    if (cached) return cached;

    // Final fallback: serve root page for any HTML request
    const rootFallback = await caches.match("/");
    if (rootFallback) return rootFallback;

    // Absolute last resort
    return new Response("ViaDecide is offline. Please reconnect.", {
      status: 503,
      headers: { "Content-Type": "text/plain" }
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   STRATEGY: Cache-first (for JS, CSS, images, fonts, etc.)
───────────────────────────────────────────────────────────── */
async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  // Not in cache — fetch from network and store
  try {
    const networkResponse = await fetch(request);

    // Only cache valid, same-origin, non-opaque responses
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      networkResponse.type !== "opaque"
    ) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (err) {
    console.warn("[ViaDecide SW] Asset fetch failed (offline?):", request.url);
    // Return a 504 if nothing is available
    return new Response("", { status: 504 });
  }
}

/* ─────────────────────────────────────────────────────────────
   MESSAGE HANDLER
   Allows the page to communicate with the SW.
   Usage from page: navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" })
───────────────────────────────────────────────────────────── */
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
