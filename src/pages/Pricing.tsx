import { Link } from 'react-router-dom'

export default function Pricing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0 }}>Transparent Pricing</h1>
        <p className="muted" style={{ marginTop: 8, fontSize: 18 }}>
          Clear, upfront costs with no hidden fees or surprises.
        </p>
      </div>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Consultation Fees</h2>
          <span className="pill">Telehealth</span>
        </div>
        <div className="divider" />

      <div className="cardGrid">
        <section className="card" style={{ gridColumn: 'span 6' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>New Patient</h2>
            <span className="pill pillRed">$110</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Initial consultation visit
          </p>
          <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            <li>Comprehensive health assessment</li>
            <li>Medical history review</li>
            <li>Treatment plan development</li>
            <li>Medication consultation</li>
            <li>Answer all your questions</li>
          </ul>
          <div className="divider" />
          <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Book Your Consultation
          </Link>
        </section>

        <section className="card" style={{ gridColumn: 'span 6' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Established patient</h2>
            <span className="pill">$85</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Follow-up Visit
          </p>
          <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            <li>Progress check-in</li>
            <li>Medication adjustment</li>
            <li>Address concerns or questions</li>
            <li>Ongoing support</li>
            <li>Treatment optimization</li>
          </ul>
          <div className="divider" />
          <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Book Your Consultation
          </Link>
        </section>
      </div>
      </section>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Medication Pricing</h2>
          <span className="pill pillRed">GLP-1</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          High-quality compounded medications at competitive prices
        </p>
        <div className="divider" />

        <div className="cardGrid">
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Semaglutide</h2>
              <span className="pill">$180+</span>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Starting at <b>$180</b>
            </p>
          </div>
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Tirzepatide</h2>
              <span className="pill">$260+</span>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Starting at <b>$260</b>
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>What’s included</h2>
          <span className="pill">Telehealth</span>
        </div>
        <div className="divider" />
        <p className="muted">
          Your medication cost includes the prescription, compounding, and shipping to your door.
          All consultations include personalized treatment plans, ongoing support, and medication
          management to ensure you achieve your health goals safely and effectively.
        </p>
      </section>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Pricing FAQ</h2>
          <span className="pill">FAQ</span>
        </div>
        <div className="divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
              Does insurance cover these services?
            </div>
            <div className="muted">
              Most insurance does not cover weight loss medications or telehealth consultations for
              weight management. We provide transparent pricing so you know exactly what to expect.
              Payment is due at the time of service.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
              How often will I need follow-up appointments?
            </div>
            <div className="muted">
              Follow-up appointments are typically scheduled for your first refill to monitor your
              progress, adjust medications as needed, and provide ongoing support. The frequency may
              vary based on your individual needs and treatment plan, but there is always a final
              visit for ongoing weaning and to make decisions about maintenance.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>Can medication prices change?</div>
            <div className="muted">
              Medication pricing may vary based on dosage levels as you progress through your
              treatment plan, but it is completely your decision on which size of medication you can
              affordably get. We'll always discuss any pricing changes with you before adjusting your
              prescription.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
              What payment methods do you accept?
            </div>
            <div className="muted">
              We accept Cash App, all major credit cards, debit cards, and HSA/FSA cards for both
              consultations and medications.
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Ready to Start Your Health Journey?</h2>
          <span className="pill pillRed">Start</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Take the first step toward your weight loss goals with personalized, board-certified care
        </p>
        <div className="divider" />
        <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
          Book Your Consultation
        </Link>
      </section>
    </div>
  )
}

