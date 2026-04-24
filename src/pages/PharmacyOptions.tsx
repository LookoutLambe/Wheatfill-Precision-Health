import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL, apiGet } from '../api/client'

type Partner = { slug: string; name: string }

export default function PharmacyOptions() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<{ partners: Partner[] }>('/v1/pharmacies')
      .then((r) => setPartners(r.partners))
      .catch((e) => setError(String(e?.message || e)))
  }, [])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Pharmacy Options</h1>
          <p className="muted pageSubtitle">Simple, convenient ordering through trusted pharmacy partners.</p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      {error ? (
        <div className="card cardAccentRed">
          <div style={{ fontWeight: 800 }}>Error</div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="muted" style={{ whiteSpace: 'pre-line' }}>
            {error}
            {'\n\n'}
            API URL: {API_URL}
            {'\n'}
            Tip: on GitHub Pages, add `?api=https://YOUR_BACKEND_DOMAIN` once to set the API URL.
          </div>
        </div>
      ) : null}

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Choose your pharmacy</h2>
          <span className="pill">Ordering</span>
        </div>
        <div className="divider" />

        <div className="cardGrid">
          {partners.map((p, idx) => (
            <div key={p.slug} className={`card ${idx === 0 ? 'cardAccentNavy' : 'cardAccentSoft'}`}>
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>{p.name}</h2>
                <span className="pill pillRed">{idx === 0 ? 'Most used' : 'Partner'}</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                Order your prescribed medications through our portal and submit payment securely.
              </p>
              <div className="divider" />
              <Link to={`/pharmacy/${p.slug}`} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
                Order from {p.name.split(' ')[0]}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

