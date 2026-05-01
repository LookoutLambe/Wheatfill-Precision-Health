import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import bridgettePortrait from '../assets/bridgette.png'
import brettPortrait from '../assets/brett.png'
import { apiPost } from '../api/client'
import { BrandSlogan } from '../components/BrandSlogan'
import { BookVisitCta, PatientPortalCta } from '../components/CharmMarketingCtas'
import Page from '../components/Page'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'
import {
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
    pill: 'Evidence-Based',
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
    pill: 'Long-Term',
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
  const [openId, setOpenId] = useState<AccordionId | null>(null)
  const baseId = useId()
  const faqBaseId = `${baseId}-faq`
  const consultBaseId = `${baseId}-consult`

  const [consultFirst, setConsultFirst] = useState('')
  const [consultLast, setConsultLast] = useState('')
  const [consultEmail, setConsultEmail] = useState('')
  const [consultMsg, setConsultMsg] = useState('')
  const [consultUpdates, setConsultUpdates] = useState(false)
  const [consultBusy, setConsultBusy] = useState(false)
  const [consultStatus, setConsultStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [consultError, setConsultError] = useState<string | null>(null)

  const toggle = useCallback((id: AccordionId) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <Page className="pageLanding" variant="wide">
      <div className="twoCol twoColLanding">
        <section className="landingGridTop" aria-label="Welcome and care team">
          <section className="landingGridHeroCatalog" aria-label="Welcome">
            <div className="landingHeroIntro">
              <BrandSlogan />
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

              <div className="divider" />

              <section className="card cardAccentNavy" aria-labelledby="landing-start-here-heading" style={{ marginTop: 12 }}>
                <div className="cardTitle">
                  <h2 id="landing-start-here-heading" style={{ margin: 0 }}>
                    Start here
                  </h2>
                  <span className="pill">Patient Paths</span>
                </div>
                <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                  Pick the path that matches what you need—booking, medication education, refill-style requests, or the storefront catalog.
                </p>
                <div className="divider" />
                <div className="btnRow" style={{ flexWrap: 'wrap' }}>
                  <BookVisitCta className="btn btnPrimary" style={{ textDecoration: 'none' }} mode="primary" />
                  <NavLink to="/medications" className="btn" style={{ textDecoration: 'none' }}>
                    Medication education
                  </NavLink>
                  <NavLink to="/ordering" className="btn" style={{ textDecoration: 'none' }}>
                    Order requests
                  </NavLink>
                  <NavLink to="/order-now" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
                    Order Now catalog
                  </NavLink>
                  <Link to="/contact" className="btn" style={{ textDecoration: 'none' }}>
                    Contact
                  </Link>
                </div>
              </section>
            </div>

            <div className="divider" />

            <section className="card cardAccentSoft" aria-labelledby="landing-how-it-works-heading">
              <div className="cardTitle">
                <h2 id="landing-how-it-works-heading" style={{ margin: 0 }}>
                  How it works
                </h2>
                <span className="pill">Simple Steps</span>
              </div>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                A clear path from your first request to follow-up. If you are unsure where to start, book a visit.
              </p>
              <div className="divider" />
              <ol className="landingStepsList">
                <li className="landingStep">
                  <div className="landingStepTitle">Request care</div>
                  <div className="muted landingStepBody">
                    Book online (or reach out on the contact page). We’ll confirm next steps and what to expect.
                  </div>
                </li>
                <li className="landingStep">
                  <div className="landingStepTitle">Clinical visit</div>
                  <div className="muted landingStepBody">
                    We review your history, goals, labs (if needed), and create a plan that fits your life.
                  </div>
                </li>
                <li className="landingStep">
                  <div className="landingStepTitle">Plan + options</div>
                  <div className="muted landingStepBody">
                    Nutrition, movement, medications when appropriate, and a follow-up cadence you can stick to.
                  </div>
                </li>
                <li className="landingStep">
                  <div className="landingStepTitle">Ongoing support</div>
                  <div className="muted landingStepBody">
                    Check-ins and adjustments over time—so results are safe, measurable, and sustainable.
                  </div>
                </li>
              </ol>
              <div className="divider" />
              <div className="btnRow">
                <BookVisitCta className="btn btnPrimary" style={{ textDecoration: 'none' }} mode="primary" />
                <Link to="/contact" className="btn" style={{ textDecoration: 'none' }}>
                  Ask a question
                </Link>
              </div>
            </section>

            <div className="divider" />

            <section
              className="card cardAccentSoft landingWhyUs"
              aria-labelledby="landing-why-us-heading"
              style={{ margin: 0 }}
            >
              <div className="cardTitle">
                <h2 id="landing-why-us-heading" style={{ margin: 0 }}>
                  Why {PRACTICE_PUBLIC_NAME}?
                </h2>
                <span className="pill">Why Us</span>
              </div>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                A care model built for busy adults who want real planning—not generic handouts—so you can improve
                metabolism, weight, and energy with clarity and follow-through.
              </p>
              <div className="divider" />
              <div className="landingWhyUsGrid">
                <div className="landingWhyUsItem landingWhyUsItem--stripeRed">
                  <div className="landingWhyUsItemTitle">Precision, not a template</div>
                  <p className="landingWhyUsItemText">
                    Plans are individualized to your history, risk, and goals—so recommendations match your physiology, not
                    a one-size protocol.
                  </p>
                </div>
                <div className="landingWhyUsItem landingWhyUsItem--stripeWhite">
                  <div className="landingWhyUsItemTitle">Everything in one place</div>
                  <p className="landingWhyUsItemText">
                    Book, medication education, order requests, and the storefront catalog are on this site—so you
                    are not shuffled between disconnected logins to get things done.
                  </p>
                </div>
                <div className="landingWhyUsItem landingWhyUsItem--stripeBlue">
                  <div className="landingWhyUsItemTitle">Clarity and safety</div>
                  <p className="landingWhyUsItemText">
                    We are upfront about options, monitoring, and what “success” can look like—so you can make informed
                    decisions with a team that stays in touch.
                  </p>
                </div>
                <div className="landingWhyUsItem landingWhyUsItem--stripeGray">
                  <div className="landingWhyUsItemTitle">Long-term in mind</div>
                  <p className="landingWhyUsItemText">
                    Visits, check-ins, and adjustments are built for sustainability—so changes are more likely to stick
                    when life gets busy.
                  </p>
                </div>
              </div>
              <div className="divider" />
              <div className="btnRow">
                <Link to="/about" className="btn" style={{ textDecoration: 'none' }}>
                  About the team
                </Link>
                <Link to="/pricing" className="btn catalogOutlineBtn" style={{ textDecoration: 'none' }}>
                  Pricing
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
            <p className="landingBioCardSeeProfile">
              <Link to="/about#brett-bio" className="landingSeeProfileLink">
                See Profile
              </Link>
            </p>
          </div>

          <div className="divider" />

          <div className="portrait" style={{ marginTop: 8 }}>
            <img src={bridgettePortrait} alt="Bridgette Wheatfill, RN" />
          </div>
          <div className="card cardAccentNavy landingBioCard">
            <div className="cardTitle">
              <h2 style={{ margin: 0 }}>Bridgette Wheatfill, RN</h2>
              <span className="pill">Clinician</span>
            </div>
            <p className="landingBioCardSeeProfile">
              <Link to="/about#bridgette-bio" className="landingSeeProfileLink">
                See Profile
              </Link>
            </p>
          </div>
          </aside>
        </section>

        <section className="landingGridCatalog" aria-label="Order Now catalog highlight">
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
              medication is prescribed. Checkout opens securely with your order total after you submit from the summary page.
              If something goes wrong with your order, your care team handles it from our side.
            </p>
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
              <Link to="/order-now" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
                View Full Catalog
              </Link>
            </div>
          </section>
        </section>

        <section className="landingGridAccordion" aria-label="Services">
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

          <section className="landingConsultBand" aria-labelledby={`${consultBaseId}-heading`}>
            <div className="landingConsultInner">
              <div className="landingConsultCopy">
                <h2 id={`${consultBaseId}-heading`} className="landingConsultTitle">
                  Request a Consultation
                </h2>
                <p className="muted landingConsultLead">
                  Submit the form to initiate a detailed discussion regarding objectives, timelines, and
                  customized service options.
                </p>
                <div className="landingConsultMeta">
                  <span className="pill">Secure Request</span>
                  <span className="pill pillRed">Response in 1 Business Day</span>
                </div>
              </div>

              <form
                className="landingConsultForm"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (consultBusy) return
                  setConsultError(null)
                  setConsultStatus('idle')
                  const first = consultFirst.trim()
                  const last = consultLast.trim()
                  const email = consultEmail.trim()
                  const msg = consultMsg.trim()
                  if (!first || !last || !email || !msg) {
                    setConsultError('Please fill out all required fields.')
                    setConsultStatus('error')
                    return
                  }
                  setConsultBusy(true)
                  ;(async () => {
                    try {
                      const name = `${first} ${last}`.trim()
                      const fullMessage = [
                        msg,
                        '',
                        `—`,
                        `Landing consultation request`,
                        `Updates opt-in: ${consultUpdates ? 'yes' : 'no'}`,
                      ].join('\n')
                      await apiPost('/v1/public/contact', { name, email, message: fullMessage })
                      setConsultStatus('sent')
                      setConsultFirst('')
                      setConsultLast('')
                      setConsultEmail('')
                      setConsultMsg('')
                      setConsultUpdates(false)
                    } catch (err: unknown) {
                      setConsultStatus('error')
                      setConsultError(String((err as Error)?.message || err || 'Request failed. Please try again.'))
                    } finally {
                      setConsultBusy(false)
                    }
                  })()
                }}
              >
                <div className="landingConsultFormGrid">
                  <label>
                    <div className="muted landingConsultLabel">
                      First Name <span aria-hidden="true">(required)</span>
                    </div>
                    <input
                      className="input"
                      value={consultFirst}
                      onChange={(e) => setConsultFirst(e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label>
                    <div className="muted landingConsultLabel">
                      Last Name <span aria-hidden="true">(required)</span>
                    </div>
                    <input
                      className="input"
                      value={consultLast}
                      onChange={(e) => setConsultLast(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                  <label className="landingConsultFull">
                    <div className="muted landingConsultLabel">
                      Email <span aria-hidden="true">(required)</span>
                    </div>
                    <input
                      className="input"
                      value={consultEmail}
                      onChange={(e) => setConsultEmail(e.target.value)}
                      autoComplete="email"
                      type="email"
                      required
                    />
                  </label>
                  <label className="landingConsultCheckbox landingConsultFull">
                    <input
                      type="checkbox"
                      checked={consultUpdates}
                      onChange={(e) => setConsultUpdates(e.target.checked)}
                    />
                    <span>Sign up for news and updates</span>
                  </label>
                  <label className="landingConsultFull">
                    <div className="muted landingConsultLabel">
                      Message <span aria-hidden="true">(required)</span>
                    </div>
                    <textarea
                      className="textarea"
                      value={consultMsg}
                      onChange={(e) => setConsultMsg(e.target.value)}
                      required
                    />
                  </label>
                </div>

                {consultStatus === 'sent' ? (
                  <div className="landingConsultNotice landingConsultNotice--ok" role="status">
                    Request sent. We’ll reply as soon as we can.
                  </div>
                ) : null}
                {consultStatus === 'error' && consultError ? (
                  <div className="landingConsultNotice landingConsultNotice--err" role="alert">
                    {consultError}
                  </div>
                ) : null}

                <div className="landingConsultActions">
                  <button
                    type="submit"
                    className="btn btnPrimary"
                    disabled={consultBusy}
                    style={{ opacity: consultBusy ? 0.7 : 1 }}
                  >
                    {consultBusy ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="card cardAccentSoft" aria-labelledby={`${faqBaseId}-heading`}>
            <div className="cardTitle">
              <h2 id={`${faqBaseId}-heading`} style={{ margin: 0 }}>
                <span className="preserveWidgetCase">FAQ</span>
              </h2>
              <span className="pill">Common Questions</span>
            </div>
            <div className="divider" />

            <details className="landingFaqItem">
              <summary className="landingFaqSummary">Do I need to sign in to use this website?</summary>
              <div className="landingFaqBody muted">
                No for most visitors—you can book and contact the practice without creating a login here. Some workflows (like certain catalog checkouts on the full practice app) may ask you to sign in so the team can attach your order details securely. If you ever receive a separate portal link, the team will provide it directly.
              </div>
            </details>

            <details className="landingFaqItem">
              <summary className="landingFaqSummary">How soon will I hear back after I submit a request?</summary>
              <div className="landingFaqBody muted">
                Typically within 1 business day. If your message is time-sensitive, include the best way to reach you and your preferred times.
              </div>
            </details>

            <details className="landingFaqItem">
              <summary className="landingFaqSummary">
                Can you prescribe <span className="preserveWidgetCase">GLP-1</span> medications?
              </summary>
              <div className="landingFaqBody muted">
                We discuss evidence-based medication options when clinically appropriate. Prescribing depends on your history, risk factors, and applicable state rules.
              </div>
            </details>

            <details className="landingFaqItem">
              <summary className="landingFaqSummary">What do medications cost?</summary>
              <div className="landingFaqBody muted">
                Costs can vary by dose and supplier. Our <Link to="/order-now">catalog</Link> shows representative pricing for common vials, and your care team confirms details before you pay.
              </div>
            </details>

            <details className="landingFaqItem">
              <summary className="landingFaqSummary">What if I need to reschedule?</summary>
              <div className="landingFaqBody muted">
                Use the contact form or reply to the confirmation you receive and we’ll help you find a new time.
              </div>
            </details>
          </section>
        </section>
      </div>
    </Page>
  )
}
