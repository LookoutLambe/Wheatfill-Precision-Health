import { Link } from 'react-router-dom'
import { PRACTICE_PUBLIC_NAME, PROVIDER_DISPLAY_NAME, PROVIDER_LICENSED_STATES } from '../config/provider'

export default function TermsOfService() {
  const year = new Date().getFullYear()
  const states = PROVIDER_LICENSED_STATES.join(', ')
  return (
    <div className="page">
      <div>
        <h1 style={{ margin: 0 }}>Terms of Service</h1>
        <p className="muted pageSubtitle">Use of this website and related communications</p>
      </div>

      <section className="card cardAccentNavy">
        <p className="muted" style={{ margin: 0 }}>
          <strong>Last updated:</strong> {year} · <strong>Practice:</strong> {PRACTICE_PUBLIC_NAME}
          {states ? ` · Licensed: ${states}` : null} · <strong>Provider of record:</strong> {PROVIDER_DISPLAY_NAME}
        </p>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Agreement</h2>
          <span className="pill">General</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          By using this site, you agree to these terms. If you do not agree, do not use the site. We may update these
          terms; continued use after changes are posted means you accept the updated terms. Telehealth and clinical
          care are subject to separate consents and policies you receive as a patient.
        </p>
      </section>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Not medical advice on this page</h2>
          <span className="pill">Disclaimer</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          Content on this site is for general information and scheduling or ordering as directed by the practice. It
          is not a substitute for professional medical advice, diagnosis, or treatment. For emergencies, call 911. Do
          not use this site for emergent or time-sensitive care.
        </p>
      </section>

      <section className="card cardAccentRed">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Use of the site &amp; account security</h2>
          <span className="pill">Acceptable use</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          You agree to provide accurate information where requested and to keep login credentials (if any)
          confidential. The practice may suspend or limit access to protect the security of systems or to comply with
          law. You will not use the site to send PHI of others without authorization, or to interfere with the site
          or other users.
        </p>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Payments, orders, and third parties</h2>
          <span className="pill">Commerce</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          When you are instructed to pay or place an order, follow the instructions provided by the practice.
          Third-party services (e.g. scheduling, payment, pharmacy partners) are governed by their own terms. This
          site may link to those services; we are not responsible for third-party content or systems outside our
          control.
        </p>
      </section>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Limitation of liability</h2>
          <span className="pill">Legal</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          To the maximum extent allowed by law, the practice and its team are not liable for indirect, incidental, or
          consequential damages arising from your use of this site. We do not guarantee that the site will be
          uninterrupted or error-free. Some jurisdictions do not allow certain limitations; those may not apply to
          you.
        </p>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Governing law</h2>
          <span className="pill">Disputes</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          These terms are governed by the laws applicable in the state(s) in which the practice is licensed, without
          regard to conflict-of-law rules. You agree to resolve disputes in the appropriate courts for that
          jurisdiction, subject to your rights that cannot be waived.
        </p>
      </section>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Contact</h2>
          <span className="pill">Questions</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          Questions about these terms: use our <Link to="/contact">Contact</Link> page. For how we use health
          information, see the{' '}
          <Link to="/npp" style={{ color: 'var(--navy-2)' }}>
            Notice of Privacy Practices
          </Link>
          {', '}
          and for other data practices, the{' '}
          <Link to="/privacy" style={{ color: 'var(--navy-2)' }}>
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
