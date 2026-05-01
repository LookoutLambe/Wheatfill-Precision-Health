import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../api/client'
import { navigateToStripeHostedUrl } from '../lib/stripeHostedNavigation'

type StorefrontProduct = {
  id: string
  name: string
  description: string | null
  currency: string | null
  unitAmount: number | null
  connectedAccountId: string | null
}

type StorefrontResp = {
  ok: true
  connectedAccounts: Array<{ label: string; accountId: string }>
  products: StorefrontProduct[]
}

function money(cents: number | null, currency: string | null) {
  if (!cents || !currency) return '—'
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency.toUpperCase() })
}

export default function StripeConnectStorefront() {
  // Optional route param: /storefront/:accountId
  // - empty => show all products grouped by destination
  // - "platform" => show products with no connected account mapping
  // - otherwise => show only that destination's products
  const { accountId: routeAccountId } = useParams()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<StorefrontResp | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<StorefrontResp>('/v1/stripe-connect-demo/storefront')
      .then((r) => setData(r))
      .catch((e: any) => setError(String(e?.message || e)))
  }, [])

  const canceled = searchParams.get('canceled') === '1'

  const productsByAccount = useMemo(() => {
    const sel = (routeAccountId || '').trim()
    const m = new Map<string, StorefrontProduct[]>()
    for (const p of data?.products || []) {
      const k = p.connectedAccountId || 'unmapped'
      if (sel) {
        if (sel === 'platform') {
          if (p.connectedAccountId) continue
        } else if (p.connectedAccountId !== sel) {
          continue
        }
      }
      const cur = m.get(k)
      if (cur) cur.push(p)
      else m.set(k, [p])
    }
    return m
  }, [data, routeAccountId])

  const buy = async (productId: string) => {
    setBusyId(productId)
    setError(null)
    try {
      const r = await apiPost<{ ok: true; url: string }>('/v1/stripe-connect-demo/checkout', { productId, quantity: 1 }, '')
      if (!r?.url) throw new Error('No checkout URL returned.')
      if (!navigateToStripeHostedUrl(r.url)) throw new Error('Invalid Stripe checkout URL.')
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>
            {routeAccountId ? (routeAccountId === 'platform' ? 'Platform Products' : `Store ${routeAccountId}`) : 'Storefront (sample)'}
          </h1>
          <p className="muted pageSubtitle">Products are platform-owned; checkout uses a destination charge + application fee.</p>
        </div>
        <Link to="/" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      {canceled ? (
        <section className="card cardAccentSoft">
          <div className="muted">Checkout canceled.</div>
        </section>
      ) : null}

      {error ? (
        <section className="card cardAccentRed">
          <div style={{ fontWeight: 900 }}>Error</div>
          <div className="divider" />
          <div className="muted">{error}</div>
        </section>
      ) : null}

      {!data ? <p className="muted">Loading…</p> : null}

      {data ? (
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Products</h2>
            <span className="pill">Checkout</span>
          </div>
          <div className="divider" />

          {(data.products || []).length === 0 ? <p className="muted">No products yet. Create one in the provider demo.</p> : null}

          <div style={{ display: 'grid', gap: 10 }}>
            {[...productsByAccount.entries()].map(([accountId, rows]) => {
              const acctLabel = data.connectedAccounts.find((a) => a.accountId === accountId)?.label
              return (
                <div key={accountId} className="card" style={{ padding: 14 }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                    Destination: {acctLabel ? `${acctLabel} — ` : ''}
                    <span style={{ fontFamily: 'monospace' }}>{accountId}</span>
                  </div>
                  <div className="divider" />
                  <div style={{ display: 'grid', gap: 10 }}>
                    {rows.map((p) => (
                      <div key={p.id} className="card cardAccentSoft" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, color: 'var(--text-h)' }}>{p.name}</div>
                            {p.description ? <div className="muted" style={{ marginTop: 6 }}>{p.description}</div> : null}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 900 }}>{money(p.unitAmount, p.currency)}</div>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              style={{ marginTop: 8 }}
                              disabled={busyId === p.id}
                              onClick={() => buy(p.id)}
                            >
                              {busyId === p.id ? 'Opening…' : 'Buy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="divider" />
          <div className="btnRow">
            <Link to="/provider/connect-demo" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
              Provider demo
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}

