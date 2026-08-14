/**
 * ImageKit URL endpoint (public — it appears in every image URL, so it is safe to commit).
 * Override per-environment with VITE_IMAGEKIT_URL_ENDPOINT if the account ever changes.
 *
 * Images are served as: `${IMAGEKIT_URL_ENDPOINT}/<path-in-media-library>?tr=<transformations>`
 * e.g. https://ik.imagekit.io/pmgkty6gkf/site/hero.jpg?tr=f-auto,q-auto,w-1200
 */
export const IMAGEKIT_URL_ENDPOINT = (
  (import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as string | undefined) || 'https://ik.imagekit.io/pmgkty6gkf'
).replace(/\/+$/, '')

/** Build an optimized ImageKit URL for a media-library path. */
export function imageKitUrl(path: string, transform = 'f-auto,q-auto'): string {
  const clean = path.replace(/^\/+/, '')
  const tr = transform ? `?tr=${encodeURIComponent(transform).replace(/%2C/g, ',')}` : ''
  return `${IMAGEKIT_URL_ENDPOINT}/${clean}${tr}`
}
