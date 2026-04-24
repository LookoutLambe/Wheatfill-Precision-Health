import { useCallback, useId, useState } from 'react'
import { Link } from 'react-router-dom'

import { apiPost } from '../api/client'
import { MARKETING_ONLY } from '../config/mode'
import { PUBLIC_INQUIRY_EMAIL } from '../config/provider'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'

type PeptideId =
  | 'bpc157'
  | 'tb500'
  | 'ghkcu'
  | 'cjcipa'
  | 'semax'
  | 'motsc'
  | 'aod'
  | 'ta1'
  | 'kpv'

type PeptideItem = {
  id: PeptideId
  title: string
  pill: string
  summary: string
  body: string
}

const PEPTIDES: PeptideItem[] = [
  {
    id: 'bpc157',
    title: 'BPC-157',
    pill: 'Research',
    summary:
      'Discussed in preclinical and early research contexts related to tissue repair pathways and gastrointestinal models.',
    body:
      'Scientific literature has explored BPC-157 in experimental settings involving connective tissue and gut-barrier models. It is not FDA-approved in the United States for human drug indications. Federal compounding lists and enforcement priorities for peptides have changed over time; whether any formulation could be available in the future depends on law, pharmacy policy, and an individualized clinical evaluation—not on marketing claims.',
  },
  {
    id: 'tb500',
    title: 'TB-500 (Thymosin Beta-4)',
    pill: 'Research',
    summary:
      'Studied in research settings for cellular processes involved in tissue remodeling; not a consumer product claim.',
    body:
      'Thymosin beta-4 has been investigated in research literature for mechanisms related to cell movement and repair models. It is not FDA-approved as a drug for specific patient conditions in the US. Some peptides in this family have appeared on federal compounding restriction lists. Any future discussion of clinical use would require appropriate licensure, pharmacy alignment, and evidence-based decision-making.',
  },
  {
    id: 'ghkcu',
    title: 'GHK-Cu (Copper Peptide)',
    pill: 'Research',
    summary:
      'Cosmetic and laboratory research contexts; not FDA-approved as a systemic therapy for the uses sometimes described online.',
    body:
      'GHK-Cu is widely referenced in dermatology-adjacent research and cosmetic science. Statements about wound, skin, or hair outcomes can be interpreted as drug claims when tied to non-approved substances. This page does not assert therapeutic benefits. Patients should rely on FDA-approved treatments for medical conditions and discuss any research compound only with a qualified clinician.',
  },
  {
    id: 'cjcipa',
    title: 'CJC-1295 / Ipamorelin',
    pill: 'Research',
    summary:
      'Growth-hormone secretagogue combinations have received heightened regulatory scrutiny in compounded drug enforcement.',
    body:
      'These agents have been studied for their pharmacologic class effects on growth hormone axis signaling. They are not described here as treatments. Federal authorities have taken public enforcement positions related to compounded growth-hormone-related peptides. Availability, if any, would depend on current rules, compounding pharmacy policy, and whether a prescriber determines a legitimate medical purpose consistent with state scope and malpractice coverage.',
  },
  {
    id: 'semax',
    title: 'Semax & Selank',
    pill: 'Research',
    summary:
      'Neuropeptide families studied abroad; not FDA-approved drug products in the United States.',
    body:
      'Some countries have approved or studied certain neuropeptide formulations under their own regulatory frameworks. That does not create a US approval pathway. Research publications discuss a range of behavioral and physiologic endpoints; this site summarizes only at a high level and does not promise cognitive, mood, or performance outcomes.',
  },
  {
    id: 'motsc',
    title: 'MOTS-c',
    pill: 'Research',
    summary:
      'Mitochondrial-derived peptide studied in metabolic research models; regulatory status for human compounding is constrained.',
    body:
      'MOTS-c appears in scientific discussion of mitochondrial signaling and aging-related biology. It is not FDA-approved here as a drug for patients. Like other peptides on federal restriction lists, it may not be lawfully compounded for general use in many circumstances. Any future clinical pathway would need to align with current FDA and state guidance.',
  },
  {
    id: 'aod',
    title: 'AOD-9604',
    pill: 'Research',
    summary:
      'Has appeared in weight-related research discourse; not FDA-approved as a drug for fat loss in the US.',
    body:
      'AOD-9604 has been discussed in research contexts related to lipolysis pathways. Specific weight-loss claims for non-approved substances raise compliance risk. Wheatfill Precision Health does not use this page to advertise outcomes; we note only that literature exists and that prescribing must follow law, evidence, and pharmacy capability.',
  },
  {
    id: 'ta1',
    title: 'Thymosin Alpha-1',
    pill: 'Research',
    summary:
      'Approved in some non-US jurisdictions for certain uses; not FDA-approved here; compounding rules apply.',
    body:
      'Thymosin alpha-1 has international regulatory histories that do not automatically translate to US patient access. Immune-related language is especially sensitive from an FDA/FTC perspective. We avoid structure/function claims tied to this compound and point patients toward licensed clinicians for questions about approved immunizations and therapies.',
  },
  {
    id: 'kpv',
    title: 'KPV',
    pill: 'Research',
    summary:
      'Short peptide discussed in inflammation and gut research literature; human use claims are not made here.',
    body:
      'KPV is described in peer-reviewed work involving inflammatory signaling models. This is not medical advice and not an offer of therapy. Compounding eligibility and board scope must be confirmed before any clinical program is advertised or delivered.',
  },
]

