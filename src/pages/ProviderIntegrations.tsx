import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Organization, Practitioner } from '@medplum/fhirtypes'
import { useMedplumApp } from '../medplum/provider'
import { getOrCreatePracticeOrg, readIntegrations, writeIntegrations, type PracticeIntegrations } from '../medplum/integrations'
import { CATALOG_VENMO, CONTRACTED_PHARMACY_NAME } from '../config/provider'
import { PROVIDER_PRACTITIONER_ID } from '../medplum/client'

export default function ProviderIntegrations() {
  const { medplum, profile } = useMedplumApp()
  const practitioner = profile?.resourceType === 'Practitioner' ? (profile as any as Practitioner) : null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState<PracticeIntegrations>({
    bookingUrl: '',
    publicBookingUrl: '',
    patientPortalUrl: '',
    pharmacyUrl: '',
    videoVisitUrl: '',
    fulfillmentPartnerName: CONTRACTED_PHARMACY_NAME,
    catalogVenmoPayUrl: CATALOG_VENMO.payUrl,
    paymentProcessorsNote: '',
  })

  async function load() {
    if (!practitioner?.id) return
    if (PROVIDER_PRACTITIONER_ID && practitioner.id !== PROVIDER_PRACTITIONER_ID) {
      setError('Signed in provider does not match configured provider.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const o = await getOrCreatePracticeOrg(medplum)
      setOrg(o)
      setForm(readIntegrations(o))
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitioner?.id])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Integrations</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Set public booking, staff calendar, and customer sign-in links; order catalog and video; fulfillment name and
            catalog Venmo link for the public site. PayPal, Venmo, Zelle, and card checkout notes live under{' '}
            <Link to="/provider/payments">Payments</Link>.
          </p>
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card cardAccentRed" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t load integrations</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {error}
          </div>
        </div>
      ) : null}

      <section className="card cardAccentSoft" style={{ maxWidth: 980 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Public links &amp; storefront</h2>
          <span className="pill">Router</span>
        </div>
        <div className="divider" />

        {loading ? <p className="muted">Loading…</p> : null}

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Public customer booking (scheduling or embed — when set, &quot;Book Online&quot; can use this URL)
          </div>
          <input
            className="input"
            value={form.publicBookingUrl}
            onChange={(e) => setForm((p) => ({ ...p, publicBookingUrl: e.target.value }))}
            placeholder="https://..."
            style={{ width: '100%' }}
          />
        </label>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Staff calendar (internal / team scheduling link)
            </div>
            <input
              className="input"
              value={form.bookingUrl}
              onChange={(e) => setForm((p) => ({ ...p, bookingUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Customer account URL (order history, account sign-in, or your hosted page)
            </div>
            <input
              className="input"
              value={form.patientPortalUrl}
              onChange={(e) => setForm((p) => ({ ...p, patientPortalUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Order Now / Catalog URL
            </div>
            <input
              className="input"
              value={form.pharmacyUrl}
              onChange={(e) => setForm((p) => ({ ...p, pharmacyUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Video visit URL (video room link)
            </div>
            <input
              className="input"
              value={form.videoVisitUrl}
              onChange={(e) => setForm((p) => ({ ...p, videoVisitUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="formRow" style={{ marginTop: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Fulfillment partner name (customer-facing copy, e.g. compounding pharmacy)
            </div>
            <input
              className="input"
              value={form.fulfillmentPartnerName}
              onChange={(e) => setForm((p) => ({ ...p, fulfillmentPartnerName: e.target.value }))}
              placeholder={CONTRACTED_PHARMACY_NAME}
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Catalog Venmo pay link (after the team confirms amount)
            </div>
            <input
              className="input"
              value={form.catalogVenmoPayUrl}
              onChange={(e) => setForm((p) => ({ ...p, catalogVenmoPayUrl: e.target.value }))}
              placeholder="https://venmo.com/..."
            />
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Payment note (PayPal, Venmo, Zelle, Stripe, etc. — internal reference; details under Payments)
          </div>
          <textarea
            className="input"
            rows={3}
            value={form.paymentProcessorsNote}
            onChange={(e) => setForm((p) => ({ ...p, paymentProcessorsNote: e.target.value }))}
            placeholder="e.g. Zelle to practice@…; Stripe checkout for catalog; Venmo for confirmed amounts."
            style={{ width: '100%', resize: 'vertical' }}
          />
        </label>

        {saved ? (
          <div style={{ marginTop: 10, color: '#14532d', fontSize: 12, fontWeight: 800 }}>Saved.</div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!org?.id}
            style={{ width: '100%', opacity: org?.id ? 1 : 0.6 }}
            onClick={() => {
              ;(async () => {
                setError(null)
                try {
                  if (!org?.id) throw new Error('Practice organization not loaded.')
                  const updated = writeIntegrations(org, form)
                  const savedOrg = (await medplum.updateResource(updated as any)) as Organization
                  setOrg(savedOrg)
                  setSaved(true)
                  setTimeout(() => setSaved(false), 1500)
                } catch (e: any) {
                  setError(String(e?.message || e))
                }
              })()
            }}
          >
            Save integrations
          </button>
        </div>
      </section>
    </div>
  )
}

