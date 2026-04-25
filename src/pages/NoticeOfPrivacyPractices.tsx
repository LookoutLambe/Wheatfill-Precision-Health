import { Link } from 'react-router-dom'
import { PRACTICE_PUBLIC_NAME, PROVIDER_DISPLAY_NAME, PROVIDER_LICENSED_STATES } from '../config/provider'

/**
 * Required HIPAA Notice of Privacy Practices (NPP) for patients. Edit dates and contact
 * with your compliance workflow; this is a patient-facing template.
 */
export default function NoticeOfPrivacyPractices() {
  const states = PROVIDER_LICENSED_STATES.join(', ')
  return (
    <div className="page">
      <div>
        <h1 style={{ margin: 0 }}>Notice of Privacy Practices</h1>
        <p className="muted pageSubtitle">HIPAA · Protected health information (PHI)</p>
      </div>

      <section className="card cardAccentNavy">
        <p className="muted" style={{ marginTop: 0 }}>
          <strong>Effective date:</strong> {new Date().getFullYear()} · <strong>Practice:</strong> {PRACTICE_PUBLIC_NAME}{' '}
          · <strong>Clinician:</strong> {PROVIDER_DISPLAY_NAME}
          {states ? ` · Licensed: ${states}` : null}
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          This notice describes how medical information about you may be used and disclosed and how you can get
          access to this information. We are required by the Health Insurance Portability and Accountability Act
          (HIPAA) to provide you with this notice of our legal duties and privacy practices.
        </p>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Our commitment to your information</h2>
          <span className="pill">PHI</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          We are committed to maintaining the privacy of your protected health information. When we use or share your
          information, we will follow the terms of this notice (and applicable law) or obtain your written
          authorization when required.
        </p>
      </section>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>How we may use and disclose PHI</h2>
          <span className="pill">Uses</span>
        </div>
        <div className="divider" />
        <ul className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>
            <strong>Treatment</strong> — to provide, coordinate, or manage your care, including with labs, pharmacies,
            or other providers as appropriate.
          </li>
          <li>
            <strong>Payment</strong> — to obtain payment for services, including billing, claims, and collection
            activities, as permitted.
          </li>
          <li>
            <strong>Health care operations</strong> — for quality review, care coordination, training, compliance, and
            other operations that support the practice.
          </li>
          <li>
            <strong>As required by law</strong> — for example, public health reporting, court orders, or law
            enforcement when the law requires it.
          </li>
        </ul>
        <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
          Other uses and disclosures not covered above require your written authorization, except as otherwise allowed
          by HIPAA. You may revoke an authorization in writing, except to the extent we have already acted on it.
        </p>
      </section>

      <section className="card cardAccentRed">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Your rights</h2>
          <span className="pill">HIPAA</span>
        </div>
        <div className="divider" />
        <ul className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>
            <strong>Access</strong> — you may request access to or copies of your records as allowed by law.
          </li>
          <li>
            <strong>Amendment</strong> — you may request correction of your health information, subject to legal
            limitations.
          </li>
          <li>
            <strong>Accounting</strong> — you may request a list of certain disclosures we have made, where required.
          </li>
          <li>
            <strong>Restrictions and confidential communications</strong> — you may request restrictions on certain
            uses or how we contact you, which we will honor if we can under the law.
          </li>
          <li>
            <strong>Complaint</strong> — you may complain to us or to the U.S. Department of Health and Human
            Services. You will not be retaliated against for filing a complaint.
          </li>
        </ul>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Changes to this notice</h2>
          <span className="pill">Updates</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          We may update this notice; the new notice will be posted on this site, with a new effective date when
          required. A copy of the current notice is available on request and at{' '}
          <Link to="/npp" style={{ color: 'var(--navy-2)' }}>
            the Notice of Privacy Practices page
          </Link>
          .
        </p>
      </section>

      <section className="card cardAccentNavy">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Contact</h2>
          <span className="pill">Privacy</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          For questions about this notice, your PHI, or to exercise your rights, contact {PRACTICE_PUBLIC_NAME} through
          the <Link to="/contact">Contact</Link> page, or the contact information your care team has provided. For
          concerns about your privacy, you may also file a complaint with the U.S. HHS Office for Civil Rights
          (OCR) — see{' '}
          <a href="https://www.hhs.gov/ocr/privacy/hipaa/complaints/" target="_blank" rel="noopener noreferrer">
            hhs.gov/ocr
          </a>
          .
        </p>
        <p className="muted" style={{ marginBottom: 0, fontSize: 14 }}>
          <Link to="/privacy" style={{ color: 'var(--navy-2)' }}>
            Privacy Policy
          </Link>
          {' · '}
          <Link to="/terms" style={{ color: 'var(--navy-2)' }}>
            Terms of Service
          </Link>
        </p>
      </section>
    </div>
  )
}
