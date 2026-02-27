/**
 * sw.js — viadecide.com Service Worker
 * Provides offline support and caching for the PWA.
 */

var CACHE_NAME = "viadecide-v1";

// Core files to cache on install
var PRECACHE_URLS = [
  "/",
  "/index.html",
  "/router.js",
  "/manifest.json"
];

// ---- Install: precache core assets ----
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ---- Activate: clean up old caches ----
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ---- Fetch: network-first, fallback to cache ----
self.addEventListener("fetch", function (event) {
  var req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  // Skip cross-origin requests (CDN fonts, analytics, etc.)
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip Vercel analytics / speed insights
  if (url.pathname.startsWith("/_vercel")) return;

  event.respondWith(
    fetch(req)
      .then(function (networkResponse) {
        // Cache a clone of the successful response
        if (networkResponse && networkResponse.status === 200) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(function () {
        // Network failed — try cache
        return caches.match(req).then(function (cached) {
          if (cached) return cached;
          // For navigation requests, return index.html as fallback
          if (req.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
