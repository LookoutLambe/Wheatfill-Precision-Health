import { Link } from 'react-router-dom'

export default function Pricing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0 }}>Pricing</h1>
        <p className="muted" style={{ marginTop: 8, fontSize: 18 }}>
          Transparent pricing for consults and follow-ups. (Prototype content — adjust as needed.)
        </p>
      </div>

      <div className="cardGrid">
        <section className="card">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>New Patient Consultation</h2>
            <span className="pill pillRed">$110 • ~30 min</span>
          </div>
          <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            <li>Comprehensive health assessment</li>
            <li>Medical history review</li>
            <li>Goal setting + treatment planning</li>
            <li>Medication discussion (if appropriate)</li>
          </ul>
          <div className="divider" />
          <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Book online
          </Link>
        </section>

        <section className="card">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Follow-Up Consultation</h2>
            <span className="pill">$85 • ~15 min</span>
          </div>
          <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            <li>Progress check-in</li>
            <li>Medication adjustments</li>
            <li>Address concerns</li>
            <li>Ongoing support</li>
          </ul>
          <div className="divider" />
          <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Book online
          </Link>
        </section>
      </div>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>What’s included</h2>
          <span className="pill">Telehealth</span>
        </div>
        <div className="divider" />
        <p className="muted">
          Care is individualized. If you’re pursuing GLP-1 therapy, labs and medication costs may be
          separate depending on your plan and sourcing. You can use the Ordering Portal to request
          refills, labs, or questions between visits.
        </p>
      </section>
    </div>
  )
}

