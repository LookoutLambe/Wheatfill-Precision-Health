import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMedplumApp } from '../medplum/provider'
import { USE_MEDPLUM_PROVIDER_PORTAL } from '../config/providerAuth'
import {
  getMarketingProviderLoginDisplay,
  isMarketingProviderAuthed,
  setMarketingProviderAuthed,
} from '../marketing/providerStore'

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

export default function AuthStatus({ onMenuClose }: { onMenuClose?: () => void }) {
  const { profile, loading, signOut } = useMedplumApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [, setMarketingAuthTick] = useState(0)

  useEffect(() => {
    if (USE_MEDPLUM_PROVIDER_PORTAL) return
    const bump = () => setMarketingAuthTick((n) => n + 1)
    window.addEventListener('wph_marketing_provider_auth', bump)
    return () => window.removeEventListener('wph_marketing_provider_auth', bump)
  }, [])

  const next = `${location.pathname}${location.search}${location.hash}`
  const close = () => onMenuClose?.()

  if (!USE_MEDPLUM_PROVIDER_PORTAL) {
    if (!isMarketingProviderAuthed()) {
      return (
        <Link
          to={`/provider/login?next=${encodeURIComponent(next)}`}
          className="btn btnAccent navProviderBtn"
          style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 999 }}
          onClick={close}
        >
          Provider sign in
        </Link>
      )
    }

    const who = getMarketingProviderLoginDisplay()
    return (
      <div className="authStatusRow" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className="pill" title="Provider session" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>{who || 'provider'}</span>
          <span className="pill pillRed" style={{ padding: '4px 8px' }}>
            Provider
          </span>
        </span>
        <button
          type="button"
          className="btn"
          style={{ padding: '8px 12px', borderRadius: 999 }}
          onClick={() => {
            close()
            setMarketingProviderAuthed(false)
            navigate('/', { replace: true })
          }}
        >
          Logout
        </button>
      </div>
    )
  }

  if (loading) return null

  if (!profile) {
    return (
      <Link
        to={`/signin?next=${encodeURIComponent(next)}`}
        className="btn btnAccent"
        style={{ textDecoration: 'none', padding: '8px 12px', borderRadius: 999 }}
        onClick={close}
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="authStatusRow" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
          close()
          signOut()
          navigate('/', { replace: true })
        }}
      >
        Logout
      </button>
    </div>
  )
}

