import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import { apiGet, apiPost } from '../api/client'

type AccountRow = { userId: string; label: string; accountId: string }
type AccountsResp = { ok: true; accounts: AccountRow[] }

export default function ProviderStripeConnectProducts() {
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [connectedAccountId, setConnectedAccountId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priceCents, setPriceCents] = useState('1000')
  const [currency, setCurrency] = useState('usd')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<AccountsResp>('/v1/stripe-connect-demo/accounts')
      .then((r) => {
        const list = r.accounts || []
        setAccounts(list)
        setConnectedAccountId(list[0]?.accountId || '')
      })
      .catch((e: any) => setError(String(e?.message || e)))
  }, [])

  const canSubmit = useMemo(() => !!connectedAccountId && name.trim().length >= 2 && !busy, [connectedAccountId, name, busy])

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const n = parseInt(priceCents.replace(/[^\d]/g, ''), 10)
      if (!Number.isFinite(n) || n < 50) throw new Error('Enter a price in cents (>= 50).')
      await apiPost('/v1/stripe-connect-demo/products', {
        connectedAccountId,
        name: name.trim(),
        description: description.trim(),
        priceInCents: n,
        currency: currency.trim().toLowerCase(),
      })
      setName('')
      setDescription('')
      setNotice('Product created on the platform.')
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Create products (sample)</h1>
          <p className="muted pageSubtitle">Platform products mapped to a connected account via metadata.</p>
        </div>
        <ProviderSubpageNavActions style={{ justifyContent: 'center' }}>
          <Link to="/provider/connect-demo" className="btn" style={{ textDecoration: 'none' }}>
            Connect demo
          </Link>
        </ProviderSubpageNavActions>
      </div>

      {error ? (
        <section className="card cardAccentRed">
          <div style={{ fontWeight: 900 }}>Error</div>
          <div className="divider" />
          <div className="muted">{error}</div>
        </section>
      ) : null}
      {notice ? (
        <section className="card cardAccentSoft">
          <div className="muted" style={{ fontWeight: 900 }}>
            {notice}
          </div>
        </section>
      ) : null}

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>New product</h2>
          <span className="pill">Stripe</span>
        </div>
        <div className="divider" />

        <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Connected account (destination)
            </div>
            <select className="select" value={connectedAccountId} onChange={(e) => setConnectedAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.label} — {a.accountId}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Currency
            </div>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="usd" />
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Name
          </div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Example product" />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Description
          </div>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional…" />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Price (cents)
          </div>
          <input className="input" value={priceCents} onChange={(e) => setPriceCents(e.target.value)} placeholder="1000" inputMode="numeric" />
        </label>

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button type="button" className="btn btnPrimary" disabled={!canSubmit} onClick={submit}>
            {busy ? 'Creating…' : 'Create product'}
          </button>
          <Link to="/storefront" className="btn" style={{ textDecoration: 'none' }}>
            View storefront
          </Link>
        </div>
      </section>
    </div>
  )
}

