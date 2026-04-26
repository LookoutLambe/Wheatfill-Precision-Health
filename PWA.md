# Progressive Web App (PWA) — Wheatfill Precision Health

This site uses a **custom service worker** at `public/sw.js` (not `vite-plugin-pwa`). The app registers it from `src/main.tsx` in production.

## Goals

- **Fresh deploys**: avoid serving an old `index.html` that references removed JS chunks (blank screen).
- **Cached performance**: cache **hashed** Vite assets (`/assets/*`) for repeat visits and offline-ish recovery.
- **Clear offline behavior**: HTML navigations do not cache the SPA shell.

## Current behavior (`public/sw.js`, cache `wph-cache-v6-pwa`)

1. **Install** precaches only lightweight static files (`manifest`, icons, `404.html`) — **not** `index.html`.
2. **HTML navigations** (`navigate` / `Accept: text/html`): `fetch` with `cache: 'no-store'`, response is **not** written to Cache Storage. If the network fails, the user sees a minimal inline **“Offline”** HTML page (not the full React app).
3. **Same-origin hashed assets** (paths containing `/assets/` or common static extensions): **network-first** with `no-cache`; on success the response is stored; on failure the SW serves the last cached copy if any.
4. **Other same-origin GETs**: pass-through `fetch` with optional `caches.match` fallback.

## Deploy cache busting

`vite.config.ts` defines `__WPH_BUILD_ID__` per build. `src/main.tsx` registers the worker as:

`sw.js?v=<buildId>`

so each production build fetches an updated service worker script.

## Changing caching policy

- Bump the `CACHE` constant in `sw.js` when you need to **wipe** all cached assets for every client.
- After policy changes, redeploy the static site and verify in Chrome DevTools → **Application** → **Service Workers** / **Cache Storage**.

## Optional future direction

Migrating to **`vite-plugin-pwa` + Workbox** would add tooling and recipes at the cost of build complexity and another dependency surface. The custom SW is intentionally small and explicit.
