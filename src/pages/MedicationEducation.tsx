import { Link } from 'react-router-dom'

function ext(url: string) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {url}
    </a>
  )
}

export default function MedicationEducation() {
  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div className="pageHeaderRow">
        <div>
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
        </div>
      </div>

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

      <section className="card cardAccentSoft" style={{ marginTop: 12 }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>How they function (high level)</h2>
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
        <div className="divider" />
        <div className="btnRow">
          <Link to="/ordering" className="btn" style={{ textDecoration: 'none' }}>
            Submit an Order Request
          </Link>
          <Link to="/contact" className="btn" style={{ textDecoration: 'none' }}>
            Ask a question
          </Link>
        </div>
      </section>
    </div>
  )
}

