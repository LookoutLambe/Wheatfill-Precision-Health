import { Link } from 'react-router-dom'

import brettPortrait from '../assets/brett.png'

export default function Landing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="twoCol">
        <section>
          <span className="pill">Precision health. Elevated living.</span>
          <h1 className="heroHeadline">
            Personalized, evidence-based care designed to optimize your health, performance, and
            longevity.
          </h1>
          <p className="muted" style={{ fontSize: 18 }}>
            Specializing in metabolic optimization, weight management, and advanced wellness
            therapies.
          </p>

          <div className="divider" />

          <div className="btnRow">
            <Link to="/patient" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
              Patient Portal
            </Link>
          </div>

          <div className="divider" />

          <div className="cardGrid">
            <div className="card">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Telehealth Convenience</h2>
                <span className="pill">Remote</span>
              </div>
              <p className="muted">
                Connect with care from anywhere. No travel, no waiting rooms—just focused, private,
                high-touch support.
              </p>
            </div>
            <div className="card">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Metabolic Optimization</h2>
                <span className="pill pillRed">Evidence-based</span>
              </div>
              <p className="muted">
                Programs built around your physiology, goals, and lifestyle—designed for measurable,
                sustainable results.
              </p>
            </div>
            <div className="card">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Medication Options</h2>
                <span className="pill">GLP-1</span>
              </div>
              <p className="muted">
                Evidence-based therapies such as GLP-1 medications, with plans to incorporate
                advanced peptide therapies as they become available.
              </p>
            </div>
            <div className="card">
              <div className="cardTitle">
                <h2 style={{ margin: 0 }}>Performance + Longevity</h2>
                <span className="pill pillRed">Long-term</span>
              </div>
              <p className="muted">
                Strength, vitality, and resilience—so you can fully engage in life now and for years
                to come.
              </p>
            </div>
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="portrait">
            <img src={brettPortrait} alt="Provider portrait" />
          </div>

          <div className="card">
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Brett Wheatfill, FNP-C</h2>
              <span className="pill">Founder</span>
            </div>
            <p className="muted" style={{ whiteSpace: 'pre-line' }}>
              Brett Wheatfill is a board-certified Family Nurse Practitioner with over 13 years of
              healthcare experience, specializing in pain management and sports medicine.
              {'\n\n'}
              At Wheatfill Precision Health, Brett delivers a precision-based, patient-centered
              approach focused on proactive optimization rather than reactive care.
              {'\n\n'}
              His mission is to help patients feel better, move better, and live at a higher
              level—now and for years to come.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

