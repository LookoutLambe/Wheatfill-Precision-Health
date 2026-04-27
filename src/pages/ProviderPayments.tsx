import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiGet, apiLogout, apiPatch, apiPost, fetchApiSession, setApiSessionHint } from '../api/client'

type PaymentsStatus = {
  activeProvider: 'stripe' | 'clover' | null
  stripe: {
    available: boolean
    connected: boolean
    accountId: string | null
    onboardingStatus: string | null
    chargesEnabled: boolean
    payoutsEnabled: boolean
  }
  clover: {
    available: boolean
    connected: boolean
    env: string | null
    merchantId: string | null
  }
}

export default function ProviderPayments() {
  const location = useLocation()
  const qs = useMemo(() => new URLSearchParams(location.search), [location.search])

  const [paymentsAuthed, setPaymentsAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<PaymentsStatus | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [cloverEnv, setCloverEnv] = useState<'sandbox' | 'production'>('sandbox')
  const [cloverMerchantId, setCloverMerchantId] = useState('')
  const [cloverPrivateKey, setCloverPrivateKey] = useState('')

  async function load(opts?: { silent?: boolean }) {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<PaymentsStatus>('/v1/provider/payments')
      setStatus(res)
      setPaymentsAuthed(true)
      setApiSessionHint()
      setCloverEnv((res.clover.env === 'production' ? 'production' : 'sandbox') as any)
      setCloverMerchantId(res.clover.merchantId || '')
    } catch (e: any) {
      setPaymentsAuthed(false)
      setStatus(null)
      if (!opts?.silent) setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      const s = await fetchApiSession()
      if (s.ok && s.authenticated) {
        setApiSessionHint()
        await load({ silent: true })
        return
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Helpful after Stripe onboarding redirect
    if (qs.get('stripe') === 'return' || qs.get('stripe') === 'refresh') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      apiPost('/v1/provider/payments/stripe/refresh', {}).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Payments</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Connect Stripe or Clover, then choose which one is active for new payments.
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
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Action needed</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {error}
          </div>
        </div>
      ) : null}

      {!paymentsAuthed ? (
        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Provider login (Payments)</h2>
            <span className="pill pillRed">Backend</span>
          </div>
          <div className="divider" />
          <p className="muted">
            This screen uses your backend provider credentials for payment configuration.
          </p>
          <div className="formRow" style={{ marginTop: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Username
              </div>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Password
              </div>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </div>
          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => {
                ;(async () => {
                  setError(null)
                  try {
                    const res = await apiPost<{ user?: { username: string }; token?: string }>('/auth/login', { username, password })
                    if (!res?.user) throw new Error('Sign-in failed.')
                    try {
                      if (res.token) localStorage.setItem('wph_token_v1', res.token)
                      else localStorage.removeItem('wph_token_v1')
                    } catch {
                      // ignore
                    }
                    setApiSessionHint()
                    setPaymentsAuthed(true)
                    await load()
                  } catch (e: any) {
                    setError(String(e?.message || e))
                  }
                })()
              }}
            >
              Sign in
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="cardGrid">
            <section className="card cardAccentNavy">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Stripe</h2>
                <span className="pill">Connect</span>
              </div>
              <div className="divider" />
              {loading || !status ? (
                <p className="muted">Loading…</p>
              ) : (
                <>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Status: <b>{status.stripe.connected ? 'Connected' : 'Not connected'}</b>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    Onboarding: <b>{status.stripe.onboardingStatus || '—'}</b>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    Charges enabled: <b>{status.stripe.chargesEnabled ? 'Yes' : 'No'}</b> · Payouts enabled:{' '}
                    <b>{status.stripe.payoutsEnabled ? 'Yes' : 'No'}</b>
                  </div>
                  <div className="divider" />
                  <div className="btnRow">
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={!status.stripe.available}
                      style={{ opacity: status.stripe.available ? 1 : 0.6 }}
                      onClick={() => {
                        ;(async () => {
                          setError(null)
                          try {
                            const res = await apiPost<{ url: string }>('/v1/provider/payments/stripe/onboard', {})
                            window.location.href = res.url
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      {status.stripe.connected ? 'Continue onboarding' : 'Connect with Stripe'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={!status.stripe.connected}
                      style={{ opacity: status.stripe.connected ? 1 : 0.6 }}
                      onClick={() => {
                        ;(async () => {
                          setError(null)
                          try {
                            await apiPost('/v1/provider/payments/stripe/disconnect', {})
                            await load()
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="btnRow" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btnAccent"
                      disabled={!status.stripe.connected}
                      style={{ width: '100%', opacity: status.stripe.connected ? 1 : 0.6 }}
                      onClick={() => {
                        ;(async () => {
                          setError(null)
                          try {
                            await apiPatch('/v1/provider/payments/active', { provider: 'stripe' })
                            await load()
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      {status.activeProvider === 'stripe' ? 'Active' : 'Set Stripe as active'}
                    </button>
                  </div>
                  <div className="btnRow" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={!status.stripe.connected}
                      style={{ width: '100%', opacity: status.stripe.connected ? 1 : 0.6 }}
                      onClick={() => {
                        ;(async () => {
                          setError(null)
                          try {
                            const res = await apiPost<{ url: string }>('/v1/provider/payments/stripe/test-checkout', {})
                            window.location.href = res.url
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      Open $1 test checkout
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="card cardAccentSoft">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Clover</h2>
                <span className="pill pillRed">Keys</span>
              </div>
              <div className="divider" />
              {loading || !status ? (
                <p className="muted">Loading…</p>
              ) : (
                <>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Status: <b>{status.clover.connected ? 'Connected' : 'Not connected'}</b>
                  </div>
                  <div className="divider" />
                  <div className="formRow">
                    <label>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                        Environment
                      </div>
                      <select className="select" value={cloverEnv} onChange={(e) => setCloverEnv(e.target.value as any)}>
                        <option value="sandbox">Sandbox</option>
                        <option value="production">Production</option>
                      </select>
                    </label>
                    <label>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                        Merchant ID
                      </div>
                      <input className="input" value={cloverMerchantId} onChange={(e) => setCloverMerchantId(e.target.value)} />
                    </label>
                  </div>
                  <label style={{ display: 'block', marginTop: 12 }}>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      Private key (stored encrypted)
                    </div>
                    <input className="input" type="password" value={cloverPrivateKey} onChange={(e) => setCloverPrivateKey(e.target.value)} />
                  </label>
                  <div className="btnRow" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={!cloverMerchantId.trim() || !cloverPrivateKey.trim()}
                      style={{ width: '100%', opacity: cloverMerchantId.trim() && cloverPrivateKey.trim() ? 1 : 0.6 }}
                      onClick={() => {
                        ;(async () => {
                          setError(null)
                          try {
                            await apiPost('/v1/provider/payments/clover', {
                              env: cloverEnv,
                              merchantId: cloverMerchantId,
                              privateKey: cloverPrivateKey,
                            })
                            setCloverPrivateKey('')
                            await load()
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      Save Clover connection
                    </button>
                  </div>
                  <div className="btnRow" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btnAccent"
                      disabled={!status.clover.connected}
                      style={{ width: '100%', opacity: status.clover.connected ? 1 : 0.6 }}
                      onClick={() => {
                        ;(async () => {
                          setError(null)
                          try {
                            await apiPatch('/v1/provider/payments/active', { provider: 'clover' })
                            await load()
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      {status.activeProvider === 'clover' ? 'Active' : 'Set Clover as active'}
                    </button>
                  </div>
                  <div className="btnRow" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={!status.clover.connected}
                      style={{ width: '100%', opacity: status.clover.connected ? 1 : 0.6 }}
                      onClick={() => {
                        ;(async () => {
                          setError(null)
                          try {
                            await apiPost('/v1/provider/payments/clover/disconnect', {})
                            await load()
                          } catch (e: any) {
                            setError(String(e?.message || e))
                          }
                        })()
                      }}
                    >
                      Disconnect Clover
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>

          <section className="card" style={{ marginTop: 16 }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Active payment processor</h2>
              <span className="pill">Routing</span>
            </div>
            <div className="divider" />
            {loading || !status ? (
              <p className="muted">Loading…</p>
            ) : (
              <p className="muted">
                Active: <b>{status.activeProvider || 'Not set'}</b>
              </p>
            )}
            <div className="btnRow" style={{ marginTop: 12 }}>
              <button type="button" className="btn" onClick={() => load()}>
                Refresh
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void apiLogout()
                  setPaymentsAuthed(false)
                  setStatus(null)
                }}
              >
                Sign out (payments)
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

