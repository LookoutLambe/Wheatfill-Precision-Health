/* eslint-disable no-restricted-globals */

// Minimal PWA service worker (prototype).
// Cache static assets for offline use; use network-first for navigations.

const CACHE = 'wph-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        // These are relative to the SW scope (GitHub Pages subpath safe).
        './',
        './index.html',
        './manifest.webmanifest',
        './favicon.svg',
        './404.html',
      ]),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE ? Promise.resolve() : caches.delete(k)))),
      ),
    ]),
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Network-first for SPA navigations so routes stay fresh.
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          // Always cache the SPA shell, not the specific route URL.
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Cache-first for assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => cached);
    }),
  );
});

