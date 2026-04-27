import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGetWithSessionWarmup, apiPatch, fetchApiSession, hasApiCredential, setApiSessionHint } from '../api/client'
import {
  getMarketingProviderLoginDisplay,
  isMarketingProviderAuthed,
} from '../marketing/providerStore'

type ProviderOrderRow = {
  id: string
  category: string
  item: string | null
  request: string
  status: string
  createdAt: string
  shippingAddress1: string
  shippingAddress2: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
  shippingCents: number
  shippingInsuranceCents: number
  agreedToShippingTerms: boolean
  contactPermission: boolean
  signatureName: string
  signatureDate: string | null
  items: Array<{
    id: string
    name: string
    productSku: string
    quantity: number
    unitPriceCents: number
  }>
  patient: {
    id: string
    displayName: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
  }
  pharmacyPartner: { id: string; name: string; slug: string } | null
}

function norm(s: unknown) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
function includesAll(haystack: string, tokens: string[]) {
  const h = norm(haystack)
  return tokens.every((t) => h.includes(t))
}
function formatOrderPatient(o: ProviderOrderRow) {
  const p = o.patient
  const n = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim()
  if (n) return n
  if (p?.displayName?.trim()) return p.displayName.trim()
  if (p?.email?.trim()) return p.email.trim()
  return p?.id ? `${p.id.slice(0, 8)}…` : '—'
}
function formatShipTo(o: ProviderOrderRow) {
  const line1 = (o.shippingAddress1 || '').trim()
  const line2 = (o.shippingAddress2 || '').trim()
  const citySt = [o.shippingCity, o.shippingState, o.shippingPostalCode].filter((x) => (x || '').trim()).join(', ')
  const parts = [line1, line2, citySt, (o.shippingCountry || '').trim() && o.shippingCountry !== 'US' ? o.shippingCountry : ''].filter(
    Boolean,
  ) as string[]
  return parts.length ? parts.join(' · ') : '—'
}
function orderLineItemsSummary(o: ProviderOrderRow) {
  return o.items.length
    ? o.items.map((it) => `${it.name} (×${it.quantity})`).join(' · ')
    : o.request || o.item || '—'
}
function orderSubtotalCents(o: ProviderOrderRow) {
  return o.items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0)
}