export default function PeptideTherapy() {
  const baseId = useId()
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
    <div className="page peptidePage">
      <header className="peptideHero">
        <p className="peptideEyebrow">Wheatfill Precision Health</p>
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

      <section className="card cardAccentRed peptideDisclaimer" aria-labelledby="peptide-disclaimer-heading">
        <div className="cardTitle">
          <h2 id="peptide-disclaimer-heading" style={{ margin: 0 }}>
            Important: regulation and marketing
          </h2>
          <span className="pill pillRed">Read first</span>
        </div>
        <div className="divider" />
        <ul className="muted peptideDisclaimerList">
          <li>
            Many peptides discussed in popular health media are <strong>not FDA-approved</strong> as drugs for the
            uses implied online. Some have been placed on federal compounding restriction lists; enforcement priorities
            can change.
          </li>
          <li>
            Before any program goes live, a practice should confirm <strong>malpractice coverage</strong>,{' '}
            <strong>state nursing and pharmacy board</strong> alignment, what a <strong>503A partner can lawfully</strong>{' '}
            prepare and ship, and written guidance from <strong>healthcare counsel</strong> on compliant language.
          </li>
          <li>
            This page uses cautious, educational phrasing. It is <strong>not medical advice</strong> and not a promise
            of future availability, pricing, or outcomes.
          </li>
        </ul>
      </section>

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
          <span className="pill">Coming soon</span>
        </div>
        <p className="muted peptideSectionLead">
          Below is a reference list of compounds sometimes discussed in precision medicine contexts. Tap a row to read
          a short, conservative summary.{' '}
          <strong>We are not offering these products on this page.</strong> Availability would depend on future law,
          pharmacy policy, and clinical appropriateness.
        </p>

        <div className="cardGrid peptidePortfolioGrid" role="presentation">
          {PEPTIDES.map((item) => {
            const isOpen = openId === item.id
            const headingId = `${baseId}-${item.id}-heading`
            const panelId = `${baseId}-${item.id}-panel`
            return (
              <article
                key={item.id}
                className={`card cardAccentSoft landingAccordionCard peptideAccordionCard${isOpen ? ' isOpen' : ''}`}
              >
                <div className="landingAccordionTop">
                  <div className="cardTitle">
                    <h3 id={headingId} style={{ margin: 0, fontSize: 'clamp(17px, 2.2vw, 20px)' }}>
                      {item.title}
                    </h3>
                    <span className="pill">{item.pill}</span>
                  </div>
                  <p className="muted landingAccordionSummary">{item.summary}</p>
                  <button
                    type="button"
                    className="landingAccordionToggle"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(item.id)}
                  >
                    <span>{isOpen ? 'Show less' : 'Read summary'}</span>
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
                    <p className="muted landingAccordionPara" style={{ marginTop: 0 }}>
                      {item.body}
                    </p>
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

      <section className="peptideSection" aria-labelledby="availability-heading">
        <h2 id="availability-heading" className="peptideSectionTitle">
          Availability
        </h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Timelines for compounding categories have shifted repeatedly. We will not publish a firm “on sale” date
          here. When Brett’s contracted partner, {resolvedFulfillmentPharmacyName()}, and counsel confirm a lawful path for
          specific protocols, we will update this page on the website—not before.
        </p>
      </section>

      <section className="card cardAccentSoft peptideSection peptideWaitlist" aria-labelledby="waitlist-heading">
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
    </div>
  )
}
