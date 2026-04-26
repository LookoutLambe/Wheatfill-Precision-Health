/* eslint-disable no-restricted-globals */

// PWA service worker: fresh HTML navigations; cache hashed build assets only.

const CACHE = 'wph-cache-v6-pwa';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Do not precache index.html — it goes stale across deploys and causes blank screens.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
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

function sameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

/** Vite build chunks + common static extensions (same-origin only). */
function isBundledAssetRequest(request) {
  if (request.method !== 'GET') return false;
  if (!sameOrigin(request.url)) return false;
  try {
    const p = new URL(request.url).pathname;
    return p.includes('/assets/') || /\.(png|jpe?g|gif|webp|svg|ico|woff2?)$/i.test(p);
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // HTML / SPA navigations: network-only (no caching) so deploys always get a fresh shell.
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(
        () =>
          new Response(
            '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:28rem;margin:auto"><p>You appear to be offline.</p><p><a href="/">Try again</a></p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
      ),
    );
    return;
  }

  // Hashed JS/CSS/images: network-first, update cache on success; offline falls back to cache.
  if (isBundledAssetRequest(request)) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Other same-origin GETs (e.g. manifest): try network; do not aggressively cache unknown paths.
  if (sameOrigin(request.url)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cross-origin: browser default
  event.respondWith(fetch(request));
});
