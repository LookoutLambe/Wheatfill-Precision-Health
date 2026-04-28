import { Link } from 'react-router-dom'
import Page from '../components/Page'
import { SiteLogoPageBadge } from '../components/SiteLogo'

import { PEPTIDE_EDUCATION, peptideAnchorId } from '../data/peptideEducation'

function ext(url: string) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {url}
    </a>
  )
}

export default function MedicationEducation() {
  return (
    <Page variant="wide">
      <div className="pageHeaderRow">
        <div>
          <SiteLogoPageBadge />
          <h1 style={{ margin: 0 }}>Medication Education</h1>
          <p className="muted pageSubtitle" style={{ marginTop: 8 }}>
            General education (not medical advice). Your clinician will review your history and decide what is appropriate for you.
          </p>
        </div>
        <div className="btnRow">
          <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Book Online
          </Link>
          <Link to="/ordering" className="btn" style={{ textDecoration: 'none' }}>
            Order Requests
          </Link>
          <a className="btn catalogOutlineBtn" href="#dosing-guide" style={{ textDecoration: 'none' }}>
            Dosing guide
          </a>
          <Link to="/peptides" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
            Peptide education
          </Link>
        </div>
      </div>

      <section id="dosing-guide" className="card cardAccentNavy" style={{ scrollMarginTop: 88 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Dosing overview (education)</h2>
          <span className="pill pillRed">Titration</span>
        </div>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.55 }}>
          <strong>Not a prescription.</strong> Doses, concentrations (mg/mL), and escalation schedules are chosen by your clinician
          for your product, goals, and tolerance. Compounded preparations are not the same as brand-name FDA labeling below.
        </p>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0, marginBottom: 10, lineHeight: 1.55, fontSize: 14 }}>
          The tables are simplified summaries of <strong>typical FDA-labeled titration for weekly subcutaneous brand products</strong>{' '}
          (examples: Wegovy<sup>®</sup> for semaglutide; Zepbound<sup>®</sup> for tirzepatide). Always follow the label and instructions
          on <em>your</em> medication and what your clinician tells you.
        </p>
        <div className="cardGrid" style={{ alignItems: 'start' }}>
          <div className="card cardAccentSoft" style={{ margin: 0 }}>
            <div className="cardTitle">
              <h3 style={{ margin: 0 }}>Semaglutide (example: Wegovy)</h3>
              <span className="pill">Weekly</span>
            </div>
            <p className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
              Labeled escalation often increases about every <strong>4 weeks</strong> if tolerated, through steps such as{' '}
              <strong>0.25 → 0.5 → 1.0 → 1.7 → 2.4 mg</strong> once weekly. Some people remain on an intermediate dose if that is the
              right balance of benefit and side effects.
            </p>
            <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
              Official prescribing information:{' '}
              <a href="https://dailymed.nlm.nih.gov/dailymed/search.cfm?labelname=wegovy" target="_blank" rel="noopener noreferrer">
                DailyMed (search Wegovy)
              </a>
              {' · '}
              {ext('https://medlineplus.gov/druginfo/meds/a619057.html')}
            </p>
          </div>
          <div className="card cardAccentSoft" style={{ margin: 0 }}>
            <div className="cardTitle">
              <h3 style={{ margin: 0 }}>Tirzepatide (example: Zepbound)</h3>
              <span className="pill">Weekly</span>
            </div>
            <p className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
              Labeled escalation often increases about every <strong>4 weeks</strong> if tolerated, through steps such as{' '}
              <strong>2.5 → 5 → 7.5 → 10 → 12.5 → 15 mg</strong> once weekly (maximum depends on indication and product labeling).
            </p>
            <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
              Official prescribing information:{' '}
              <a href="https://dailymed.nlm.nih.gov/dailymed/search.cfm?labelname=zepbound" target="_blank" rel="noopener noreferrer">
                DailyMed (search Zepbound)
              </a>
              {' · '}
              {ext('https://medlineplus.gov/druginfo/meds/a622044.html')}
            </p>
          </div>
        </div>
        <div className="divider" />
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 14 }}>
          <li>
            <strong>Why titration matters</strong> — slower increases can reduce nausea, fullness, and other GI side effects while your
            body adjusts.
          </li>
          <li>
            <strong>If you miss a dose</strong> — follow the product label or ask your clinician; do not double up unless you were told to.
          </li>
          <li>
            <strong>When to call urgently</strong> — severe or persistent abdominal pain, repeated vomiting, signs of allergic reaction,
            or other symptoms your clinician warned you about.
          </li>
        </ul>
      </section>

      <section className="card cardAccentSoft">
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Semaglutide vs tirzepatide</h2>
          <span className="pill pillRed">GLP-1</span>
        </div>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.55 }}>
          These medications can support weight loss and metabolic improvement when clinically appropriate, but they are not “magic.”
          They work best alongside nutrition, movement, sleep, and follow-up.
        </p>
        <div className="divider" />

        <div className="cardGrid" style={{ alignItems: 'start' }}>
          <section className="card cardAccentNavy" style={{ margin: 0 }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Semaglutide</h2>
              <span className="pill">MedlinePlus</span>
            </div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.55 }}>
              A GLP-1 receptor agonist. It helps with appetite regulation, slows stomach emptying, and improves glucose regulation.
            </p>
            <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
              Learn more: {ext('https://medlineplus.gov/druginfo/meds/a619057.html')}
            </p>
          </section>

          <section className="card cardAccentNavy" style={{ margin: 0 }}>
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Tirzepatide</h2>
              <span className="pill">MedlinePlus</span>
            </div>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.55 }}>
              A dual incretin medicine (GIP + GLP-1 activity). It can reduce appetite and improve glucose regulation in a slightly different way.
            </p>
            <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
              Learn more: {ext('https://medlineplus.gov/druginfo/meds/a622044.html')}
            </p>
          </section>
        </div>
      </section>

      <section
        id="research-peptides"
        className="card cardAccentNavy"
        style={{ marginTop: 12, scrollMarginTop: 88 }}
      >
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Research peptides (separate from GLP‑1 drugs)</h2>
          <span className="pill">Education</span>
        </div>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.55 }}>
          The <strong>semaglutide and tirzepatide</strong> content above applies to FDA-labeled product families used for
          weight and metabolic care when your clinician says they are appropriate. The compounds below are
          <strong> not the same class</strong>: they are small signaling molecules that often show up in precision- or
          compounding-related discussions, many <strong>without the same U.S. approval and labeling</strong> story as
          Wegovy<sup>®</sup> or Zepbound<sup>®</sup>. Each card gives a <strong>why use it</strong> (typical goals in
          discussion) and points you to the peptide page—where we list the <strong>Wheatfill price list</strong> per
          peptide and <strong>educational dosing background</strong>, plus where the <strong>deeper science</strong>{' '}
          lives under &quot;Learn more: science and references.&quot; Not personal medical advice. Each link opens the full
          write-up.
        </p>
        <div className="divider" />
        <div className="cardGrid" style={{ alignItems: 'start' }}>
          {PEPTIDE_EDUCATION.map((p) => (
            <div key={p.id} className="card cardAccentSoft" style={{ margin: 0 }}>
              <div className="cardTitle">
                <h3 style={{ margin: 0, fontSize: 'clamp(16px, 1.8vw, 18px)' }}>{p.title}</h3>
                <span className="pill">{p.pill}</span>
              </div>
              <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13, lineHeight: 1.5 }}>
                {p.oneLiner}
              </p>
              <p
                className="muted medicationPeptideBlurb"
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                  fontSize: 12,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }}
              >
                <strong>Why use it (typical goals in discussion):</strong> {p.whyUseIt}
              </p>
              <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
                <Link
                  to={`/peptides#${peptideAnchorId(p.id)}`}
                  style={{ fontWeight: 650 }}
                >
                  Open full profile on Peptide Therapy
                </Link>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card cardAccentSoft" style={{ marginTop: 12 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>How GLP-1 / dual incretin medications work (high level)</h2>
          <span className="pill">Mechanism</span>
        </div>
        <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
          <li>
            <strong>Appetite + cravings</strong> — many people feel fuller sooner and have fewer “food noise” cravings.
          </li>
          <li>
            <strong>Stomach emptying</strong> — can slow digestion (often helpful, but can also contribute to nausea/constipation).
          </li>
          <li>
            <strong>Glucose regulation</strong> — improves insulin sensitivity and post-meal glucose response in many patients.
          </li>
          <li>
            <strong>Consistency matters</strong> — benefits and side effects often depend on dose, titration speed, and adherence.
          </li>
        </ul>
      </section>

      <section className="card cardAccentRed" style={{ marginTop: 12 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>Key risks to know</h2>
          <span className="pill pillRed">Safety</span>
        </div>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
          This is not a complete list. Seek urgent care for severe symptoms. Your clinician will review contraindications and
          monitoring needs.
        </p>
        <div className="divider" />
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>
            <strong>GI effects</strong> — nausea, vomiting, diarrhea, constipation, reflux. Dehydration can happen if symptoms are severe.
          </li>
          <li>
            <strong>Pancreatitis warning signs</strong> — severe, persistent abdominal pain (with or without vomiting) needs urgent evaluation.
          </li>
          <li>
            <strong>Gallbladder issues</strong> — gallstones and gallbladder inflammation risk may increase with rapid weight loss.
          </li>
          <li>
            <strong>Low blood sugar</strong> — risk increases when combined with certain diabetes meds (your clinician will review).
          </li>
          <li>
            <strong>Thyroid tumor warning (boxed warning)</strong> — avoid if you have personal/family history of medullary thyroid cancer or MEN2.
          </li>
        </ul>
      </section>

      <section className="card cardAccentSoft" style={{ marginTop: 12 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>What to expect</h2>
          <span className="pill">Practical</span>
        </div>
        <ul className="muted" style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
          <li>
            <strong>Start low, go slow</strong> — titration helps reduce side effects.
          </li>
          <li>
            <strong>Protein + hydration</strong> — often helps energy and GI tolerance.
          </li>
          <li>
            <strong>Follow-up</strong> — dose adjustments, symptom checks, and expectations should be reviewed over time.
          </li>
        </ul>
      </section>
    </Page>
  )
}

