/* eslint-disable no-restricted-globals */

// Minimal PWA service worker (prototype).
// Cache static assets for offline use; use network-first for navigations.

// Bump to flush stale app shells that can blank-screen after deploys.
const CACHE = 'wph-cache-v5-pwa';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        // These are relative to the SW scope (GitHub Pages subpath safe).
        './',
        './index.html',
        './manifest.webmanifest',
        './app-icon.png',
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
        Promise.all(
          keys.map((k) => {
            // Remove older WPH caches (and anything not matching the current one).
            if (k === CACHE) return Promise.resolve();
            if (String(k).startsWith('wph-cache-')) return caches.delete(k);
            return Promise.resolve();
          }),
        ),
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
      // Force a real network revalidation for the app shell. This avoids blank screens where
      // an older cached index.html references JS chunks that no longer exist after deploy.
      fetch(request, { cache: 'no-store' })
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

