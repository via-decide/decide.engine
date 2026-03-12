const CACHE_NAME = 'skillhex-shell-v1';
const APP_URL = '/skillhex/';
const SHELL_ASSETS = [
  '/skillhex/',
  '/skillhex/index.html',
  '/skillhex/manifest.json',
  '/skillhex/icons/icon-192.png',
  '/skillhex/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&family=Share+Tech+Mono&display=swap',
  'https://fonts.gstatic.com',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  const isFirebase = /googleapis\.com|firebaseio\.com|gstatic\.com/.test(url.hostname);

  if (isFirebase) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});

self.addEventListener('push', event => {
  const data = (() => {
    try { return event.data ? event.data.json() : {}; } catch (_) { return {}; }
  })();
  event.waitUntil(self.registration.showNotification(data.title || 'SkillHex', {
    body: data.body || 'New mission update available',
    icon: '/skillhex/icons/icon-192.png',
    badge: '/skillhex/icons/icon-192.png'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(APP_URL));
});