export default function ProviderOrderHistory() {
  const navigate = useNavigate()
  const who = getMarketingProviderLoginDisplay()
  const [orders, setOrders] = useState<ProviderOrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [orderQuery, setOrderQuery] = useState('')
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'in_review' | 'ordered' | 'closed' | 'declined'>('all')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!isMarketingProviderAuthed()) {
      navigate('/provider/login', { replace: true })
      return
    }
    void (async () => {
      const s = await fetchApiSession()
      if (s.ok && s.authenticated) setApiSessionHint()
    })()
  }, [navigate])

  const copyText = useCallback(async (text: string) => {
    const s = String(text || '').trim()
    if (!s) return
    try {
      await navigator.clipboard.writeText(s)
      setToast('Copied.')
    } catch {
      setToast('Copy failed')
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1400)
    return () => window.clearTimeout(t)
  }, [toast])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const r = await apiGetWithSessionWarmup<{ orders: ProviderOrderRow[] }>('/v1/provider/orders')
      setOrders(
        (r.orders || []).map((o) => ({
          ...o,
          createdAt: typeof o.createdAt === 'string' ? o.createdAt : (o as { createdAt: string }).createdAt,
        })),
      )
    } catch (e: unknown) {
      setOrdersError(String((e as Error)?.message || e))
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMarketingProviderAuthed()) return
    void loadOrders()
  }, [loadOrders])

  const updateOrderStatus = async (id: string, status: 'new' | 'in_review' | 'ordered' | 'closed' | 'declined') => {
    setOrdersError(null)
    try {
      await apiPatch(`/v1/provider/orders/${encodeURIComponent(id)}/status`, { status })
      await loadOrders()
    } catch (e: unknown) {
      setOrdersError(String((e as Error)?.message || e))
    }
  }

  const orderTokens = useMemo(() => norm(orderQuery).split(' ').filter(Boolean), [orderQuery])
  const filteredOrders = useMemo(() => {
    const base = orderFilter === 'all' ? orders : orders.filter((o) => o.status === orderFilter)
    if (orderTokens.length === 0) return base
    return base.filter((o) =>
      includesAll(
        [
          orderLineItemsSummary(o),
          formatOrderPatient(o),
          o.patient?.email || '',
          formatShipTo(o),
          o.status,
          o.pharmacyPartner?.name || '',
          o.createdAt,
        ]
          .filter(Boolean)
          .join(' | '),
        orderTokens,
      ),
    )
  }, [orderFilter, orderTokens, orders])

  return (
    <div className="page teamWorkspacePage">
      <header className="teamWorkspaceHeader" style={{ marginBottom: 8 }}>
        <div className="teamWorkspaceHeaderRow" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0 }}>All orders</h1>
            <p className="muted" style={{ margin: '6px 0 0', maxWidth: 640 }}>
              Full history including <strong>closed</strong> and <strong>declined</strong> orders. Use the filter to narrow, or
              open the main workspace for day-to-day queue and inbox.
            </p>
            {who ? (
              <div className="pill" style={{ marginTop: 8, width: 'fit-content' }}>
                {who}
              </div>
            ) : null}
          </div>
          <div className="btnRow" style={{ flexWrap: 'wrap' }}>
            <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
              Back to workspace
            </Link>
            <Link to="/provider#wph-orders" className="btn" style={{ textDecoration: 'none' }}>
              Open orders on workspace
            </Link>
            <button type="button" className="btn btnPrimary" disabled={ordersLoading} onClick={() => void loadOrders()}>
              {ordersLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>
      {toast ? (
        <p className="muted" style={{ margin: '0 0 8px' }}>
          {toast}
        </p>
      ) : null}
      <section className="card cardAccentRed">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Pharmacy orders (full list)</h2>
          <span className="pill">Showing {filteredOrders.length}</span>
        </div>
        <div className="divider" />
        {ordersError ? (
          <p style={{ color: '#7a0f1c', fontWeight: 700, margin: '0 0 10px' }}>{ordersError}</p>
        ) : null}
        {hasApiCredential() && !ordersLoading && orders.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No orders in the system yet, or the API has not returned data.
          </p>
        ) : null}
        {orders.length > 0 ? (
          <>
            <div className="formRow" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'end' }}>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Search
                </div>
                <input
                  className="input"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Patient, address, SKU, status…"
                />
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Status filter
                </div>
                <select
                  className="select"
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value as 'all' | 'new' | 'in_review' | 'ordered' | 'closed' | 'declined')}
                >
                  <option value="all">All statuses</option>
                  <option value="new">new</option>
                  <option value="in_review">in review</option>
                  <option value="ordered">ordered</option>
                  <option value="closed">closed</option>
                  <option value="declined">declined</option>
                </select>
              </label>
            </div>
            <div className="divider" />
          </>
        ) : null}
        {filteredOrders.length > 0 ? (
          <div className="vbmsOrderList" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="card cardAccentSoft"
                style={{ margin: 0, boxShadow: 'none', border: '1px solid rgba(10, 30, 63, 0.12)' }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>{orderLineItemsSummary(o)}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {new Date(o.createdAt).toLocaleString()} · {o.status} · {o.pharmacyPartner ? o.pharmacyPartner.name : o.request}
                    </div>
                  </div>
                  <div className="btnRow" style={{ margin: 0, gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" onClick={() => void copyText(orderLineItemsSummary(o))}>
                      Copy items
                    </button>
                    <button type="button" className="btn" onClick={() => void copyText(formatShipTo(o))}>
                      Copy ship-to
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const bits = [formatOrderPatient(o), o.patient?.email || '', o.patient?.phone || '']
                          .map((x) => String(x || '').trim())
                          .filter(Boolean)
                        void copyText(bits.join(' · '))
                      }}
                    >
                      Copy patient
                    </button>
                    <button
                      type="button"
                      className="btn"
                      title="Mark this order as declined (not fulfilled)"
                      disabled={o.status === 'declined' || o.status === 'closed' || ordersLoading}
                      onClick={() => void updateOrderStatus(o.id, 'declined')}
                    >
                      Decline
                    </button>
                  </div>
                  <label className="muted" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    Status
                    <select
                      className="select"
                      value={o.status}
                      onChange={(e) =>
                        void updateOrderStatus(
                          o.id,
                          e.target.value as 'new' | 'in_review' | 'ordered' | 'closed' | 'declined',
                        )
                      }
                    >
                      <option value="new">new</option>
                      <option value="in_review">in review</option>
                      <option value="ordered">ordered</option>
                      <option value="closed">closed</option>
                      <option value="declined">declined</option>
                    </select>
                  </label>
                </div>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <div>
                    <strong>Patient</strong> — {formatOrderPatient(o)}
                    {o.patient?.email ? (
                      <span>
                        {' '}
                        · <a href={`mailto:${o.patient.email}`}>{o.patient.email}</a>
                      </span>
                    ) : null}
                    {o.patient?.phone ? <span> · {o.patient.phone}</span> : null}
                  </div>
                  {o.items.length > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      <strong>Subtotal (listed)</strong> —{' '}
                      {(orderSubtotalCents(o) / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                      {o.shippingInsuranceCents > 0 ? (
                        <span>
                          {' '}
                          · insurance{' '}
                          {(o.shippingInsuranceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 8 }}>
                    <strong>Ship to</strong> — {formatShipTo(o)}
                  </div>
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(10, 30, 63, 0.04)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13, color: 'var(--navy)' }}>Consents and signature</div>
                    <ul style={{ margin: 0, paddingLeft: '1.1em', lineHeight: 1.5 }}>
                      <li>
                        Medication shipping terms: <strong>{o.agreedToShippingTerms ? 'Agreed' : '—'}</strong>
                      </li>
                      <li>
                        Contact for order: <strong>{o.contactPermission ? 'Authorized' : '—'}</strong>
                      </li>
                      <li>
                        Typed signature: <strong>{(o.signatureName || '').trim() || '—'}</strong>
                        {o.signatureDate
                          ? ` · ${new Date(o.signatureDate).toLocaleDateString()}`
                          : ' · (no date)'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !ordersError && !ordersLoading && orders.length > 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No matches for this search/filter.
          </p>
        ) : null}
      </section>
    </div>
  )
}
