import { Link } from 'react-router-dom'
import { optionalCustomerAccountUrl, publicSchedulingUrlForFullApp } from '../config/patientFeatures'

/**
 * Customer hub (DTC / consumer site—not a hospital portal). Everything important is on this site.
 */
export default function PatientPortalInfo() {
  const accountUrl = optionalCustomerAccountUrl() || null
  const bookUrl = publicSchedulingUrlForFullApp() || null

  return (
    <div className="page" style={{ gap: 22, maxWidth: 720, margin: '0 auto' }}>
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0, scrollMarginTop: 88 }}>For patients</h1>
          <p className="muted pageSubtitle" style={{ marginTop: 8 }}>
            Shop the catalog, book a time, and message the team—right here, like a modern consumer brand. Payment is
            Venmo, PayPal, Zelle, or card (Stripe) when the team tells you the amount and how to pay.
          </p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <div className="cardGrid" style={{ alignItems: 'stretch' }}>
        <section className="card cardAccentNavy" style={{ gridColumn: 'span 6' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Book a visit</h2>
            <span className="pill">Schedule</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Use the on-site calendar, or your scheduling link if we’ve published one in settings.
          </p>
          <div className="divider" />
          {bookUrl ? (
            <a className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }} href={bookUrl} target="_blank" rel="noopener noreferrer">
              Open scheduling
            </a>
          ) : (
            <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
              Book online
            </Link>
          )}
        </section>

        <section className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Order &amp; catalog</h2>
            <span className="pill">Order Now</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>Browse vial options and place orders through the practice when you’re ready.</p>
          <div className="divider" />
          <Link to="/order-now" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
            Order Now
          </Link>
        </section>
      </div>

      <section className="card cardAccentNavy" style={{ width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Contact</h2>
          <span className="pill">Reach us</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Questions and non-urgent messages go through the Contact page. For emergencies, call 911.
        </p>
        <div className="divider" />
        <div className="btnRow">
          <Link to="/contact" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Contact
          </Link>
          <Link to="/pricing" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
            Pricing
          </Link>
        </div>
      </section>

      {accountUrl ? (
        <section className="card" style={{ width: '100%' }}>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            If we gave you a separate account link (orders, subscription, or partner app), open it here. Your main
            journey still runs on this website.
          </p>
          <div className="btnRow" style={{ marginTop: 14 }}>
            <a className="btn" style={{ textDecoration: 'none' }} href={accountUrl} target="_blank" rel="noopener noreferrer">
              Open your account
            </a>
          </div>
        </section>
      ) : null}
    </div>
  )
}
