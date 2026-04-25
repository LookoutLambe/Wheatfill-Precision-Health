import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import bridgettePortrait from '../assets/bridgette.png'
import brettPortrait from '../assets/brett.png'
import VenmoPayToHint from '../components/VenmoPayToHint'
import { BookVisitCta, PatientPortalCta } from '../components/CharmMarketingCtas'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'
import {
  DEFAULT_CATALOG_PARTNER_SLUG,
  minCatalogPriceCentsForFamily,
} from '../data/catalogHighlight'

function formatCatalogPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

const SEMAGLUTIDE_STARTING_CENTS = minCatalogPriceCentsForFamily('semaglutide')
const TIRZEPATIDE_STARTING_CENTS = minCatalogPriceCentsForFamily('tirzepatide')

type AccordionId = 'telehealth' | 'metabolic' | 'medication' | 'longevity'

type AccordionItem = {
  id: AccordionId
  title: string
  pill: string
  pillRed?: boolean
  accent: 'soft' | 'red' | 'navy'
  summary: string
  body: ReactNode
}

const ACCENT_CLASS: Record<AccordionItem['accent'], string> = {
  soft: 'cardAccentSoft',
  red: 'cardAccentRed',
  navy: 'cardAccentNavy',
}

const ACCORDION_ITEMS: AccordionItem[] = [
  {
    id: 'telehealth',
    title: 'Telehealth Convenience',
    pill: 'Remote',
    accent: 'soft',
    summary:
      'Connect with care from anywhere. No travel, no waiting rooms—just focused, private, high-touch support.',
    body: (
      <>
        <h3 className="landingAccordionSubhead">What A Visit Looks Like</h3>
        <p className="muted landingAccordionPara">
          Visits are scheduled like a traditional appointment, but you join from a private space you
          choose. We review history, goals, medications, and next steps with the same attention you would
          expect in clinic—without the commute.
        </p>
        <h3 className="landingAccordionSubhead">Technology Requirements</h3>
        <p className="muted landingAccordionPara">
          A reliable internet connection, a device with camera and microphone, and a quiet room are
          enough for most visits. If you are unsure whether telehealth is right for your situation, we
          will help you decide before you book.
        </p>
        <h3 className="landingAccordionSubhead">Privacy And Security</h3>
        <p className="muted landingAccordionPara">
          We use HIPAA-appropriate workflows and secure platforms for visits and messaging. You should
          not use telehealth for emergencies—call 911 when life or limb is at risk.
        </p>
        <h3 className="landingAccordionSubhead">How To Book</h3>
        <p className="muted landingAccordionPara">
          Use <Link to="/book">Book Online</Link> in the site menu. Booking and follow-up details are handled through
          this website and the practice; any separate clinical or billing sign-in is only when the team gives you
          that link. New patients usually start with a comprehensive visit; established patients follow the cadence
          in their plan.
        </p>
      </>
    ),
  },
  {
    id: 'metabolic',
    title: 'Metabolic Optimization',
    pill: 'Evidence-based',
    pillRed: true,
    accent: 'red',
    summary:
      'Programs built around your physiology, goals, and lifestyle—designed for measurable, sustainable results.',
    body: (
      <>
        <h3 className="landingAccordionSubhead">What The Program Includes</h3>
        <p className="muted landingAccordionPara">
          Care is individualized: nutrition and movement guidance, medication options when appropriate,
          labs where indicated, and follow-up cadence matched to your risk level and preferences—not a
          one-size template.
        </p>
        <h3 className="landingAccordionSubhead">Assessment Process</h3>
        <p className="muted landingAccordionPara">
          We begin with a structured history, body-composition and symptom patterns, relevant labs, and
          a shared definition of success. That foundation drives the plan instead of chasing trends.
        </p>
        <h3 className="landingAccordionSubhead">Timeline Expectations</h3>
        <p className="muted landingAccordionPara">
          Meaningful change is staged: early weeks focus on adherence and safety; later intervals refine
          dosing, lifestyle levers, and maintenance. We set realistic checkpoints so you know what “progress”
          means for you.
        </p>
        <h3 className="landingAccordionSubhead">Not A Fad Approach</h3>
        <p className="muted landingAccordionPara">
          We emphasize physiology-first decisions, informed consent, and continuity of care. Quick fixes
          that skip assessment are not our model—we prioritize sustainability and primary-care alignment.
        </p>
      </>
    ),
  },
  {
    id: 'medication',
    title: 'Medication Options',
    pill: 'GLP-1',
    accent: 'navy',
    summary:
      'Evidence-based therapies such as GLP-1 medications, with plans to incorporate advanced peptide therapies as they become available.',
    body: (
      <>
        <h3 className="landingAccordionSubhead">Therapies Currently Offered</h3>
        <p className="muted landingAccordionPara">
          Our practice supports medically appropriate GLP-1 therapies and related optimization strategies
          when indicated. Availability can depend on state rules, formulary, and your individual risk
          profile—we discuss options transparently before prescribing.
        </p>
        <h3 className="landingAccordionSubhead">Evaluation And Prescribing</h3>
        <p className="muted landingAccordionPara">
          Prescriptions follow a clinical evaluation, informed consent, contraindication review, and a
          documented plan for monitoring. We do not prescribe controlled substances outside appropriate
          scope or standard of care.
        </p>
        <h3 className="landingAccordionSubhead">Safety And Monitoring</h3>
        <p className="muted landingAccordionPara">
          Follow-up visits, symptom reporting, and labs (when appropriate) help us titrate therapy safely.
          You will know what side effects should trigger an urgent call versus a routine message.
        </p>
        <h3 className="landingAccordionSubhead">Cost Structure</h3>
        <p className="muted landingAccordionPara">
          Consultation fees and medication costs are discussed up front where possible. Medication pricing
          can vary by dose and supplier—see our <Link to="/pricing">Pricing</Link> page and the{' '}
          <Link to="/order-now">Order Now Catalog</Link> for representative vial pricing when applicable.
          Orders are placed through our practice so we can help with pricing and order issues directly.
        </p>
      </>
    ),
  },
  {
    id: 'longevity',
    title: 'Performance + Longevity',
    pill: 'Long-term',
    pillRed: true,
    accent: 'soft',
    summary:
      'Strength, vitality, and resilience—so you can fully engage in life now and for years to come.',
    body: (
      <>
        <h3 className="landingAccordionSubhead">Philosophy Of Proactive Care</h3>
        <p className="muted landingAccordionPara">
          We focus on early signals—sleep, recovery, metabolic markers, and functional strength—so small
          issues are addressed before they become crises. The goal is durable performance, not short-term
          extremes.
        </p>
        <h3 className="landingAccordionSubhead">Types Of Interventions</h3>
        <p className="muted landingAccordionPara">
          Plans may combine lifestyle architecture, targeted labs, evidence-based medications, and
          coaching-style accountability. Interventions are chosen for fit, not novelty.
        </p>
        <h3 className="landingAccordionSubhead">Who Benefits Most</h3>
        <p className="muted landingAccordionPara">
          Adults seeking structured optimization—busy professionals, athletes returning from injury,
          peri-menopausal symptom shifts, or anyone tired of “trial and error” without a map—often do well
          with this model.
        </p>
        <h3 className="landingAccordionSubhead">Complements Other Care</h3>
        <p className="muted landingAccordionPara">
          We coordinate with your existing specialists and primary team when you authorize it. Precision
          health works best as a layer on top of—not a replacement for—relationship-based primary care.
        </p>
      </>
    ),
  },
]

