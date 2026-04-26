import { Link } from 'react-router-dom'
import { BookVisitCta } from '../components/CharmMarketingCtas'

export default function Pricing() {
  return (
    <div className="page pricingPage" style={{ gap: 22 }}>
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0, scrollMarginTop: 88 }}>Transparent Pricing</h1>
          <p className="muted pageSubtitle" style={{ marginTop: 8, fontSize: 18 }}>
            Clear, upfront costs with no hidden fees or surprises.
          </p>
        </div>
      </div>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Consultation Fees</h2>
          <span className="pill">Telehealth</span>
        </div>
        <div className="divider" />

      <div className="cardGrid pricingConsultGrid">
        <section className="card cardAccentNavy" style={{ gridColumn: 'span 6' }}>
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
          <BookVisitCta className="btn btnPrimary" style={{ textDecoration: 'none' }} mode="primary">
            Book your consultation
          </BookVisitCta>
        </section>

        <section className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Established Patient</h2>
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
          <BookVisitCta className="btn btnPrimary" style={{ textDecoration: 'none' }} mode="primary">
            Book your consultation
          </BookVisitCta>
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
          <div className="card cardAccentNavy" style={{ gridColumn: 'span 6' }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Semaglutide</h2>
              <span className="pill">$180+</span>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Monthly medication cost varies by dose and vial size.
            </p>
          </div>
          <div className="card cardAccentRed" style={{ gridColumn: 'span 6' }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Tirzepatide</h2>
              <span className="pill">$260+</span>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Monthly medication cost varies by dose and vial size.
            </p>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 14, fontSize: 15, lineHeight: 1.55 }}>
          For <b>current vial SKUs and dollar amounts</b> (including multi-size tiers), open <b>Order Now</b>—pricing
          there matches the catalog you use when ordering through the practice at checkout.
        </p>
        <div className="pricingPageCtaRow" style={{ marginTop: 12 }}>
          <Link to="/order-now" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Browse Order Now Catalog
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>What’s Included</h2>
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

        <div className="cardGrid" style={{ marginTop: 12 }}>
          <div className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
              Does insurance cover these services?
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="muted">
              Most insurance does not cover weight loss medications or telehealth consultations for
              weight management. We provide transparent pricing so you know exactly what to expect.
              Payment is due at the time of service.
            </div>
          </div>

          <div className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
              How often will I need follow-up appointments?
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="muted">
              Follow-up appointments are typically scheduled for your first refill to monitor your
              progress, adjust medications as needed, and provide ongoing support. The frequency may
              vary based on your individual needs and treatment plan, but there is always a final
              visit for ongoing weaning and to make decisions about maintenance.
            </div>
          </div>

          <div className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>Can medication prices change?</div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="muted">
              Medication pricing may vary based on dosage levels as you progress through your
              treatment plan, but it is completely your decision on which size of medication you can
              affordably get. We'll always discuss any pricing changes with you before adjusting your
              prescription.
            </div>
          </div>

          <div className="card cardAccentSoft" style={{ gridColumn: 'span 6' }}>
            <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>
              How does payment work?
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="muted">
              We’ll confirm your plan and total before you pay. If medication is prescribed, your care team will send
              instructions for completing payment and coordinating fulfillment.
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
        <BookVisitCta className="btn btnPrimary" style={{ textDecoration: 'none' }} mode="primary">
          Book your consultation
        </BookVisitCta>
      </section>
    </div>
  )
}


