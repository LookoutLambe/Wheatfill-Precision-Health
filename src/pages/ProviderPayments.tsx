import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import { apiGet, apiLogout, apiPatch, apiPost, fetchApiSession, setApiSessionHint } from '../api/client'
import { navigateToStripeHostedUrl } from '../lib/stripeHostedNavigation'
import Page from '../components/Page'

type PaymentsStatus = {
  activeProvider: 'stripe' | null
  stripe: {
    available: boolean
    connected: boolean
    accountId: string | null
    onboardingStatus: string | null
    chargesEnabled: boolean
    payoutsEnabled: boolean
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

  const [reqAmount, setReqAmount] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqEmail, setReqEmail] = useState('')
  const [reqBusy, setReqBusy] = useState(false)
  const [reqUrl, setReqUrl] = useState<string | null>(null)

  async function load(opts?: { silent?: boolean }) {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<PaymentsStatus>('/v1/provider/payments')
      setStatus(res)
      setPaymentsAuthed(true)
      setApiSessionHint()
    } catch (e: unknown) {
      setPaymentsAuthed(false)
      setStatus(null)
      if (!opts?.silent) setError(String((e as Error)?.message || e))
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
    if (qs.get('stripe') === 'return' || qs.get('stripe') === 'refresh') {
      void apiPost('/v1/provider/payments/stripe/refresh', {}).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Payments</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Connect Stripe for patient catalog checkout (Hosted Checkout). Payouts use Stripe Connect when configured.
          </p>
        </div>
        <ProviderSubpageNavActions />
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
          <p className="muted">This screen uses your backend provider credentials for payment configuration.</p>
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
                  } catch (e: unknown) {
                    setError(String((e as Error)?.message || e))
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
                            if (!navigateToStripeHostedUrl(res.url)) {
                              setError('Could not open Stripe. Check the URL and try again.')
                            }
                          } catch (e: unknown) {
                            setError(String((e as Error)?.message || e))
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
                          } catch (e: unknown) {
                            setError(String((e as Error)?.message || e))
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
                          } catch (e: unknown) {
                            setError(String((e as Error)?.message || e))
                          }
                        })()
                      }}
                    >
                      {status.activeProvider === 'stripe' ? 'Stripe active for checkout' : 'Set Stripe as active'}
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
                            if (!navigateToStripeHostedUrl(res.url)) {
                              setError('Could not open checkout. Check the URL and try again.')
                            }
                          } catch (e: unknown) {
                            setError(String((e as Error)?.message || e))
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
                <h2 style={{ margin: 0 }}>Create payment request</h2>
                <span className="pill pillRed">Custom</span>
              </div>
              <div className="divider" />
              <p className="muted" style={{ marginTop: 0 }}>
                Generate a secure Stripe payment link for any service amount. Nothing is charged until the patient pays.
              </p>

              <div className="formRow" style={{ marginTop: 12 }}>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Amount (USD)
                  </div>
                  <input
                    className="input"
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="149"
                  />
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Patient email (optional)
                  </div>
                  <input
                    className="input"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    type="email"
                    placeholder="name@email.com"
                  />
                </label>
              </div>

              <label style={{ display: 'block', marginTop: 12 }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Description
                </div>
                <input
                  className="input"
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="Initial consultation"
                />
              </label>

              {reqUrl ? (
                <div className="landingConsultNotice landingConsultNotice--ok" style={{ marginTop: 12 }}>
                  Payment link created.{' '}
                  <a href={reqUrl} target="_blank" rel="noreferrer">
                    Open Stripe checkout
                  </a>
                </div>
              ) : null}

              <div className="btnRow" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={reqBusy}
                  style={{ opacity: reqBusy ? 0.7 : 1 }}
                  onClick={() => {
                    ;(async () => {
                      setError(null)
                      setReqUrl(null)
                      const amt = Number(String(reqAmount).replace(/[^0-9.]/g, ''))
                      if (!Number.isFinite(amt) || amt <= 0) {
                        setError('Enter a valid amount.')
                        return
                      }
                      const amountCents = Math.round(amt * 100)
                      if (amountCents < 50) {
                        setError('Amount must be at least $0.50.')
                        return
                      }
                      const desc = reqDesc.trim()
                      if (desc.length < 2) {
                        setError('Enter a short description.')
                        return
                      }
                      setReqBusy(true)
                      try {
                        const res = await apiPost<{ url: string }>('/v1/provider/payments/stripe/payment-request', {
                          amountCents,
                          currency: 'usd',
                          description: desc,
                          patientEmail: reqEmail.trim(),
                        })
                        setReqUrl(res.url)
                        if (!navigateToStripeHostedUrl(res.url)) {
                          // If popup blocked, keep link visible.
                        }
                      } catch (e: unknown) {
                        setError(String((e as Error)?.message || e))
                      } finally {
                        setReqBusy(false)
                      }
                    })()
                  }}
                >
                  {reqBusy ? 'Creating…' : 'Create payment link'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={reqBusy}
                  onClick={() => {
                    setReqAmount('')
                    setReqDesc('')
                    setReqEmail('')
                    setReqUrl(null)
                  }}
                >
                  Clear
                </button>
              </div>
            </section>
          </div>

          <section className="card" style={{ marginTop: 16 }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Checkout routing</h2>
              <span className="pill">Stripe</span>
            </div>
            <div className="divider" />
            {loading || !status ? (
              <p className="muted">Loading…</p>
            ) : (
              <p className="muted">
                Catalog checkout uses Stripe Hosted Checkout when <code>STRIPE_SECRET_KEY</code> is set on the API.
                Connect lets payments settle to your linked account when onboarding is complete.
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
    </Page>
  )
}
