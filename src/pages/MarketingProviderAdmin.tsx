import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getMarketingIntegrations,
  isMarketingProviderAuthed,
  setMarketingIntegrations,
  setMarketingProviderAuthed,
  type MarketingIntegrations,
} from '../marketing/providerStore'

export default function MarketingProviderAdmin() {
  const navigate = useNavigate()
  const [form, setForm] = useState<MarketingIntegrations>(() => getMarketingIntegrations())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Integrations</h1>
          <p className="muted pageSubtitle">Configure booking, portal, pharmacy, and video links.</p>
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setMarketingProviderAuthed(false)
              navigate('/', { replace: true })
            }}
          >
            Logout
          </button>
          <span className="pill pillRed">Marketing-only</span>
        </div>
      </div>

      <section className="card cardAccentSoft" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Integrations</h2>
          <span className="pill">Links</span>
        </div>
        <div className="divider" />

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Booking URL (EHR booking page)
            </div>
            <input className="input" value={form.bookingUrl} onChange={(e) => setForm((p) => ({ ...p, bookingUrl: e.target.value }))} />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Patient portal URL (EHR portal)
            </div>
            <input
              className="input"
              value={form.patientPortalUrl}
              onChange={(e) => setForm((p) => ({ ...p, patientPortalUrl: e.target.value }))}
            />
          </label>
        </div>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Pharmacy URL (partner portal)
            </div>
            <input className="input" value={form.pharmacyUrl} onChange={(e) => setForm((p) => ({ ...p, pharmacyUrl: e.target.value }))} />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Video visit URL (Doxy.me room)
            </div>
            <input className="input" value={form.videoVisitUrl} onChange={(e) => setForm((p) => ({ ...p, videoVisitUrl: e.target.value }))} />
          </label>
        </div>

        {saved ? <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800 }}>Saved.</div> : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            style={{ width: '100%' }}
            onClick={() => {
              setMarketingIntegrations({
                bookingUrl: form.bookingUrl.trim(),
                patientPortalUrl: form.patientPortalUrl.trim(),
                pharmacyUrl: form.pharmacyUrl.trim(),
                videoVisitUrl: form.videoVisitUrl.trim(),
              })
              setSaved(true)
              setTimeout(() => setSaved(false), 1500)
            }}
          >
            Save
          </button>
        </div>
      </section>
    </div>
  )
}

