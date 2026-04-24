import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { getMarketingProviderUser, isMarketingProviderAuthed, setMarketingProviderAuthed } from '../marketing/providerStore'

export default function MarketingProviderDashboard() {
  const navigate = useNavigate()
  const who = getMarketingProviderUser()

  useEffect(() => {
    if (!isMarketingProviderAuthed()) navigate('/provider/login', { replace: true })
  }, [navigate])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Provider Portal</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            VBMS-style dashboard (marketing-only). Configure links and preview workflow without patient data.
          </p>
          {who ? <div className="pill" style={{ marginTop: 10, width: 'fit-content' }}>Signed in as: {who}</div> : null}
        </div>
        <div className="pageActions">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setMarketingProviderAuthed(false)
              navigate('/', { replace: true })
            }}
          >
            Logout
          </button>
          <span className="pill pillRed">Provider</span>
        </div>
      </div>

      <div className="cardGrid">
        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Demo dashboard</h2>
            <span className="pill">VBMS</span>
          </div>
          <div className="divider" />
          <p className="muted">
            Use a full demo experience with sample patients, appointments, inbox, and orders.
          </p>
          <div className="divider" />
          <Link to="/provider/demo" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%' }}>
            Open demo dashboard
          </Link>
        </section>

        <section className="card cardAccentNavy">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Integrations</h2>
            <span className="pill pillRed">EHR</span>
          </div>
          <div className="divider" />
          <p className="muted">Set your booking URL, patient portal URL, pharmacy link, and video visit room.</p>
          <div className="divider" />
          <Link to="/provider/integrations" className="btn btnPrimary" style={{ textDecoration: 'none', width: '100%' }}>
            Open integrations
          </Link>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Inbox (preview)</h2>
            <span className="pill">Demo</span>
          </div>
          <div className="divider" />
          <p className="muted">
            In the production app this shows contact + patient messages. In marketing-only mode, this is a preview area.
          </p>
          <div className="divider" />
          <div className="pill">No messages (marketing-only)</div>
        </section>

        <section className="card cardAccentRed">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Schedule (preview)</h2>
            <span className="pill pillRed">Demo</span>
          </div>
          <div className="divider" />
          <p className="muted">
            In the production app this is your real schedule + blackout dates. Here it’s a UI preview only.
          </p>
          <div className="divider" />
          <div className="btnRow">
            <button type="button" className="btn" disabled style={{ opacity: 0.6 }}>
              Add blackout (disabled)
            </button>
            <button type="button" className="btn" disabled style={{ opacity: 0.6 }}>
              Schedule visit (disabled)
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

