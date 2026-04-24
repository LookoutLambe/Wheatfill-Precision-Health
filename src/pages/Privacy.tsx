export default function Privacy() {
  return (
    <div className="page">
      <div>
        <h1 style={{ margin: 0 }}>Privacy Policy</h1>
        <p className="muted pageSubtitle">
          Prototype policy content — replace with your finalized legal language.
        </p>
      </div>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Overview</h2>
          <span className="pill">Privacy</span>
        </div>
        <div className="divider" />
        <p className="muted">
          Wheatfill Precision Health respects your privacy. This prototype site is for demonstration
          only and does not collect protected health information (PHI) or process real prescriptions
          or orders.
        </p>
      </section>

      <section className="card cardAccentRed">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Information we may collect</h2>
          <span className="pill pillRed">Prototype</span>
        </div>
        <div className="divider" />
        <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Contact form messages you submit in the UI (stored locally in your browser).</li>
          <li>Appointment and order requests (stored locally in your browser).</li>
        </ul>
      </section>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Local storage</h2>
          <span className="pill">Browser</span>
        </div>
        <div className="divider" />
        <p className="muted">
          This prototype uses browser local storage to simulate a patient portal and provider queue.
          Data stays on your device unless you clear your browser storage.
        </p>
      </section>
    </div>
  )
}

