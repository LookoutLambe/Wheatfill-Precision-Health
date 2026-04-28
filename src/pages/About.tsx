import bridgettePortrait from '../assets/bridgette.png'
import brettPortrait from '../assets/brett.png'
import { BrandSlogan } from '../components/BrandSlogan'
import Page from '../components/Page'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'

export default function About() {
  return (
    <Page>
      <div className="aboutHeader">
        <BrandSlogan />
        <h1 style={{ margin: 0 }}>About</h1>
      </div>

      <section className="card cardAccentRed aboutMissionBlock">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Mission</h2>
          <span className="pill pillRed">Elevated Living</span>
        </div>
        <p className="muted">
          Personalized, evidence-based care designed to optimize your health, performance, and
          longevity—built around sustainable habits and measurable outcomes.
        </p>
      </section>

      <div className="aboutTeamGrid" aria-label="Care team bios">
        <section className="card cardAccentNavy aboutBioCard">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Brett Wheatfill, FNP-C</h2>
            <span className="pill">Founder</span>
          </div>
          <div className="divider" />
          <div className="aboutBioRow">
            <div className="aboutBioMain">
              <p className="muted aboutBioProse" style={{ marginTop: 0, whiteSpace: 'pre-line' }}>
                Brett Wheatfill is a board-certified Family Nurse Practitioner with over 13 years of
                healthcare experience, specializing in pain management and sports medicine. Throughout
                his career, he has worked extensively with patients facing chronic conditions, helping
                them restore function, reduce pain, and achieve meaningful improvements in quality of
                life.
                {'\n\n'}
                At Wheatfill Precision Health, Brett delivers a precision-based, patient-centered
                approach focused on proactive optimization rather than reactive care. He is contracted
                with {resolvedFulfillmentPharmacyName()} for compounding catalog and fulfillment where
                applicable. His clinical focus includes metabolic health, body composition, and
                long-term wellness, utilizing evidence-based therapies such as GLP-1 medications, with
                plans to incorporate advanced peptide therapies as they become available.
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
            </div>
            <aside className="aboutProfileAside aboutProfileAside--compact">
              <div className="portrait">
                <img src={brettPortrait} alt="Brett Wheatfill, FNP-C" />
              </div>
            </aside>
          </div>
        </section>

        <section className="card cardAccentNavy aboutBioCard" id="bridgette-bio">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Bridgette Wheatfill, RN</h2>
            <span className="pill">Clinician</span>
          </div>
          <p className="aboutBioTagline" style={{ margin: '0 0 4px' }}>
            Fix the root. Transform the outcome.
          </p>
          <div className="divider" />
          <div className="aboutBioRow">
            <div className="aboutBioMain">
              <p className="muted aboutBioProse" style={{ marginTop: 0 }}>
                Bridgette is a registered nurse with over 14 years of clinical experience and a focused
                expertise in metabolic health, nutrition, and weight optimization. As a former
                competitive athlete, she has always valued performance and discipline—but her true
                clinical insight was shaped through her own experience.
              </p>
              <p className="muted aboutBioProse">
                After years of struggling with PCOS and insulin resistance, Bridgette understands
                firsthand how deeply metabolic dysfunction can impact weight, energy, hormones, and
                overall quality of life. Like many patients, she was told her symptoms were
                “normal”—despite knowing something wasn’t right. That turning point led her to take
                ownership of her health and pursue a deeper understanding of insulin resistance,
                nutrition, and hormone balance.
              </p>
              <p className="muted aboutBioProse">
                Through a targeted, evidence-based approach—combining nutrition, lifestyle strategy, and
                medical support—she was able to correct her insulin resistance, regain metabolic
                control, and achieve a level of health she had never previously experienced.
              </p>
              <p className="muted aboutBioProse">That experience now drives her work with patients.</p>
              <p className="muted aboutBioProse">
                Bridgette specializes in identifying and addressing the root causes of weight gain and
                metabolic dysfunction, with a primary focus on improving insulin sensitivity and building
                sustainable, long-term results. She recognizes that insulin resistance does not just
                affect weight—it impacts nearly every system in the body.
              </p>
              <p className="muted aboutBioProse">
                At Wheatfill Precision Health, she provides clear, individualized guidance that
                integrates medical therapy, nutrition, and practical lifestyle strategies. Her approach
                is structured, results-driven, and designed for real life.
              </p>
              <p className="muted aboutBioProse" style={{ marginBottom: 0 }}>
                Her mission is simple: help patients feel better, function better, and take back
                control of their health—with a plan that actually works.
              </p>
            </div>
            <aside className="aboutProfileAside aboutProfileAside--compact">
              <div className="portrait">
                <img src={bridgettePortrait} alt="Bridgette Wheatfill, RN" />
              </div>
            </aside>
          </div>
        </section>
      </div>
    </Page>
  )
}
