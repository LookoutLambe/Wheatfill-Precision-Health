import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { MedicationRequest, Patient } from '@medplum/fhirtypes'
import { apiGet } from '../api/client'
import { useMedplumApp } from '../medplum/provider'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerResp = { partner: { slug: string; name: string; products: Product[] } }

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

export default function ProviderOrderingTest() {
  const { slug = '' } = useParams()
  const { medplum, profile } = useMedplumApp()

  const [partner, setPartner] = useState<PartnerResp['partner'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    apiGet<PartnerResp>(`/v1/pharmacies/${encodeURIComponent(slug)}`)
      .then((r) => setPartner(r.partner))
      .catch((e) => setError(String(e?.message || e)))
  }, [slug])

  useEffect(() => {
    if (!profile || profile.resourceType !== 'Practitioner') return
    medplum
      .searchResources('Patient', '')
      .then((r) => setPatients(r as any))
      .catch((e: any) => setError(String(e?.message || e)))
  }, [medplum, profile])

  const patientOptions = useMemo(
    () => patients.map((p) => ({ id: p.id || '', label: p.name?.[0]?.text || p.id || 'Patient' })),
    [patients],
  )

  useEffect(() => {
    if (!patientId && patientOptions[0]?.id) setPatientId(patientOptions[0].id)
  }, [patientId, patientOptions])

  const items = useMemo(() => {
    if (!partner) return []
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([sku, quantity]) => {
        const p = partner.products.find((x) => x.sku === sku)
        return p ? { sku, quantity, product: p } : null
      })
      .filter(Boolean) as Array<{ sku: string; quantity: number; product: Product }>
  }, [cart, partner])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Provider Ordering (Test)</h1>
          <p className="muted pageSubtitle">Creates MedicationRequests in Medplum. No payment.</p>
        </div>
        <div className="pageActions">
          <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
            Back to Provider
          </Link>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card cardAccentRed">
          <div style={{ fontWeight: 800 }}>Error</div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="muted">{error}</div>
        </div>
      ) : null}

      {msg ? (
        <div className="card cardAccentSoft">
          <div style={{ fontWeight: 800 }}>Result</div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="muted" style={{ whiteSpace: 'pre-line' }}>
            {msg}
          </div>
        </div>
      ) : null}

      <div className="cardGrid">
        <section className="card cardAccentNavy" style={{ gridColumn: 'span 8' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Products</h2>
            <span className="pill">Test</span>
          </div>
          <div className="divider" />

          {!partner ? (
            <p className="muted">Loading…</p>
          ) : (
            <div className="stack">
              {partner.products.map((p) => {
                const qty = cart[p.sku] || 0
                return (
                  <div key={p.sku} className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
                    <div className="cardTitle">
                      <div>
                        <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>{p.name}</div>
                        <div className="muted" style={{ marginTop: 6 }}>
                          {p.subtitle}
                        </div>
                      </div>
                      <span className="pill pillRed">{money(p.priceCents)}</span>
                    </div>
                    <div className="divider" style={{ margin: '12px 0' }} />
                    <div className="btnRow">
                      <button type="button" className="btn" onClick={() => setCart((c) => ({ ...c, [p.sku]: Math.max(0, qty - 1) }))}>
                        −
                      </button>
                      <span className="pill">{qty}</span>
                      <button type="button" className="btn" onClick={() => setCart((c) => ({ ...c, [p.sku]: qty + 1 }))}>
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <aside className="card cardAccentRed" style={{ gridColumn: 'span 4', position: 'sticky', top: 92, height: 'fit-content' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Create test order</h2>
            <span className="pill pillRed">No payment</span>
          </div>
          <div className="divider" />

          <label style={{ display: 'block' }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Patient
            </div>
            <select className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              {patientOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div className="divider" style={{ margin: '12px 0' }} />

          <button
            type="button"
            className="btn btnPrimary"
            disabled={!items.length || !patientId}
            style={{ opacity: !items.length || !patientId ? 0.6 : 1, width: '100%' }}
            onClick={() => {
              setMsg(null)
              ;(async () => {
                try {
                  if (!profile || profile.resourceType !== 'Practitioner') throw new Error('Not signed in as provider.')
                  const created: string[] = []
                  for (const it of items) {
                    const mr = (await medplum.createResource({
                      resourceType: 'MedicationRequest',
                      status: 'draft',
                      intent: 'order',
                      authoredOn: new Date().toISOString(),
                      subject: { reference: `Patient/${patientId}` },
                      medicationCodeableConcept: { text: it.product.name },
                      dosageInstruction: [{ text: `Partner: ${partner?.name || slug}. SKU: ${it.sku}. Qty: ${it.quantity}.` }],
                      note: [{ text: 'Provider test ordering (no payment).' }],
                    } as MedicationRequest)) as any
                    if (mr?.id) created.push(mr.id)
                  }
                  setMsg(`Created MedicationRequests:\n${created.map((id) => `- MedicationRequest/${id}`).join('\n')}`)
                } catch (e: any) {
                  setMsg(String(e?.message || e))
                }
              })()
            }}
          >
            Create MedicationRequests
          </button>
        </aside>
      </div>
    </div>
  )
}

