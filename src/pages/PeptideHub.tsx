import { Link } from 'react-router-dom'

import { PEPTIDE_HUB_CATEGORIES } from '../data/peptideHubResources'

export default function PeptideHub() {
  return (
    <div className="page peptidePage peptideHubPage">
      <header className="peptideHero">
        <p className="peptideEyebrow">Wheatfill Precision Health</p>
        <h1 style={{ margin: '0 0 10px' }}>Peptide information hub</h1>
        <p className="peptideTagline">
          A short index of <strong>independent, mostly primary or official sources</strong> on lab handling, quality testing,
          and analytical work around peptides.
        </p>
        <div className="peptideHeroBody">
          <p className="muted" style={{ marginTop: 0 }}>
            This is not a vendor blog or a catalog. For names and plain-language context on our portfolio, use{' '}
            <Link to="/peptides">Advanced peptide therapy (education)</Link>; for GLP-1 medications, use{' '}
            <Link to="/medications">Medication education</Link>.
          </p>
        </div>
      </header>

      <nav className="peptidePageNav" aria-label="On this page" id="peptide-hub-nav">
        <span className="peptidePageNavLabel">On this page</span>
        {PEPTIDE_HUB_CATEGORIES.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="peptidePageNavLink">
            {c.heading}
          </a>
        ))}
      </nav>

      <section className="card cardAccentSoft peptideHubDisclosure" aria-labelledby="hub-disclosure-h">
        <h2 id="hub-disclosure-h" className="peptideSectionTitle" style={{ margin: 0, fontSize: '1.1rem' }}>
          Third-party links
        </h2>
        <p className="muted" style={{ margin: '10px 0 0', lineHeight: 1.55, marginBottom: 0 }}>
          We do not control, endorse, or vet every result on the linked pages. Some links are <strong>PubMed search URLs</strong>{' '}
          that return many papers—filter by species, study type, and date. This page is for general learning; it is{' '}
          <strong>not medical advice</strong> and not a shopping guide.
        </p>
      </section>

      {PEPTIDE_HUB_CATEGORIES.map((cat) => (
        <section key={cat.id} id={cat.id} className="peptideSection peptideHubCategory" style={{ scrollMarginTop: 88 }}>
          <h2 className="peptideSectionTitle" style={{ margin: 0 }}>
            {cat.heading}
          </h2>
          <p className="muted" style={{ margin: '6px 0 14px' }}>
            {cat.lead}
          </p>
          <ul className="peptideHubItemList" role="list">
            {cat.items.map((item) => (
              <li key={item.href + item.title} className="peptideHubItem card cardAccentSoft">
                <h3 className="peptideHubItemTitle" style={{ margin: 0, fontSize: 'clamp(16px, 2.1vw, 19px)' }}>
                  {item.title}
                </h3>
                <p className="muted peptideHubItemBlurb" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                  {item.blurb}
                </p>
                <p className="peptideHubItemSource" style={{ margin: '10px 0 0', fontSize: 14 }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="peptideHubItemLink">
                    {item.source}
                    <span className="srOnly"> (opens in new tab)</span>
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="muted" style={{ margin: '0 0 8px' }}>
        <Link to="/peptides" className="peptidePageNavLink" style={{ textDecoration: 'none', borderBottom: 0 }}>
          ← Back to advanced peptide therapy (education)
        </Link>
      </p>
    </div>
  )
}
