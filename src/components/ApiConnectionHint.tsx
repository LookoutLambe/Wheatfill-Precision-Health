import { API_URL } from '../api/client'

/**
 * Shown on provider login and other API-dependent screens so "Failed to fetch" is debuggable.
 */
export default function ApiConnectionHint() {
  const onPublic =
    typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
  let pointsToLocalFromPublic = false
  try {
    const u = new URL(API_URL)
    pointsToLocalFromPublic = onPublic && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  } catch {
    /* ignore */
  }

  return (
    <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
      <div>
        <strong>API base URL</strong> (where sign-in and forms post): <code style={{ fontSize: 11 }}>{API_URL}</code>
      </div>
      {pointsToLocalFromPublic ? (
        <p style={{ color: '#7a0f1c', fontWeight: 700, margin: '8px 0 0' }}>
          This page is on the public web but the app is still pointed at <code>localhost</code>—browsers will not reach your
          machine from here. Set the repository secret <code>VITE_API_URL</code> to your <strong>https</strong> API in GitHub
          Actions, then redeploy, or one-time: open the site with{' '}
          <code style={{ fontSize: 11 }}>?api=https://your-api.example.com</code> and reload (saved in this browser). Ensure the
          API CORS <code>FRONTEND_ORIGIN</code> includes this site&rsquo;s origin.
        </p>
      ) : null}
    </div>
  )
}
