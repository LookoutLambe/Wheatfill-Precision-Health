import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="page">
      <div>
        <h1 style={{ margin: 0 }}>Privacy Policy</h1>
        <p className="muted pageSubtitle">Website &amp; SMS — messaging and marketing data practices</p>
        <p className="muted" style={{ marginTop: 6, maxWidth: 56 * 16, fontSize: 15, lineHeight: 1.55 }}>
          For your <strong>HIPAA Notice of Privacy Practices</strong> (how we use and disclose health information), see
          the{' '}
          <Link to="/npp" style={{ color: 'var(--navy-2)', fontWeight: 800 }}>
            Notice of Privacy Practices
          </Link>
          . For website terms, see{' '}
          <Link to="/terms" style={{ color: 'var(--navy-2)', fontWeight: 800 }}>
            Terms of Service
          </Link>
          .
        </p>
      </div>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Mobile SMS Messaging Privacy Policy</h2>
          <span className="pill pillRed">SMS</span>
        </div>
        <div className="divider" />

        <div className="stack">
          <div>
            <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>Information collected</div>
            <p className="muted" style={{ marginTop: 6 }}>
              We may collect information, such as name, phone number, and email address.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>Use of information collected</div>
            <p className="muted" style={{ marginTop: 6 }}>
              We may use the information we collect to perform the services requested including billing, customer
              service, appointment reminders and other administrative requests.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>Sharing of information collected</div>
            <p className="muted" style={{ marginTop: 6 }}>
              Mobile information will not be shared with third parties/affiliates for marketing/promotional purposes.
              This includes text messaging opt-in data and consent.
            </p>
          </div>

          <div className="card cardAccentSoft" style={{ gridColumn: 'span 12' }}>
            <div style={{ fontWeight: 850, color: 'var(--text-h)' }}>Opt-out and help</div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <p className="muted" style={{ margin: 0 }}>
              As a current or prospective customer, you understand that you can text <b>STOP</b> at any time to opt out
              of receiving SMS text messages from us. You can text <b>HELP</b> at any time to receive help.
              {'\n\n'}
              You understand that the messaging frequency may vary. Messaging &amp; data rates may apply.
              {'\n\n'}
              At any time if you want your information to be removed, you can contact us via our email address or
              regular mail.
            </p>
          </div>
        </div>
      </section>

      <section className="card cardAccentRed">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>CTIA guidelines</h2>
          <span className="pill">Policy</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          All policies are followed as per CTIA guidelines 5.2.1.
        </p>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Questions</h2>
          <span className="pill">Contact</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          If you have questions about this policy, please contact us via the <Link to="/contact">Contact</Link> page.
        </p>
      </section>
    </div>
  )
}

