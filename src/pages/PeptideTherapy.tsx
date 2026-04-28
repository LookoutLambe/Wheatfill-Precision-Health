import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { apiPost } from '../api/client'
import Page from '../components/Page'
import { BrandSlogan } from '../components/BrandSlogan'
import { MARKETING_ONLY } from '../config/mode'
import { PRACTICE_PUBLIC_NAME, PUBLIC_INQUIRY_EMAIL } from '../config/provider'
import {
  PEPTIDE_EDUCATION,
  PEPTIDE_MARKET_AND_PROTOCOL_DISCLAIMER,
  type PeptideId,
  peptideAnchorId,
} from '../data/peptideEducation'
import { peptideVialImageSrc, peptideVialRibbonClass } from '../data/peptideVialImages'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'

function hashToPeptideId(raw: string): PeptideId | null {
  const s = raw.startsWith('#') ? raw.slice(1) : raw
  const found = PEPTIDE_EDUCATION.find((p) => peptideAnchorId(p.id) === s)
  return found ? found.id : null
}

/** Minimal **bold** segments inside education strings */
function renderBoldSegments(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    const inner = /^\*\*([^*]+)\*\*$/.exec(part)
    if (inner) return <strong key={i}>{inner[1]}</strong>
    return <span key={i}>{part}</span>
  })
}

