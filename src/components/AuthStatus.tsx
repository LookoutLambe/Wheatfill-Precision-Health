import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMedplumApp } from '../medplum/provider'

function labelFromProfile(profile: any) {
  if (!profile) return ''
  const name = profile.name?.[0]
  if (name?.text) return String(name.text)
  const fn = (name?.given?.[0] || '').toString().trim()
  const ln = (name?.family || '').toString().trim()
  const base = `${fn} ${ln}`.trim()
  return base || profile.id || profile.resourceType
}

function roleLabel(resourceType: string) {
  if (resourceType === 'Practitioner') return 'Provider'
  if (resourceType === 'Patient') return 'Patient'
  return resourceType
}

export default function AuthStatus() {
  const { profile, loading, signOut } = useMedplumApp()
  const location = useLocation()
  const navigate = useNavigate()

  const next = `${location.pathname}${location.search}${location.hash}`

  if (loading) return null

  if (!profile) {
    return (
      <Link
        to={`/signin?next=${encodeURIComponent(next)}`}
        className="btn btnAccent"
        style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 999 }}
      >
        Sign in
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span className="pill" title={profile.resourceType} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span>{labelFromProfile(profile)}</span>
        <span className="pill pillRed" style={{ padding: '4px 8px' }}>
          {roleLabel(profile.resourceType)}
        </span>
      </span>
      <button
        type="button"
        className="btn"
        style={{ padding: '8px 12px', borderRadius: 999 }}
        onClick={() => {
          signOut()
          navigate('/', { replace: true })
        }}
      >
        Logout
      </button>
    </div>
  )
}

