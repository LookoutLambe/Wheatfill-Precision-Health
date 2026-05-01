import { Link, useLocation } from 'react-router-dom'
import Page from '../components/Page'

export default function SignIn() {
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next') || '/'

  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Sign in</h1>
          <p className="muted pageSubtitle">Patient sign-in is not supported on this site.</p>
        </div>
        <Link to="/" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Provider access</h2>
          <span className="pill pillRed">Staff</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          If you are staff, use <Link to={`/provider/login?next=${encodeURIComponent(next)}`}>Provider Login</Link>.
        </p>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          Patients can browse and complete payment through <strong>Stripe Checkout</strong> when a checkout link is provided.
        </p>
      </section>
    </Page>
  )
}