export default function Landing() {
  const catalogPartnerPath = `/order-now/${DEFAULT_CATALOG_PARTNER_SLUG}`
  const [openId, setOpenId] = useState<AccordionId | null>(null)
  const baseId = useId()

  const toggle = useCallback((id: AccordionId) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="page pageLanding">
      <div className="twoCol twoColLanding">
        <section className="landingGridHeroCatalog" aria-label="Welcome">
          <div className="landingHeroIntro">
            <span className="pill">Precision health. Elevated living.</span>
            <h1 className="heroHeadline">
              Personalized, evidence-based care designed to optimize your health, performance, and
              longevity.
            </h1>
            <p className="muted pageSubtitle" style={{ marginTop: 0 }}>
              Specializing in metabolic optimization, weight management, and advanced wellness
              therapies.
            </p>

            <div className="divider" />

            <div className="btnRow">
              <BookVisitCta className="btn btnPrimary" style={{ textDecoration: 'none' }} mode="primary" />
              <PatientPortalCta className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }} />
            </div>
          </div>

          <div className="divider" />

          <section className="landingCatalogSection" aria-labelledby="landing-catalog-heading">
            <div className="cardTitle">
              <h2 id="landing-catalog-heading" style={{ margin: 0 }}>
                Order Now Catalog
              </h2>
              <span className="pill pillRed">GLP-1</span>
            </div>
            <p className="muted" style={{ marginTop: 6, marginBottom: 14 }}>
              Representative vial SKUs and list prices. You order through {PRACTICE_PUBLIC_NAME}—we
              coordinate preferred pricing and fulfillment with {resolvedFulfillmentPharmacyName()} when
              medication is prescribed. Payment for now is via <b>Venmo</b> or <b>PayPal</b> (see details below) after
              the practice confirms your order (amount and pay-to from your care team). If something goes
              wrong with your order, your care team handles it from our side.
            </p>
            <VenmoPayToHint style={{ marginTop: 8, marginBottom: 14 }} />
            <div className="landingCatalogStartingRows">
              <div className="landingCatalogStartingAt">
                <span className="landingCatalogStartingLabel landingCatalogStartingLineLabel">
                  Semaglutide starting at
                </span>
                <span className="landingCatalogStartingAmt">
                  {formatCatalogPrice(SEMAGLUTIDE_STARTING_CENTS)}
                </span>
              </div>
              <div className="landingCatalogStartingAt">
                <span className="landingCatalogStartingLabel landingCatalogStartingLineLabel">
                  Tirzepatide starting at
                </span>
                <span className="landingCatalogStartingAmt">
                  {formatCatalogPrice(TIRZEPATIDE_STARTING_CENTS)}
                </span>
              </div>
            </div>
            <div className="btnRow">
              <Link to={catalogPartnerPath} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
                View Full Catalog
              </Link>
              <Link to="/order-now" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
                All Catalogs
              </Link>
            </div>
          </section>
        </section>

        <aside className="landingGridProfileColumn" aria-label="About the care team">
          <div className="portrait">
            <img src={brettPortrait} alt="Brett Wheatfill, FNP-C" />
          </div>
          <div className="card cardAccentNavy landingBioCard">
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

          <div className="portrait" style={{ marginTop: 8 }}>
            <img src={bridgettePortrait} alt="Bridgette Wheatfill, RN" />
          </div>
          <div className="card cardAccentNavy landingBioCard">
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Bridgette Wheatfill, RN</h2>
              <span className="pill">Clinician</span>
            </div>
            <p className="aboutBioTagline" style={{ margin: '0 0 8px' }}>
              Fix the root. Transform the outcome.
            </p>
            <p className="muted" style={{ whiteSpace: 'pre-line' }}>
              Bridgette is a registered nurse with over 14 years of experience in metabolic health,
              nutrition, and weight optimization. Her own journey with PCOS and insulin resistance
              informs how she helps patients address root causes and build sustainable, long-term
              results—not quick fixes.
              {'\n\n'}
              At Wheatfill Precision Health, she pairs clear, individualized guidance with medical
              therapy, nutrition, and practical lifestyle strategies so you can take back control of
              your health.
            </p>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 14 }}>
              <Link to="/about#bridgette-bio" style={{ fontWeight: 600 }}>
                Full bio
              </Link>
            </p>
          </div>
        </aside>

        <section className="landingGridAccordion" aria-label="Services">
          <div className="divider" />
          <div className="cardGrid landingAccordionGrid" role="presentation">
            {ACCORDION_ITEMS.map((item) => {
              const isOpen = openId === item.id
              const headingId = `${baseId}-${item.id}-heading`
              const panelId = `${baseId}-${item.id}-panel`
              const accent = ACCENT_CLASS[item.accent]
              return (
                <article
                  key={item.id}
                  className={`card ${accent} landingAccordionCard${isOpen ? ' isOpen' : ''}`}
                  data-accordion-id={item.id}
                >
                  <div className="landingAccordionTop">
                    <div className="cardTitle">
                      <h2 id={headingId} style={{ margin: 0 }}>
                        {item.title}
                      </h2>
                      <span className={item.pillRed ? 'pill pillRed' : 'pill'}>{item.pill}</span>
                    </div>
                    <p className="muted landingAccordionSummary">{item.summary}</p>
                    <button
                      type="button"
                      className="landingAccordionToggle"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(item.id)}
                    >
                      <span>{isOpen ? 'Show less' : 'Learn more'}</span>
                      <span className="landingAccordionChevron" aria-hidden="true" />
                    </button>
                  </div>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    className="landingAccordionPanel"
                  >
                    <div className="landingAccordionPanelInner">{item.body}</div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