export default function PeptideTherapy() {
  const baseId = useId()
  const location = useLocation()
  const [openId, setOpenId] = useState<PeptideId | null>(null)
  const [waitEmail, setWaitEmail] = useState('')
  const [waitName, setWaitName] = useState('')
  const [ackInfo, setAckInfo] = useState(false)
  const [ackLegal, setAckLegal] = useState(false)
  const [waitSent, setWaitSent] = useState(false)
  const [waitError, setWaitError] = useState<string | null>(null)
  const [waitBusy, setWaitBusy] = useState(false)

  const toggle = useCallback((id: PeptideId) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])

  useEffect(() => {
    const fromHash = hashToPeptideId(location.hash)
    if (fromHash) setOpenId(fromHash)
  }, [location.hash])

  const submitWaitlist = useCallback(async () => {
    setWaitError(null)
    if (!waitEmail.trim()) {
      setWaitError('Please enter an email address.')
      return
    }
    if (!ackInfo || !ackLegal) {
      setWaitError('Please confirm both statements before continuing.')
      return
    }

    const message = [
      'Peptide program interest (waitlist request)',
      '',
      `Email: ${waitEmail.trim()}`,
      `Preferred name: ${waitName.trim() || '(not provided)'}`,
      '',
      'Checkboxes: user confirmed informational-only nature and legal/availability limitations.',
    ].join('\n')

    setWaitBusy(true)
    try {
      if (!MARKETING_ONLY) {
        await apiPost('/v1/public/contact', {
          name: waitName.trim() || 'Peptide waitlist',
          email: waitEmail.trim(),
          message,
        })
        setWaitSent(true)
        setWaitEmail('')
        setWaitName('')
        setAckInfo(false)
        setAckLegal(false)
        return
      }

      if (PUBLIC_INQUIRY_EMAIL.trim()) {
        const subj = encodeURIComponent('Peptide program interest (waitlist)')
        const body = encodeURIComponent(message)
        window.location.href = `mailto:${PUBLIC_INQUIRY_EMAIL.trim()}?subject=${subj}&body=${body}`
        setWaitSent(true)
        return
      }

      setWaitError(
        'An inquiry email address is not configured for this site yet. Please use Contact so we can record your interest without using this form.',
      )
    } catch (e: unknown) {
      setWaitError(e instanceof Error ? e.message : 'Something went wrong. Please try again or use Contact.')
    } finally {
      setWaitBusy(false)
    }
  }, [waitEmail, waitName, ackInfo, ackLegal])

  return (
    <Page className="peptidePage" variant="prose">
      <header className="peptideHero">
        <BrandSlogan />
        <h1 style={{ margin: '0 0 10px' }}>Advanced Peptide Therapy</h1>
        <p className="peptideTagline">Precision-driven optimization. Elevated human performance.</p>
        <div className="peptideHeroBody">
          <p className="muted" style={{ marginTop: 0 }}>
            We follow where evidence and regulation allow. Peptide science is evolving quickly; so are federal and
            state rules for compounding and marketing. This page explains what we are watching—not what you can buy
            today.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Wheatfill Precision Health may explore curated, pharmaceutical-grade peptide protocols when law, pharmacy
            partners, and clinical standards align. Nothing here establishes a patient relationship or offers a
            specific treatment.
          </p>
        </div>
      </header>

      <nav className="peptidePageNav" aria-label="On this page" id="peptide-on-page-nav">
        <span className="peptidePageNavLabel">On this page</span>
        <Link to="/peptides/hub" className="peptidePageNavLink">
          Peptide information hub
        </Link>
        <a href="#what-peptides-heading" className="peptidePageNavLink">
          What are peptides
        </a>
        <a href="#portfolio-heading" className="peptidePageNavLink">
          Portfolio
        </a>
        <a href="#standard-heading" className="peptidePageNavLink">
          Wheatfill standard
        </a>
        <a href="#peptide-availability" className="peptidePageNavLink">
          Availability
        </a>
        <a href="#peptide-fda-disclaimer" className="peptidePageNavLink">
          FDA disclaimer
        </a>
        <a href="#peptide-waitlist" className="peptidePageNavLink">
          Waitlist
        </a>
      </nav>

      <section className="peptideSection" aria-labelledby="what-peptides-heading">
        <h2 id="what-peptides-heading" className="peptideSectionTitle">
          What are peptides?
        </h2>
        <p className="muted">
          Peptides are short chains of amino acids that can act as signaling molecules in biologic systems. Researchers
          study them to understand pathways involved in repair, metabolism, hormone regulation, and inflammation—not
          because every molecule discussed in a paper is appropriate or lawful for routine patient use.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          When clinicians consider peptides, decisions should rest on patient-specific evaluation, published evidence,
          regulatory status, and pharmacy capability—not on generalized marketing claims.
        </p>
      </section>

      <section className="peptideSection" aria-labelledby="portfolio-heading">
        <div className="peptideSectionHeader">
          <h2 id="portfolio-heading" className="peptideSectionTitle" style={{ margin: 0 }}>
            Our peptide portfolio
          </h2>
        </div>
        <p className="muted peptideSectionLead">
          Each card shows <strong>why people look up the name</strong>, a product-style illustration, and{' '}
          <strong>peer-reviewed entry points in PubMed</strong> (a specific paper where we list one, plus targeted
          search links you can filter further).           Open <strong>Read full profile</strong> for the{' '}
          <strong>Wheatfill price list</strong>, <strong>educational dosing background</strong>, the rest of
          the science, regulation, and expanded link list—we are not a shop; this is education only. For{' '}
          <Link to="/medications">GLP-1 medication education</Link> (semaglutide, tirzepatide), use our separate page. Use
          the <a href="#peptide-on-page-nav">On this page</a> menu to jump to sections.
        </p>

        <div className="cardGrid peptidePortfolioGrid" role="presentation">
          {PEPTIDE_EDUCATION.map((item, itemIndex) => {
            const isOpen = openId === item.id
            const headingId = `${baseId}-${item.id}-heading`
            const panelId = `${baseId}-${item.id}-panel`
            return (
              <article
                key={item.id}
                id={peptideAnchorId(item.id)}
                className={`card cardAccentSoft landingAccordionCard peptideAccordionCard${isOpen ? ' isOpen' : ''}`}
                style={{ scrollMarginTop: 88 }}
              >
                <div className="landingAccordionTop">
                  <div className={`peptideCardVial peptideCardVial--tone${itemIndex % 3}`}>
                    <div className="peptideCardVialFrame">
                      <img
                        src={peptideVialImageSrc(item.id)}
                        alt={`${item.vialDisplayName} (illustrative vial, education only)`}
                        className="peptideCardVialImg"
                        width={320}
                        height={400}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className={`peptideCardVialLabel ${peptideVialRibbonClass(item.id)}`}>
                      <span className="peptideCardVialBrand">Peptide (illustration)</span>
                      <span className="peptideCardVialName">{item.vialDisplayName}</span>
                      <span className="peptideCardVialHint">Not a product listing from us</span>
                    </div>
                  </div>
                  <div className="cardTitle">
                    <h3 id={headingId} style={{ margin: 0, fontSize: 'clamp(17px, 2.2vw, 20px)' }}>
                      {item.title}
                    </h3>
                    <span className="pill">{item.pill}</span>
                  </div>
                  <p className="muted landingAccordionSummary peptideCardWhy">{item.summary}</p>
                  {item.peerReviewedPicks.length > 0 ? (
                    <div className="peptideCardPeerBlock">
                      <p className="peptideCardPeerKicker">Peer-reviewed (PubMed)</p>
                      <ul className="peptideCardPeerList">
                        {item.peerReviewedPicks.map((pr) => (
                          <li key={pr.href + pr.label}>
                            <a href={pr.href} target="_blank" rel="noopener noreferrer">
                              {pr.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="landingAccordionToggle"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(item.id)}
                  >
                    <span>{isOpen ? 'Show less' : 'Read full profile'}</span>
                    <span className="landingAccordionChevron" aria-hidden="true" />
                  </button>
                </div>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headingId}
                  className="landingAccordionPanel"
                >
                  <div className="landingAccordionPanelInner">
                    <p className="peptideEduKicker muted" style={{ marginTop: 0, marginBottom: 6, fontSize: 12, fontWeight: 750 }}>
                      What it is
                    </p>
                    <p className="muted landingAccordionPara" style={{ marginTop: 0 }}>
                      {item.whatItIs}
                    </p>
                    <p className="peptideEduKicker muted" style={{ marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 750 }}>
                      What it does (short)
                    </p>
                    <p className="muted landingAccordionPara" style={{ marginTop: 0 }}>
                      {item.whatItDoes}
                    </p>
                    <p className="peptideEduKicker muted" style={{ marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: 750 }}>
                      Why use it
                    </p>
                    <p className="muted" style={{ marginTop: 0, marginBottom: 0, fontSize: 12, lineHeight: 1.45, opacity: 0.9 }}>
                      Typical goals and settings people connect to this name in discussion—not a personal prescription.
                    </p>
                    <p className="muted landingAccordionPara" style={{ marginTop: 8 }}>
                      {item.whyUseIt}
                    </p>
                    <div
                      className="peptideMarketProtocol card cardAccentSoft"
                      style={{ marginTop: 14, padding: '14px 14px', borderRadius: 10 }}
                    >
                      <p className="peptideEduKicker muted" style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 750 }}>
                        Wheatfill price list
                      </p>
                      <p className="muted landingAccordionPara" style={{ marginTop: 0, marginBottom: 10, lineHeight: 1.55 }}>
                        {renderBoldSegments(item.wheatfillPriceList)}
                      </p>
                      <p className="peptideEduKicker muted" style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 750 }}>
                        Educational dosing background
                      </p>
                      <p className="muted landingAccordionPara" style={{ marginTop: 0, marginBottom: 10, lineHeight: 1.55 }}>
                        {renderBoldSegments(item.typicalProtocolDiscussed)}
                      </p>
                      <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.45, opacity: 0.88 }}>
                        {PEPTIDE_MARKET_AND_PROTOCOL_DISCLAIMER}
                      </p>
                    </div>
                    {item.peerReviewedPicks.length > 0 ? (
                      <div style={{ marginTop: 12 }}>
                        <p className="peptideEduKicker muted" style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 750 }}>
                          Peer-reviewed (PubMed) — same links as the card
                        </p>
                        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 14 }}>
                          {item.peerReviewedPicks.map((pr) => (
                            <li key={pr.href + pr.label + 'panel'}>
                              <a href={pr.href} target="_blank" rel="noopener noreferrer">
                                {pr.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="peptideEduKicker muted" style={{ marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 750 }}>
                      Regulation and safety
                    </p>
                    <p className="muted landingAccordionPara" style={{ marginTop: 0 }}>
                      {item.regulatoryAndSafety}
                    </p>
                    <div style={{ marginTop: 14 }} className="peptideLearnMoreScience">
                      <p className="peptideEduKicker muted" style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 750 }}>
                        Learn more: science and references
                      </p>
                      <p
                        className="muted landingAccordionPara"
                        style={{ marginTop: 0, marginBottom: 10, whiteSpace: 'pre-line', lineHeight: 1.55 }}
                      >
                        {item.learnMoreScience}
                      </p>
                      {item.learnMore.length > 0 ? (
                        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 14 }}>
                          {item.learnMore.map((l) => (
                            <li key={l.href + l.label}>
                              <a href={l.href} target="_blank" rel="noopener noreferrer">
                                {l.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="peptideSection card cardAccentNavy" aria-labelledby="standard-heading">
        <h2 id="standard-heading" className="peptideSectionTitle" style={{ marginTop: 0 }}>
          The Wheatfill standard
        </h2>
        <p className="muted">If and when we offer advanced therapies, they will be guided by:</p>
        <ul className="muted peptideStandardList">
          <li>Individualized plans based on history, goals, and risk</li>
          <li>Licensed, in-scope prescribing and follow-up</li>
          <li>Pharmacy sourcing that matches current law and board guidance</li>
          <li>Ongoing monitoring for safety and objective outcomes</li>
        </ul>
        <p className="muted" style={{ marginBottom: 0 }}>
          Our broader mission remains the same: help you optimize health over time—without shortcuts that ignore
          regulation or evidence.
        </p>
      </section>

      <section className="peptideSection" id="peptide-availability" aria-labelledby="availability-heading" style={{ scrollMarginTop: 88 }}>
        <h2 id="availability-heading" className="peptideSectionTitle">
          Availability
        </h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Timelines for compounding categories have shifted repeatedly. We will not publish a firm “on sale” date
          here. When Brett’s contracted partner, {resolvedFulfillmentPharmacyName()}, and counsel confirm a lawful path for
          specific protocols, we will update this page on the website—not before.
        </p>
      </section>

      <section
        id="peptide-fda-disclaimer"
        className="peptideSection card peptideFdaDisclaimerCard"
        aria-labelledby="peptide-fda-disclaimer-heading"
        style={{ scrollMarginTop: 88 }}
      >
        <h2 id="peptide-fda-disclaimer-heading" className="peptideFdaDisclaimerTitle">
          FDA disclaimer
        </h2>
        <div className="peptideFdaDisclaimerBody">
          <p>
            <strong>FDA disclaimer:</strong> The statements made within this website have not been evaluated by the
            U.S. Food and Drug Administration. The statements and content on this site, including those describing{' '}
            {PRACTICE_PUBLIC_NAME} services, are not intended to diagnose, treat, cure, or prevent any disease.
          </p>
          <p>
            {PRACTICE_PUBLIC_NAME} is a medical and telehealth practice, not a chemical supplier. It is not a
            compounding pharmacy or a chemical compounding facility as defined under section 503A of the Federal Food, Drug, and
            Cosmetic Act, nor is it an outsourcing facility as defined under section 503B. This page is for general
            education. It does not offer research, laboratory, or analytical chemicals for sale, and is not a catalog
            of unapproved products for human use. Any future care involving prescription medications, including
            peptide-related protocols where lawful and appropriate, is provided through licensed professionals and
            compliant pharmacy channels—not as “research use only” consumer products.
          </p>
        </div>
      </section>

      <section
        id="peptide-waitlist"
        className="card cardAccentSoft peptideSection peptideWaitlist"
        aria-labelledby="waitlist-heading"
        style={{ scrollMarginTop: 88 }}
      >
        <div className="cardTitle">
          <h2 id="waitlist-heading" style={{ margin: 0 }}>
            Join the waitlist
          </h2>
          <span className="pill pillRed">Optional</span>
        </div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          If you would like a single notification when we publish vetted, compliant information about peptide options,
          leave your email below. This is not a clinical intake and does not create a patient relationship.
        </p>
        <p className="muted peptideWaitlistFineprint">
          We keep this form minimal on purpose. Do not include symptoms, diagnoses, or medication names here; when you
          are an established patient, use the contact and care channels the practice gives you (including this site
          where appropriate).
        </p>

        <label style={{ display: 'block', marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Email <span style={{ color: 'var(--red)' }}>*</span>
          </div>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={waitEmail}
            onChange={(e) => setWaitEmail(e.target.value)}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            Preferred name (optional)
          </div>
          <input className="input" value={waitName} onChange={(e) => setWaitName(e.target.value)} autoComplete="name" />
        </label>

        <label className="peptideCheckboxRow">
          <input type="checkbox" checked={ackInfo} onChange={(e) => setAckInfo(e.target.checked)} />
          <span className="muted">
            I understand this page is general information only, not medical advice, and does not start care with
            Wheatfill Precision Health.
          </span>
        </label>

        <label className="peptideCheckboxRow">
          <input type="checkbox" checked={ackLegal} onChange={(e) => setAckLegal(e.target.checked)} />
          <span className="muted">
            I understand that any future services depend on clinical appropriateness, pharmacy and legal availability,
            and formal consent—not on waitlist placement.
          </span>
        </label>

        {waitSent ? (
          <p style={{ marginTop: 14, color: '#14532d', fontWeight: 750, marginBottom: 0 }}>
            {MARKETING_ONLY && PUBLIC_INQUIRY_EMAIL.trim()
              ? 'If your email program opened, send the prefilled message to complete your request.'
              : 'Thank you. If you do not hear back within a few business days, please use Contact.'}
          </p>
        ) : null}
        {waitError ? (
          <p style={{ marginTop: 10, color: '#7f1d1d', fontWeight: 700, marginBottom: 0 }}>
            {waitError}{' '}
            <Link to="/contact">Contact</Link>
          </p>
        ) : null}

        <div className="btnRow" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={waitBusy || !waitEmail.trim() || !ackInfo || !ackLegal}
            style={{ opacity: waitBusy || !waitEmail.trim() || !ackInfo || !ackLegal ? 0.65 : 1 }}
            onClick={() => void submitWaitlist()}
          >
            {waitBusy ? 'Sending…' : 'Submit interest'}
          </button>
          <Link to="/contact" className="btn" style={{ textDecoration: 'none' }}>
            Contact instead
          </Link>
        </div>
      </section>
    </Page>
  )
}
