import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import { apiGet, apiPost } from '../api/client'
import { navigateToStripeHostedUrl } from '../lib/stripeHostedNavigation'

type AccountStatus = {
  ok: true
  accountId: string
  readyToReceivePayments: boolean
  onboardingComplete: boolean
  requirementsStatus: string | null
}

type AccountRow = { userId: string; label: string; accountId: string }
type AccountsResp = { ok: true; accounts: AccountRow[] }

export default function ProviderStripeConnectDemo() {
  const [displayName, setDisplayName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AccountStatus | null>(null)
  const [accounts, setAccounts] = useState<AccountRow[]>([])

  const canCreate = useMemo(() => displayName.trim().length >= 2 && contactEmail.trim().length >= 5 && !busy, [displayName, contactEmail, busy])

  const refresh = () => {
    setError(null)
    apiGet<AccountStatus>('/v1/stripe-connect-demo/account')
      .then((r) => setStatus(r))
      .catch((e: any) => {
        const msg = String(e?.message || e)
        // Not found means user hasn't created a connected account yet.
        if (/not found/i.test(msg)) setStatus(null)
        else setError(msg)
      })
    apiGet<AccountsResp>('/v1/stripe-connect-demo/accounts')
      .then((r) => setAccounts(r.accounts || []))
      .catch(() => {})
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createAccount = async () => {
    if (!canCreate) return
    setBusy(true)
    setError(null)
    try {
      await apiPost('/v1/stripe-connect-demo/accounts', { displayName: displayName.trim(), contactEmail: contactEmail.trim() })
      refresh()
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  const startOnboarding = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await apiPost<{ ok: true; url: string }>('/v1/stripe-connect-demo/account-link', {})
      if (!r?.url) throw new Error('No onboarding URL returned.')
      if (!navigateToStripeHostedUrl(r.url)) throw new Error('Invalid Stripe URL.')
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
          <h1 style={{ margin: 0 }}>Stripe Connect (sample)</h1>
          <p className="muted pageSubtitle">Onboard a connected account, create products, and test the storefront.</p>
        </div>
        <ProviderSubpageNavActions />
      </div>

      {error ? (
        <section className="card cardAccentRed">
          <div style={{ fontWeight: 900 }}>Error</div>
          <div className="divider" />
          <div className="muted">{error}</div>
        </section>
      ) : null}

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>1) Connected account</h2>
          <span className="pill">V2</span>
        </div>
        <div className="divider" />

        {status ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Account: <b>{status.accountId}</b>
            <div style={{ marginTop: 6 }}>
              Ready to receive payments: <b>{status.readyToReceivePayments ? 'Yes' : 'No'}</b> · Onboarding complete:{' '}
              <b>{status.onboardingComplete ? 'Yes' : 'No'}</b> · Requirements status: <b>{status.requirementsStatus || '—'}</b>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>
            No connected account for this staff user yet.
          </div>
        )}

        <div className="divider" />
        {!status ? (
          <div className="formRow" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Display name
              </div>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Example practice" />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Contact email
              </div>
              <input className="input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="billing@example.com" />
            </label>
          </div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {!status ? (
            <button type="button" className="btn btnPrimary" disabled={!canCreate} onClick={createAccount}>
              {busy ? 'Working…' : 'Create connected account'}
            </button>
          ) : (
            <button type="button" className="btn btnPrimary" disabled={busy} onClick={startOnboarding}>
              {busy ? 'Working…' : 'Onboard to collect payments'}
            </button>
          )}
          <button type="button" className="btn" disabled={busy} onClick={refresh}>
            Refresh status
          </button>
        </div>
      </section>

      <section className="card cardAccentSoft" style={{ marginTop: 12 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>2) Create products</h2>
          <span className="pill">Platform</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          Create Stripe products at the platform level and map them to a connected account via product metadata.
        </p>
        <div className="divider" />
        <Link to="/provider/connect-demo/products" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
          Open product creator
        </Link>
      </section>

      <section className="card cardAccentNavy" style={{ marginTop: 12 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>3) Storefront</h2>
          <span className="pill pillRed">Customer</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          This is a simple public page that lists products and starts hosted checkout using a destination charge + application fee.
        </p>
        <div className="divider" />
        <Link to="/storefront" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
          Open storefront
        </Link>
      </section>

      {accounts.length > 0 ? (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Connected accounts (from local DB)</h2>
            <span className="pill">Demo</span>
          </div>
          <div className="divider" />
          <div className="tableWrap">
            <table className="table" aria-label="Connected accounts list">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Account ID</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.userId}>
                    <td className="muted">{a.label}</td>
                    <td className="muted">{a.accountId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}

