import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getMarketingProviderLoginDisplay,
  getMarketingIntegrations,
  isMarketingProviderAuthed,
  setMarketingIntegrations,
  setMarketingProviderAuthed,
  type MarketingIntegrations,
} from '../marketing/providerStore'

export default function MarketingProviderAdmin() {
  const navigate = useNavigate()
  const who = getMarketingProviderLoginDisplay()
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
          <p className="muted pageSubtitle">
            Configure public links (booking, account, catalog, video), fulfillment partner name, catalog pay link, and
            payment notes. Consumer DTC site—no EHR product names in the public experience.
          </p>
          {who ? <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>Signed in as: {who}</div> : null}
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back
          </Link>
          <Link to="/provider/security" className="btn" style={{ textDecoration: 'none' }}>
            Change password
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
          <span className="pill pillRed">Provider</span>
        </div>
      </div>

      <section className="card cardAccentSoft" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Integrations</h2>
          <span className="pill">Links</span>
        </div>
        <div className="divider" />

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Public customer booking (online scheduling or embed; &quot;Book Online&quot; uses this when set)
          </div>
          <input
            className="input"
            value={form.publicBookingUrl}
            onChange={(e) => setForm((p) => ({ ...p, publicBookingUrl: e.target.value }))}
            placeholder="https://… (patient self-service, not staff calendar)"
            style={{ width: '100%' }}
          />
        </label>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Internal staff / provider calendar (not the public book link)
            </div>
            <input className="input" value={form.bookingUrl} onChange={(e) => setForm((p) => ({ ...p, bookingUrl: e.target.value }))} />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Customer account URL (orders, subscription, or partner app—optional)
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
              Order Now Catalog URL (Patient-Facing Catalog)
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

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Fulfillment partner name (patient-facing, e.g. compounding pharmacy)
            </div>
            <input
              className="input"
              value={form.fulfillmentPartnerName}
              onChange={(e) => setForm((p) => ({ ...p, fulfillmentPartnerName: e.target.value }))}
            />
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
                publicBookingUrl: form.publicBookingUrl.trim(),
                patientPortalUrl: form.patientPortalUrl.trim(),
                pharmacyUrl: form.pharmacyUrl.trim(),
                videoVisitUrl: form.videoVisitUrl.trim(),
                fulfillmentPartnerName: form.fulfillmentPartnerName.trim(),
              })
              setSaved(true)
              setTimeout(() => setSaved(false), 1500)
            }}
          >
            Save
          </button>
        </div>
      </section>

      <div className="cardGrid" style={{ marginTop: 16 }}>
        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Booking</h2>
            <span className="pill">Staff</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Internal calendar for the care team. Public <b>Book online</b> uses the <b>public booking</b> URL above.
          </p>
          <div className="divider" />
          <a
            className="btn btnPrimary"
            style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
            href={form.bookingUrl.trim() || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!form.bookingUrl.trim()}
            onClick={(e) => {
              if (!form.bookingUrl.trim()) e.preventDefault()
            }}
          >
            {form.bookingUrl.trim() ? 'Open staff calendar' : 'Add staff calendar URL above'}
          </a>
        </section>

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Book online (patients)</h2>
            <span className="pill">Public</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Same link as the &quot;Book online&quot; menu: customer self-service scheduling.
          </p>
          <div className="divider" />
          <a
            className="btn btnAccent"
            style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
            href={form.publicBookingUrl.trim() || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!form.publicBookingUrl.trim()}
            onClick={(e) => {
              if (!form.publicBookingUrl.trim()) e.preventDefault()
            }}
          >
            {form.publicBookingUrl.trim() ? 'Test patient booking' : 'Add public patient booking URL above'}
          </a>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Customer account</h2>
            <span className="pill pillRed">Optional</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Optional link for subscription, partner checkout, or account sign-in. The main site is still the storefront.
          </p>
          <div className="divider" />
          <a
            className="btn btnAccent"
            style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
            href={form.patientPortalUrl.trim() || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!form.patientPortalUrl.trim()}
            onClick={(e) => {
              if (!form.patientPortalUrl.trim()) e.preventDefault()
            }}
          >
            {form.patientPortalUrl.trim() ? 'Test customer account link' : 'Add customer account URL above'}
          </a>
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Order Now</h2>
            <span className="pill pillRed">Catalog</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Opens your patient catalog. Orders run through the practice; patients submit from the summary page and get
            Stripe checkout instructions from the office. Fulfillment copy references{' '}
            <b>{form.fulfillmentPartnerName.trim() || 'your pharmacy'}</b>. Configure payments in the full app when deployed.
          </p>
          <div className="divider" />
          <a
            className="btn btnPrimary"
            style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
            href={form.pharmacyUrl.trim() || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!form.pharmacyUrl.trim()}
            onClick={(e) => {
              if (!form.pharmacyUrl.trim()) e.preventDefault()
            }}
          >
            {form.pharmacyUrl.trim() ? 'Open Order Now Catalog' : 'Add Catalog URL Above'}
          </a>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Video visits</h2>
            <span className="pill">Doxy.me</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Opens your waiting room link.
          </p>
          <div className="divider" />
          <a
            className="btn"
            style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
            href={form.videoVisitUrl.trim() || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!form.videoVisitUrl.trim()}
            onClick={(e) => {
              if (!form.videoVisitUrl.trim()) e.preventDefault()
            }}
          >
            {form.videoVisitUrl.trim() ? 'Open video visit room' : 'Add video URL above'}
          </a>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Payments</h2>
            <span className="pill pillRed">Stripe</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Stripe is the only supported payment rail. Configure your Stripe Payment Link in the app environment
            (<code className="muted">VITE_STRIPE_CHECKOUT_URL</code>).
          </p>
        </section>
      </div>
    </div>
  )
}

