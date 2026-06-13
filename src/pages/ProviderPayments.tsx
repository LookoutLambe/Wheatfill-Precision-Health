import { ProviderSubpageNavActions } from '../components/ProviderSubpageNavActions'
import Page from '../components/Page'

export default function ProviderPayments() {
  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Payments</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Patient catalog checkout is powered by PayPal. There is nothing to connect here — checkout opens a PayPal
            payment page with the order total prefilled.
          </p>
        </div>
        <ProviderSubpageNavActions />
      </div>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>PayPal</h2>
          <span className="pill">Active</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          When a patient checks out from the catalog, they are sent to PayPal to pay the order total. The practice
          confirms fulfillment after payment.
        </p>
        <p className="muted">
          PayPal is configured with build-time environment variables:
        </p>
        <ul className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          <li>
            <code>VITE_PAYPAL_BUSINESS_EMAIL</code> — the practice PayPal business email used to build hosted
            &ldquo;Buy Now&rdquo; checkout links with the amount prefilled.
          </li>
          <li>
            <code>VITE_PAYPAL_PAY_URL</code> — optional override: a <code>paypal.me/&lt;handle&gt;</code> link or a
            hosted PayPal button URL. Takes precedence over the business email when set.
          </li>
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>
          Update these in the app environment (and redeploy) to change where payments are collected.
        </p>
      </section>
    </Page>
  )
}
