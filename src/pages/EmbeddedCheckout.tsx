import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import Page from '../components/Page'
import { vitePublicEnv } from '../config/publicEnv'

export default function EmbeddedCheckoutPage() {
  const { slug } = useParams()
  const location = useLocation()

  const clientSecret = useMemo(() => {
    const qs = new URLSearchParams(location.search)
    // Prefer query for shareability, fallback to sessionStorage.
    const fromQuery = (qs.get('cs') || '').trim()
    if (fromQuery) return fromQuery
    try {
      const k = slug ? `wph_checkout_cs_${slug}` : 'wph_checkout_cs'
      return (sessionStorage.getItem(k) || '').trim()
    } catch {
      return ''
    }
  }, [location.search, slug])

  const publishableKey = (vitePublicEnv.VITE_STRIPE_PUBLISHABLE_KEY || '').trim()

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null
    return loadStripe(publishableKey)
  }, [publishableKey])

  if (!slug) {
    return (
      <Page variant="prose">
        <h1 style={{ margin: 0 }}>Checkout</h1>
        <p className="muted">Missing pharmacy partner.</p>
      </Page>
    )
  }

  if (!publishableKey) {
    return (
      <Page variant="prose">
        <h1 style={{ margin: 0 }}>Checkout</h1>
        <p className="muted">
          Embedded checkout isn’t configured yet. Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> for the website build,
          or use the hosted Stripe redirect flow.
        </p>
        <div className="btnRow" style={{ marginTop: 12 }}>
          <Link to={`/order-now/${encodeURIComponent(slug)}/summary`} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Back to order summary
          </Link>
        </div>
      </Page>
    )
  }

  if (!clientSecret) {
    return (
      <Page variant="prose">
        <h1 style={{ margin: 0 }}>Checkout</h1>
        <p className="muted">
          Missing checkout session. Please return to the order summary and click checkout again.
        </p>
        <div className="btnRow" style={{ marginTop: 12 }}>
          <Link to={`/order-now/${encodeURIComponent(slug)}/summary`} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Back to order summary
          </Link>
        </div>
      </Page>
    )
  }

  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Secure checkout</h1>
          <p className="muted pageSubtitle">Payment is processed by Stripe.</p>
        </div>
        <Link
          to={`/order-now/${encodeURIComponent(slug)}/summary`}
          className="btn catalogOutlineBtn"
          style={{ textDecoration: 'none' }}
        >
          Back
        </Link>
      </div>

      <section className="card cardAccentSoft" style={{ padding: 0, overflow: 'hidden' }}>
        <EmbeddedCheckoutProvider stripe={stripePromise!} options={{ clientSecret }}>
          <div style={{ padding: 16 }}>
            <EmbeddedCheckout />
          </div>
        </EmbeddedCheckoutProvider>
      </section>
    </Page>
  )
}

