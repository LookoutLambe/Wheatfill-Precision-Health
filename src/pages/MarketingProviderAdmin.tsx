import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APP_URL } from '../config/mode'
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
            Configure Charm EHR booking and patient portal, Order Now Catalog, video, fulfillment partner name, catalog
            Venmo link, and optional payment-rail notes.
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

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Charm EHR scheduling URL (provider only — not shown on public Book Online)
            </div>
            <input className="input" value={form.bookingUrl} onChange={(e) => setForm((p) => ({ ...p, bookingUrl: e.target.value }))} />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Patient portal URL (Charm PHR / patient portal)
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
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Catalog Venmo pay link (Venmo profile or pay link after amount is confirmed)
            </div>
            <input
              className="input"
              value={form.catalogVenmoPayUrl}
              onChange={(e) => setForm((p) => ({ ...p, catalogVenmoPayUrl: e.target.value }))}
            />
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Payment processors note (Stripe/Clover — reference only on this marketing build; configure in full app)
          </div>
          <textarea
            className="input"
            rows={3}
            value={form.paymentProcessorsNote}
            onChange={(e) => setForm((p) => ({ ...p, paymentProcessorsNote: e.target.value }))}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </label>

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
                fulfillmentPartnerName: form.fulfillmentPartnerName.trim(),
                catalogVenmoPayUrl: form.catalogVenmoPayUrl.trim(),
                paymentProcessorsNote: form.paymentProcessorsNote.trim(),
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
            <span className="pill">Charm EHR</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Opens your Charm EHR scheduling page in a new tab for staff. Patients use <b>Book Online</b> on the site for the calendar.
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
            {form.bookingUrl.trim() ? 'Open booking' : 'Add booking URL above'}
          </a>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Patient portal</h2>
            <span className="pill pillRed">Charm PHR</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Opens the Charm EHR patient portal (PHR); patients sign in with their Charm credentials.
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
            {form.patientPortalUrl.trim() ? 'Open patient portal' : 'Add portal URL above'}
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
            Venmo payment instructions from the office. Fulfillment copy references <b>{form.fulfillmentPartnerName.trim() || 'your pharmacy'}</b>.
            Stripe/Clover: see Payments in the full practice app when deployed.
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

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Catalog Venmo</h2>
            <span className="pill">Pay link</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Same link patients see in the footer and checkout hints. Only pay after your team confirms the amount.
          </p>
          <div className="divider" />
          <a
            className="btn btnAccent"
            style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
            href={form.catalogVenmoPayUrl.trim() || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!form.catalogVenmoPayUrl.trim()}
            onClick={(e) => {
              if (!form.catalogVenmoPayUrl.trim()) e.preventDefault()
            }}
          >
            {form.catalogVenmoPayUrl.trim() ? 'Open Venmo pay link' : 'Add Venmo URL above'}
          </a>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Card rails</h2>
            <span className="pill pillRed">Stripe / Clover</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            {form.paymentProcessorsNote.trim()
              ? form.paymentProcessorsNote.trim()
              : 'Optional: note how you want Stripe vs Clover used. Connect accounts and toggles live in the full app under Payments.'}
          </p>
          <div className="divider" />
          {APP_URL ? (
            <a
              className="btn"
              style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
              href={`${APP_URL.replace(/\/$/, '')}/provider/payments`}
              target="_blank"
              rel="noreferrer"
            >
              Open Payments (full app)
            </a>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Set <code className="muted">VITE_APP_URL</code> on the marketing build to deep-link the hosted practice app.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

