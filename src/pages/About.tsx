import brettPortrait from '../assets/brett.png'

export default function About() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0 }}>About</h1>
        <p className="muted" style={{ marginTop: 8, fontSize: 18 }}>
          Precision-based, patient-centered telehealth for metabolic optimization and long-term
          wellness.
        </p>
      </div>

      <div className="twoCol">
        <section className="card">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Brett Wheatfill, FNP-C</h2>
            <span className="pill">Founder</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ whiteSpace: 'pre-line', fontSize: 16 }}>
            Brett Wheatfill is a board-certified Family Nurse Practitioner with over 13 years of
            healthcare experience, specializing in pain management and sports medicine. Throughout
            his career, he has worked extensively with patients facing chronic conditions, helping
            them restore function, reduce pain, and achieve meaningful improvements in quality of
            life.
            {'\n\n'}
            At Wheatfill Precision Health, Brett delivers a precision-based, patient-centered
            approach focused on proactive optimization rather than reactive care. His clinical focus
            includes metabolic health, body composition, and long-term wellness, utilizing
            evidence-based therapies such as GLP-1 medications, with plans to incorporate advanced
            peptide therapies as they become available.
            {'\n\n'}
            His philosophy is rooted in individualized care—taking the time to understand each
            patient’s goals, physiology, and lifestyle, and developing tailored strategies designed
            to produce measurable, sustainable results.
            {'\n\n'}
            Brett founded Wheatfill Precision Health to provide a higher standard of care for
            individuals seeking a more refined, personalized healthcare experience. His mission is
            to help patients feel better, move better, and live at a higher level—now and for years
            to come.
          </p>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="portrait">
            <img src={brettPortrait} alt="Provider portrait" />
          </div>

          <div className="card">
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Mission</h2>
              <span className="pill pillRed">Elevated living</span>
            </div>
            <p className="muted">
              Personalized, evidence-based care designed to optimize your health, performance, and
              longevity—built around sustainable habits and measurable outcomes.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

