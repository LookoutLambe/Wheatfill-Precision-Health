import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPost } from '../api/client'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerResp = { partner: { slug: string; name: string; products: Product[] } }

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

export default function PharmacyPartner() {
  const { slug = '' } = useParams()
  const [partner, setPartner] = useState<PartnerResp['partner'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(true)
  const [agree, setAgree] = useState(false)
  const [contactOk, setContactOk] = useState(false)
  const [sigName, setSigName] = useState('')
  const [sigDate, setSigDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [insurance, setInsurance] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<PartnerResp>(`/v1/pharmacies/${encodeURIComponent(slug)}`)
      .then((r) => setPartner(r.partner))
      .catch((e) => setError(String(e?.message || e)))
  }, [slug])

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

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.product.priceCents * it.quantity, 0),
    [items],
  )
  const insuranceCents = useMemo(() => (insurance ? Math.round(subtotal * 0.02) : 0), [insurance, subtotal])
  const total = subtotal + insuranceCents

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>{partner?.name || 'Pharmacy'}</h1>
          <p className="muted pageSubtitle">Add items to your cart, then complete shipping terms and payment.</p>
        </div>
        <div className="pageActions">
          <Link to="/pharmacy" className="btn" style={{ textDecoration: 'none' }}>
            Pharmacy Options
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

      <div className="cardGrid">
        <section className="card cardAccentSoft" style={{ gridColumn: 'span 8' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Products</h2>
            <span className="pill">Add to cart</span>
          </div>
          <div className="divider" />

          {!partner ? (
            <p className="muted">Loading…</p>
          ) : (
            <div className="stack">
              {partner.products.map((p) => {
                const qty = cart[p.sku] || 0
                return (
                  <div key={p.sku} className="card cardAccentNavy" style={{ gridColumn: 'span 12' }}>
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
                      <button type="button" className="btn btnPrimary" onClick={() => setOpen(true)}>
                        View cart
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
            <h2 style={{ margin: 0 }}>Cart</h2>
            <button type="button" className="btn" onClick={() => setOpen((s) => !s)}>
              {open ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="divider" />

          {!open ? (
            <p className="muted">Cart hidden.</p>
          ) : items.length === 0 ? (
            <p className="muted">No items yet.</p>
          ) : (
            <div className="stack">
              {items.map((it) => (
                <div key={it.sku} className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
                  <div style={{ fontWeight: 800 }}>{it.product.name}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {it.quantity} × {money(it.product.priceCents)}
                  </div>
                </div>
              ))}

              <div className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
                <div className="cardTitle">
                  <div>Subtotal</div>
                  <span className="pill">{money(subtotal)}</span>
                </div>
                <div className="divider" style={{ margin: '12px 0' }} />
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} />
                  <span className="muted">Add shipping insurance (2%)</span>
                </label>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className="cardTitle">
                  <div>Total due</div>
                  <span className="pill pillRed">{money(total)}</span>
                </div>
              </div>

              <div className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
                <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>Medication Shipping Terms</div>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  Prototype terms placeholder. In production, we’ll insert your finalized shipping terms, liability language, and HIPAA contact authorization.
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                    <span className="muted">I have read and agree to the shipping terms.</span>
                  </label>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} />
                    <span className="muted">I authorize contact regarding my order when necessary.</span>
                  </label>
                </div>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className="formRow">
                  <label>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      Date
                    </div>
                    <input className="input" type="date" value={sigDate} onChange={(e) => setSigDate(e.target.value)} />
                  </label>
                  <label>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      Typed signature
                    </div>
                    <input className="input" value={sigName} onChange={(e) => setSigName(e.target.value)} placeholder="First and Last Name" />
                  </label>
                </div>
              </div>

              {checkoutError ? (
                <div style={{ color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>{checkoutError}</div>
              ) : null}

              <button
                type="button"
                className="btn btnPrimary"
                disabled={!agree || !sigName.trim() || items.length === 0}
                style={{ opacity: !agree || !sigName.trim() || items.length === 0 ? 0.6 : 1, width: '100%' }}
                onClick={() => {
                  setCheckoutError(null)
                  apiPost<{ checkoutUrl: string | null }>(
                    '/v1/patient/orders/pharmacy',
                    {
                      partnerSlug: partner?.slug,
                      items: items.map((it) => ({ sku: it.sku, quantity: it.quantity })),
                      agreedToShippingTerms: agree,
                      contactPermission: contactOk,
                      signatureName: sigName,
                      signatureDate: sigDate,
                      shippingInsurance: insurance,
                    },
                  )
                    .then((r) => {
                      if (r.checkoutUrl) window.location.href = r.checkoutUrl
                      else setCheckoutError('Clover is not configured yet on the server (missing CLOVER keys).')
                    })
                    .catch((e) => setCheckoutError(String(e?.message || e)))
                }}
              >
                Continue to payment
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

