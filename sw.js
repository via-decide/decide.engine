const CACHE_NAME = 'viadecide-engine-cache-v2';

// Add the core URLs you want to pre-cache on install.
// Added the sub-pages referenced in your index.html so they work offline.
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './alchemist.html',
  './brief.html',
  './cashback-claim.html',
  './cashback-rules.html',
  './contact.html',
  './decision-brief.html',
  './engine-deals.html',
  './engine-license.html',
  './ONDC-demo.html',
  './PromptAlchemy.html',
  './StudentResearch.html',
  './SwipeOS?.html'
];

// 1. Install Event: Pre-caches the core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching offline pages');
        // Using addAll with a soft fail (catch) so a single missing file doesn't halt the whole worker installation
        return Promise.all(
          URLS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => console.warn(`[ServiceWorker] Failed to cache ${url}`, err));
          })
        );
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// 2. Activate Event: Cleans up old, outdated caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control of the page immediately
  self.clients.claim();
});

// 3. Fetch Event: Intercepts network requests
self.addEventListener('fetch', event => {
  // Skip cross-origin requests (like Wikipedia API calls) from being forced into the local cache aggressively, 
  // or handle them gracefully.
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes('fonts.googleapis.com') && !event.request.url.includes('cdnjs.cloudflare.com') && !event.request.url.includes('cdn.jsdelivr.net')) {
    return; // Let the browser handle standard API requests directly
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network
        return fetch(event.request).then(networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            // If it's a valid external resource (like a font or CDN script), cache it anyway
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'cors') {
               const responseToCache = networkResponse.clone();
               caches.open(CACHE_NAME).then(cache => {
                 cache.put(event.request, responseToCache);
               });
            }
            return networkResponse;
          }

          // Clone the response because it's a stream and can only be consumed once
          const responseToCache = networkResponse.clone();

          // Dynamically cache new local files as they are visited
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(() => {
          // Optional: Return a fallback page if the network fails and it's a navigation request
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
